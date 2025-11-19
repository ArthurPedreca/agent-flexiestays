import type { FlexiMessage, ArtifactUIPart } from '../../shared/types/chat'
import { bbcodeToMarkdown, extractArtifacts } from '../../shared/utils'

export type ChatStatus = 'ready' | 'streaming'

interface MutableTextPart {
  type: 'text'
  text: string
  state?: 'streaming' | 'done'
}

interface UseN8nChatOptions {
  chatId: string
  initialMessages?: FlexiMessage[]
}

export function useN8nChat(options: UseN8nChatOptions) {
  const { chatId, initialMessages } = options

  const messages = ref<FlexiMessage[]>(initialMessages && initialMessages.length > 0
    ? [...initialMessages]
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

  const streamMessage = async (options: {
    text: string
    persistUserMessage: boolean
    existingUserMessage?: FlexiMessage
  }) => {
    const normalizedText = options.text.trim()
    if (!normalizedText || status.value !== 'ready') {
      return
    }

    error.value = null

    const userMessage = options.existingUserMessage ?? createUserMessage(normalizedText)
    if (!options.existingUserMessage) {
      messages.value = [...messages.value, userMessage]
    }

    // Create assistant message placeholder
    const assistantMessage = createAssistantMessage()
    messages.value = [...messages.value, assistantMessage]
    const textPart = findTextPart(assistantMessage)
    textPart.state = 'streaming'

    status.value = 'streaming'
    abortController.value = new AbortController()

    try {
      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: normalizedText,
          persistUserMessage: options.persistUserMessage
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

      await refreshNuxtData('chats')
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

  const sendMessage = async (rawText: string) => {
    await streamMessage({
      text: rawText,
      persistUserMessage: true
    })
  }

  const shouldBootstrapPending = Boolean(
    initialMessages &&
    initialMessages.length > 0 &&
    initialMessages[initialMessages.length - 1]?.role === 'user'
  )

  if (import.meta.client && shouldBootstrapPending) {
    setTimeout(() => {
      const pendingMessage = findPendingUserMessage(messages.value)
      if (!pendingMessage) {
        return
      }

      const pendingText = getTextFromParts(pendingMessage.parts).trim()
      if (!pendingText) {
        return
      }

      streamMessage({
        text: pendingText,
        persistUserMessage: false,
        existingUserMessage: pendingMessage
      })
    }, 0)
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

function findPendingUserMessage(items: FlexiMessage[]): FlexiMessage | null {
  if (!items.length) {
    return null
  }

  const last = items[items.length - 1]
  return last?.role === 'user' ? last : null
}

function getTextFromParts(parts: FlexiMessage['parts']): string {
  if (!Array.isArray(parts)) {
    return ''
  }

  return parts
    .map((part) => {
      if (part && typeof part === 'object' && 'text' in part) {
        const value = (part as Record<string, unknown>).text
        return typeof value === 'string' ? value : ''
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
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


