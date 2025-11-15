import { z } from 'zod'
import type { UIMessage } from 'ai'
import { parseRichContent } from '../../../shared/utils'

defineRouteMeta({
  openAPI: {
    description: 'Chat with n8n AI Agent (streaming)',
    tags: ['ai', 'n8n']
  }
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const config = useRuntimeConfig()

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string()
  }).parse)

  const { model, messages } = await readValidatedBody(event, z.object({
    model: z.string(),
    messages: z.array(z.custom<UIMessage>())
  }).parse)

  const db = useDrizzle()

  // Verify chat exists and user has access
  const chat = await db.query.chats.findFirst({
    where: (chat, { eq, and }) => and(
      eq(chat.id, id),
      eq(chat.userId, session.user?.id || session.id)
    ),
    with: { messages: true }
  })

  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
  }

  // Generate title if needed
  if (!chat.title) {
    const { generateText } = await import('ai')
    const { openai } = await import('@ai-sdk/openai')

    const { text: title } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a title generator for a chat:
          - Generate a short title based on the first user's message
          - The title should be less than 30 characters long
          - The title should be a summary of the user's message
          - Do not use quotes (' or ") or colons (:) or any other punctuation
          - Do not use markdown, just plain text`,
      prompt: JSON.stringify(messages[0])
    })

    await db.update(tables.chats).set({ title }).where(eq(tables.chats.id, id))
  }

  // Save user message to database
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === 'user' && messages.length > 1) {
    await db.insert(tables.messages).values({
      chatId: id,
      role: 'user',
      parts: lastMessage.parts
    })
  }

  // Get n8n webhook URL from config
  const n8nWebhookUrl = config.n8nWebhookUrl || config.public.n8nWebhookUrl
  const n8nWebhookToken = config.n8nWebhookToken

  if (!n8nWebhookUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'n8n webhook URL not configured. Please set NUXT_PUBLIC_N8N_WEBHOOK_URL environment variable.'
    })
  }

  try {
    // Prepare messages for n8n (convert UIMessage format to simple chat format)
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.parts
        .filter(p => p.type === 'text')
        .map(p => 'text' in p ? p.text : '')
        .join('')
    }))

    // Call n8n webhook with streaming
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(n8nWebhookToken ? { Authorization: `Bearer ${n8nWebhookToken}` } : {})
      },
      body: JSON.stringify({
        chatId: id,
        model,
        messages: formattedMessages,
        userId: session.user?.id || session.id,
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

    // Set up streaming response headers
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'X-Content-Type-Options', 'nosniff')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw createError({ statusCode: 500, statusMessage: 'No response body from n8n' })
    }

    // Store assistant message text for database
    let assistantText = ''
    let buffer = ''

    // Create a readable stream to return
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // Process any remaining buffer
              if (buffer.trim()) {
                assistantText += buffer
                controller.enqueue(new TextEncoder().encode(buffer))
              }
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // Forward chunk to client
            controller.enqueue(value)

            // Collect text for database storage (simple approach: just accumulate all text)
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

    // If it's a fetch error, provide more context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const hasCause = error instanceof Error && 'cause' in error

    if (hasCause) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to connect to n8n: ${errorMessage}`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: errorMessage || 'Failed to communicate with n8n agent'
    })
  }
})
