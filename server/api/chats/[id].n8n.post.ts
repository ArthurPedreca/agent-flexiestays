import { z } from 'zod'
import type { UIMessage } from 'ai'
import { createUIMessageStreamResponse, createUIMessageStream } from 'ai'

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
  const n8nWebhookUrl = config.public.n8nWebhookUrl
  const n8nWebhookToken = config.n8nWebhookToken

  if (!n8nWebhookUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'n8n webhook URL not configured. Please set NUXT_PUBLIC_N8N_WEBHOOK_URL environment variable.'
    })
  }

  try {
    // Prepare messages for n8n
    const lastUserMessage = messages[messages.length - 1]
    const userMessageText = lastUserMessage.parts
      .filter(p => p.type === 'text')
      .map(p => 'text' in p ? p.text : '')
      .join('')

    // Call n8n webhook
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(n8nWebhookToken ? { Authorization: `Bearer ${n8nWebhookToken}` } : {})
      },
      body: JSON.stringify({
        query: {
          message: userMessageText,
          sessionId: session.user?.id || session.id,
          chatId: id
        },
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

    // Parse n8n response (array of chunks)
    const n8nChunks = await response.json()

    // Create UI message stream
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Process each chunk from n8n
        for (const chunk of n8nChunks) {
          // Add delay if specified
          if (chunk.delay && chunk.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, chunk.delay * 1000))
          }

          // Handle different chunk types
          if (chunk.type === 'carousel') {
            // Write carousel as custom tool invocation
            writer.write({
              type: 'tool-carousel',
              state: 'result',
              properties: chunk.properties,
              result: { properties: chunk.properties }
            })
          } else if (chunk.type === 'text' && chunk.clickable_properties) {
            // Write clickable properties
            writer.write({
              type: 'tool-clickable-properties',
              state: 'result',
              text: chunk.text,
              clickable_properties: chunk.clickable_properties,
              result: {
                text: chunk.text,
                clickable_properties: chunk.clickable_properties
              }
            })
          } else if (chunk.type === 'text') {
            // Stream text word by word for smooth effect
            const words = chunk.text.split(' ')
            for (let i = 0; i < words.length; i++) {
              const word = words[i] + (i < words.length - 1 ? ' ' : '')
              writer.write({
                type: 'text',
                text: word
              })
              // Small delay between words for streaming effect
              await new Promise(resolve => setTimeout(resolve, 30))
            }
          }
        }
      },
      onFinish: async ({ messages: streamMessages }) => {
        // Save assistant message to database
        await db.insert(tables.messages).values(streamMessages.map(message => ({
          chatId: chat.id,
          role: message.role as 'user' | 'assistant',
          parts: message.parts
        })))
      }
    })

    return createUIMessageStreamResponse({
      stream
    })
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
