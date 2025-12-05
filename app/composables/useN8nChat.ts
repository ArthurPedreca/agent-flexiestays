import type { FlexiMessage, ArtifactUIPart } from '../../shared/types/chat'
import { extractArtifacts } from '../../shared/utils'

export type ChatStatus = 'ready' | 'streaming' | 'submitting'

interface MutableTextPart {
  type: 'text'
  text: string
  state?: 'waiting' | 'streaming' | 'done'
}

interface UseN8nChatOptions {
  chatId: string
  initialMessages?: FlexiMessage[]
}

export function useN8nChat(options: UseN8nChatOptions) {
  const { chatId, initialMessages } = options

  const messages = ref<FlexiMessage[]>(
    initialMessages?.length
      ? [...initialMessages]
      : [{
        id: generateMessageId(),
        role: 'assistant',
        parts: [{
          type: 'text',
          text: 'Hello! I\'m your Flexiestays assistant. How can I help you find your perfect accommodation today?'
        }]
      }]
  )

  const status = ref<ChatStatus>('ready')
  const error = ref<Error | null>(null)
  const abortController = ref<AbortController | null>(null)

  const streamMessage = async (options: {
    text: string
    persistUserMessage: boolean
    existingUserMessage?: FlexiMessage
  }) => {
    const normalizedText = options.text.trim()
    if (!normalizedText || status.value !== 'ready') return

    error.value = null

    // Add user message
    const userMessage = options.existingUserMessage ?? createUserMessage(normalizedText)
    if (!options.existingUserMessage) {
      messages.value = [...messages.value, userMessage]
    }

    // Create assistant placeholder
    const assistantMessage = createAssistantMessage()
    messages.value = [...messages.value, assistantMessage]
    const textPart = findTextPart(assistantMessage)

    status.value = 'streaming'
    abortController.value = new AbortController()

    try {
      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: normalizedText,
          persistUserMessage: options.persistUserMessage
        }),
        signal: abortController.value.signal
      })

      if (!response.ok || !response.body) {
        const errorText = await safeReadBody(response)
        throw new Error(errorText || `Error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let rawContent = ''
      const seenArtifacts = new Set<string>()
      let hasReceivedContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const parsed = JSON.parse(line)

            if (parsed.type === 'item' && parsed.content) {
              const content = parsed.content

              // Skip artifact tag tokens during streaming
              if (isArtifactToken(content)) continue

              if (!hasReceivedContent) {
                hasReceivedContent = true
                textPart.state = 'streaming'
              }

              rawContent += content

              // Extract artifacts and update text
              const { cleanedText, artifacts } = extractArtifacts(rawContent)
              textPart.text = cleanedText

              // Add new artifacts
              for (const artifact of artifacts) {
                if (!seenArtifacts.has(artifact.id)) {
                  seenArtifacts.add(artifact.id)
                  assistantMessage.parts.push({ ...artifact })
                }
              }

              // Force reactivity
              messages.value = [...messages.value]
            }
          } catch {
            // Ignore malformed JSON
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer)
          if (parsed.type === 'item' && parsed.content && !isArtifactToken(parsed.content)) {
            rawContent += parsed.content
            const { cleanedText, artifacts } = extractArtifacts(rawContent)
            textPart.text = cleanedText

            for (const artifact of artifacts) {
              if (!seenArtifacts.has(artifact.id)) {
                seenArtifacts.add(artifact.id)
                assistantMessage.parts.push({ ...artifact })
              }
            }
            messages.value = [...messages.value]
          }
        } catch {
          // Ignore
        }
      }

      // Fallback if no content received
      if (!rawContent) {
        textPart.text = 'Sorry, I couldn\'t process that request. Please try again.'
      }

      textPart.state = 'done'
      status.value = 'ready'

      await refreshNuxtData('chats')
    } catch (err) {
      if (isAbortError(err)) {
        textPart.state = 'done'
        status.value = 'ready'
        return
      }

      error.value = err instanceof Error ? err : new Error('Failed to send message.')
      textPart.text = error.value.message
      textPart.state = 'done'
      status.value = 'ready'
    } finally {
      abortController.value = null
    }
  }

  const sendMessage = async (rawText: string) => {
    await streamMessage({
      text: rawText,
      persistUserMessage: true
    })
  }

  // Bootstrap pending messages
  const shouldBootstrapPending = Boolean(
    initialMessages?.length &&
    initialMessages[initialMessages.length - 1]?.role === 'user'
  )

  if (import.meta.client && shouldBootstrapPending) {
    setTimeout(() => {
      const pendingMessage = findPendingUserMessage(messages.value)
      if (!pendingMessage) return

      const pendingText = getTextFromParts(pendingMessage.parts).trim()
      if (!pendingText) return

      streamMessage({
        text: pendingText,
        persistUserMessage: false,
        existingUserMessage: pendingMessage
      })
    }, 0)
  }

  const stop = () => {
    abortController.value?.abort()
    abortController.value = null

    // Mark last assistant message as done
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const message = messages.value[i]
      if (message?.role === 'assistant') {
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

// Helper functions
function createUserMessage(text: string): FlexiMessage {
  return {
    id: generateMessageId(),
    role: 'user',
    parts: [{ type: 'text', text }]
  }
}

function createAssistantMessage(): FlexiMessage {
  return {
    id: generateMessageId(),
    role: 'assistant',
    parts: [{ type: 'text', text: '', state: 'waiting' }]
  }
}

function findTextPart(message: FlexiMessage): MutableTextPart {
  const part = message.parts.find(p => p.type === 'text')
  if (part && 'text' in part) {
    return part as MutableTextPart
  }

  const fallback: MutableTextPart = { type: 'text', text: '', state: 'waiting' }
  message.parts.unshift(fallback)
  return fallback
}

function findPendingUserMessage(items: FlexiMessage[]): FlexiMessage | null {
  if (!items.length) return null
  const last = items[items.length - 1]
  return last?.role === 'user' ? last : null
}

function getTextFromParts(parts: FlexiMessage['parts']): string {
  if (!Array.isArray(parts)) return ''

  return parts
    .filter((part): part is { type: 'text'; text: string } =>
      part?.type === 'text' && 'text' in part
    )
    .map(part => part.text)
    .filter(Boolean)
    .join('\n')
}

function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `msg_${Math.random().toString(36).slice(2, 10)}`
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

// Skip streaming artifact tag tokens
const ARTIFACT_TOKENS = new Set([
  '[', ']', 'artifact', '[artifact', 'artifact]',
  '/artifact', '[/artifact', '/artifact]', '[/artifact]'
])

function isArtifactToken(content: string): boolean {
  const trimmed = content.trim()
  return ARTIFACT_TOKENS.has(trimmed) || trimmed.startsWith('[artifact ')
}