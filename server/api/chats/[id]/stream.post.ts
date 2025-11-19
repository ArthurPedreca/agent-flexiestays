import { z } from 'zod'
import { parseRichContent } from '../../../../shared/utils'
import { useDrizzle, tables, eq, and } from '../../../database/drizzle'

defineRouteMeta({
  openAPI: {
    description: 'Proxy chat requests to n8n (streaming)',
    tags: ['ai', 'n8n']
  }
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const config = useRuntimeConfig()
  const db = useDrizzle()

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().min(1).max(36)
  }).parse)

  const { message } = await readValidatedBody(event, z.object({
    message: z.string().trim().min(1)
  }).parse)

  const userId = session.user?.id || session.id
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not authenticated'
    })
  }

  const chat = await db.query.chats.findFirst({
    where: (chat, { eq, and }) => and(
      eq(chat.id, id),
      eq(chat.userId, userId)
    ),
    with: {
      messages: {
        orderBy: (message, { asc }) => asc(message.createdAt)
      }
    }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    })
  }

  // Persist the user message before calling n8n
  const userParts = [{ type: 'text', text: message }]
  await db.insert(tables.messages).values({
    chatId: id,
    role: 'user',
    parts: userParts
  })

  const firstUserMessage = chat.messages.find(msg => msg.role === 'user')
  const titleSource = firstUserMessage
    ? flattenMessageParts(firstUserMessage.parts)
    : message

  if (!chat.title) {
    await maybeUpdateChatTitle({
      db,
      chatId: id,
      titleWebhook: config.n8nTitleWebhookUrl || config.public.n8nTitleWebhookUrl,
      fallbackSource: titleSource || message
    })
  }

  const n8nWebhookUrl = config.n8nWebhookUrl || config.public.n8nWebhookUrl
  const n8nWebhookToken = config.n8nWebhookToken

  if (!n8nWebhookUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'n8n webhook URL not configured. Set NUXT_PUBLIC_N8N_WEBHOOK_URL.'
    })
  }

  const history = [
    ...chat.messages.map(message => ({
      role: message.role,
      content: flattenMessageParts(message.parts)
    })),
    {
      role: 'user',
      content: message
    }
  ]

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(n8nWebhookToken ? { Authorization: `Bearer ${n8nWebhookToken}` } : {})
      },
      body: JSON.stringify({
        chatId: id,
        message,
        history,
        userId,
        username: session.user?.username || 'User'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('n8n webhook error:', response.status, errorText)
      throw createError({
        statusCode: response.status,
        statusMessage: `n8n webhook failed: ${response.statusText}`
      })
    }

    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'X-Content-Type-Options', 'nosniff')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No response body from n8n'
      })
    }

    let assistantText = ''
    let buffer = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              if (buffer.trim()) {
                assistantText += buffer
                controller.enqueue(new TextEncoder().encode(buffer))
              }
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            controller.enqueue(value)
            assistantText += chunk
          }

          const parsed = parseRichContent(assistantText.trim())
          const assistantParts: Array<Record<string, unknown>> = []

          if (parsed.markdown) {
            assistantParts.push({
              type: 'text',
              text: parsed.markdown
            })
          }

          if (parsed.artifacts.length) {
            assistantParts.push(...parsed.artifacts)
          }

          if (assistantParts.length) {
            await db.insert(tables.messages).values({
              chatId: id,
              role: 'assistant',
              parts: assistantParts
            })
          }

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
      cancel() {
        reader.cancel()
      }
    })

    return sendStream(event, stream)
  } catch (error) {
    console.error('n8n integration error:', error)

    const messageText = error instanceof Error ? error.message : 'Unknown error'

    throw createError({
      statusCode: 500,
      statusMessage: messageText || 'Failed to communicate with n8n agent'
    })
  }
})

async function maybeUpdateChatTitle(options: {
  db: ReturnType<typeof useDrizzle>
  chatId: string
  titleWebhook?: string
  fallbackSource: string
}) {
  const fallbackTitle = buildTitleFromMessage(options.fallbackSource)
  let resolvedTitle = fallbackTitle

  if (options.titleWebhook) {
    try {
      const response = await fetch(options.titleWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: options.chatId,
          message: options.fallbackSource
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (typeof data === 'string') {
          resolvedTitle = data
        } else if (typeof data?.title === 'string') {
          resolvedTitle = data.title
        } else if (typeof data?.output === 'string') {
          resolvedTitle = data.output
        }
      }
    } catch (error) {
      console.warn('Failed to generate title via n8n, using fallback.', error)
    }
  }

  await options.db
    .update(tables.chats)
    .set({ title: resolvedTitle })
    .where(eq(tables.chats.id, options.chatId))
}

function buildTitleFromMessage(message: string) {
  const normalized = message.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return 'Nova conversa'
  }

  const slice = normalized.slice(0, 60)
  return normalized.length > 60 ? `${slice}...` : slice
}

function flattenMessageParts(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return ''
  }

  return parts
    .map((part) => {
      if (part && typeof part === 'object' && 'text' in (part as Record<string, unknown>)) {
        const value = (part as Record<string, unknown>).text
        return typeof value === 'string' ? value : ''
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}
