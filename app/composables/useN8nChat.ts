import type { FlexiMessage, ArtifactUIPart } from '../../shared/types/chat'
import { bbcodeToMarkdown, extractArtifacts } from '../../shared/utils'

export type ChatStatus = 'ready' | 'streaming'

interface MutableTextPart {
  type: 'text'
  text: string
  state?: 'streaming' | 'done'
}

interface UseN8nChatOptions {
  webhookUrl: string
  chatId?: string
  initialMessages?: FlexiMessage[]
}

export function useN8nChat(options: UseN8nChatOptions) {
  // Use provided chatId or generate unique chat ID for this session
  const chatId = options.chatId || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Initialize with provided messages or welcome message
  const messages = ref<FlexiMessage[]>(options.initialMessages && options.initialMessages.length > 0
    ? [...options.initialMessages]
    : [
      {
        id: generateMessageId(),
        role: 'assistant',
        parts: [{
          type: 'text',
          text: 'Olá! Como posso ajudar você hoje?'
        }]
      }
    ])

  const status = ref<ChatStatus>('ready')
  const error = ref<Error | null>(null)
  const abortController = ref<AbortController | null>(null)

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || status.value !== 'ready') {
      return
    }

    error.value = null

    // Add user message
    const userMessage = createUserMessage(text)
    messages.value = [...messages.value, userMessage]

    // Save user message to database (will create chat if doesn't exist)
    await ensureChatExists(chatId)
    await persistMessage(chatId, 'user', userMessage.parts)

    // Create assistant message placeholder
    const assistantMessage = createAssistantMessage()
    messages.value = [...messages.value, assistantMessage]
    const textPart = findTextPart(assistantMessage)
    textPart.state = 'streaming'

    status.value = 'streaming'
    abortController.value = new AbortController()

    try {
      const response = await fetch(options.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId,
          message: text
        }),
        signal: abortController.value.signal
      })

      if (!response.ok || !response.body) {
        const errorText = await safeReadBody(response)
        throw new Error(errorText || `Erro: ${response.status} ${response.statusText}`)
      }

      // Process streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let rawBuffer = ''
      const seenArtifacts = new Set<string>()
      let isFirstContent = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode chunk
        buffer += decoder.decode(value, { stream: true })

        // Process lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const parsed = JSON.parse(line)

            if (parsed.type === 'item' && parsed.content) {
              const content = parsed.content.trim()

              // Skip BBCode opening tags and empty content
              if (content === '[' || content === 'bbcode' || content === ']' ||
                content === '[bbcode]' || content === 'bbcode]' ||
                content === '/bbcode' || content === '[/bbcode]' || !content) {
                continue
              }

              // Only mark as not first content when we actually add real content
              if (isFirstContent && content) {
                isFirstContent = false
              }

              rawBuffer += parsed.content

              // Update content and FORCE Vue reactivity
              const { cleanedText, artifacts } = extractArtifacts(rawBuffer)
              textPart.text = bbcodeToMarkdown(cleanedText)

              // Handle new artifacts
              artifacts.forEach((artifact: ArtifactUIPart) => {
                if (!seenArtifacts.has(artifact.id)) {
                  seenArtifacts.add(artifact.id)
                  assistantMessage.parts.push({ ...artifact })
                }
              })

              // CRITICAL: Force Vue reactivity by creating new array reference
              messages.value = [...messages.value]
            }
          } catch (e) {
            console.error('Erro ao processar linha:', line, e)
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer)
          if (parsed.type === 'item' && parsed.content) {
            if (!isFirstContent || (parsed.content.trim() !== '[' && parsed.content.trim() !== 'bbcode' && parsed.content.trim() !== ']')) {
              rawBuffer += parsed.content

              const { cleanedText, artifacts } = extractArtifacts(rawBuffer)
              textPart.text = bbcodeToMarkdown(cleanedText)

              artifacts.forEach((artifact: ArtifactUIPart) => {
                if (!seenArtifacts.has(artifact.id)) {
                  seenArtifacts.add(artifact.id)
                  assistantMessage.parts.push({ ...artifact })
                }
              })

              messages.value = [...messages.value]
            }
          }
        } catch (e) {
          console.error('Erro ao processar buffer final:', e)
        }
      }

      // If no message received
      if (!rawBuffer) {
        textPart.text = 'Desculpe, não recebi uma resposta válida.'
        messages.value = [...messages.value]
      }

      textPart.state = 'done'
      status.value = 'ready'

      // Save assistant message to database
      await persistMessage(chatId, 'assistant', assistantMessage.parts)
      await refreshNuxtData('chats')

      // Generate title if this is the first user message (second message overall, after welcome)
      if (messages.value.length === 3) {
        await generateChatTitle(chatId, text)
      }
    } catch (err) {
      if (isAbortError(err)) {
        textPart.state = 'done'
        status.value = 'ready'
        return
      }

      error.value = err instanceof Error ? err : new Error('Erro ao enviar mensagem.')
      textPart.text = error.value.message
      textPart.state = 'done'
      status.value = 'ready'
    } finally {
      abortController.value = null
    }
  }

  const stop = () => {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }

    // Mark last assistant message as done
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const message = messages.value[i]
      if (message && message.role === 'assistant') {
        const textPart = findTextPart(message)
        textPart.state = 'done'
        break
      }
    }

    status.value = 'ready'
  }

  return {
    messages,
    status,
    error,
    sendMessage,
    stop
  }
}

function createUserMessage(text: string): FlexiMessage {
  return {
    id: generateMessageId(),
    role: 'user',
    parts: [{
      type: 'text',
      text
    }]
  }
}

function createAssistantMessage(): FlexiMessage {
  return {
    id: generateMessageId(),
    role: 'assistant',
    parts: [{
      type: 'text',
      text: '',
      state: 'streaming'
    }]
  }
}

function findTextPart(message: FlexiMessage): MutableTextPart {
  const part = message.parts.find((part: FlexiMessage['parts'][number]) => part.type === 'text')
  if (part && 'text' in part) {
    return part as MutableTextPart
  }

  const fallback: MutableTextPart = { type: 'text', text: '', state: 'streaming' }
  message.parts.unshift(fallback)
  return fallback
}

function generateMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `msg_${Math.random().toString(36).slice(2, 10)}`
}

function isAbortError(error: unknown) {
  const isDomAbort = typeof DOMException !== 'undefined'
    && error instanceof DOMException
    && error.name === 'AbortError'

  const isGenericAbort = error instanceof Error && error.name === 'AbortError'

  return isDomAbort || isGenericAbort
}

async function safeReadBody(response: Response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function ensureChatExists(chatId: string) {
  try {
    // Create chat if it doesn't exist (idempotent operation)
    await $fetch('/api/chats', {
      method: 'POST',
      body: {
        id: chatId,
        input: ''
      }
    })
  } catch (error: unknown) {
    // Ignore errors (chat might already exist)
    const err = error as { data?: { message?: string }, statusCode?: number }
    if (!err?.data?.message?.includes('duplicate') && !err?.statusCode?.toString().startsWith('4')) {
      console.error('Error ensuring chat exists:', error)
    }
  }
}

async function persistMessage(
  chatId: string,
  role: 'user' | 'assistant',
  parts: FlexiMessage['parts']
) {
  try {
    await $fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: {
        role,
        parts
      }
    })
  } catch (persistError) {
    console.error('Falha ao salvar mensagem do agente', persistError)
  }
}

async function generateChatTitle(chatId: string, firstMessage: string) {
  try {
    // Use first 50 chars of the message as title
    const title = firstMessage.length > 50
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage

    await $fetch(`/api/chats/${chatId}/title`, {
      method: 'POST',
      body: { title }
    })

    await refreshNuxtData('chats')
  } catch (error) {
    console.error('Failed to generate chat title:', error)
  }
}
