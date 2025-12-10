import type { FlexiMessage, FlexiMessagePart } from '../../shared/types/chat'

export type ChatStatus = 'ready' | 'streaming' | 'submitting'

// Tool invocation types
interface ToolInvocationPart {
  type: string // 'tool-carousel' | 'tool-property-card' | 'tool-image-display'
  state: 'input-available' | 'input-streaming' | 'output-available' | 'output-error'
  output?: Record<string, unknown>
  toolCallId: string
}

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

  // Get recaptcha composable
  const { execute: executeRecaptcha } = useRecaptcha()

  const messages = ref<FlexiMessage[]>(
    initialMessages?.length
      ? normalizeInitialMessages([...initialMessages])
      : [{
        id: generateMessageId(),
        role: 'assistant',
        parts: [{
          type: 'text',
          text: 'Hello! I\'m your Flexiestays assistant. How can I help you find your perfect accommodation today?',
          state: 'done'
        }]
      }]
  )

  const status = ref<ChatStatus>('ready')
  const error = ref<Error | null>(null)
  const abortController = ref<AbortController | null>(null)

  // Check if there's a pending user message that needs to be sent to n8n
  // This happens when creating a new chat - the user message is saved to DB
  // but hasn't been sent to n8n yet
  const checkPendingUserMessage = () => {
    if (!initialMessages?.length) return null

    const lastMessage = initialMessages[initialMessages.length - 1]
    if (!lastMessage || lastMessage.role !== 'user') return null

    // Only consider it pending if this is a fresh chat with just one user message
    // This prevents re-sending on page reload after streaming has started
    const userMessages = initialMessages.filter(m => m.role === 'user')
    const assistantMessages = initialMessages.filter(m => m.role === 'assistant')

    // If there's any assistant message, the first user message was already processed
    if (assistantMessages.length > 0) return null

    // Only auto-send if there's exactly one user message with no assistant response
    if (userMessages.length !== 1) return null

    // Get the text from the user message
    const textPart = lastMessage.parts?.find(p => p.type === 'text' && 'text' in p)
    if (!textPart || !('text' in textPart)) return null

    return {
      message: lastMessage,
      text: textPart.text as string
    }
  }

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
      // Get reCAPTCHA token
      let recaptchaToken: string | null = null
      try {
        recaptchaToken = await executeRecaptcha('chat_message')
      } catch (recaptchaError) {
        console.warn('Failed to get reCAPTCHA token:', recaptchaError)
      }

      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: normalizedText,
          persistUserMessage: options.persistUserMessage,
          recaptchaToken
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
      const seenTools = new Set<string>()
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

              if (!hasReceivedContent) {
                hasReceivedContent = true
                textPart.state = 'streaming'
              }

              rawContent += content

              // Clean router JSON and extract tools from content
              const cleanedContent = cleanRouterJson(rawContent)
              const { text: cleanedText, tools, isToolStreaming } = extractToolCalls(cleanedContent)
              textPart.text = cleanedText

              // If a tool is being streamed, show loading state
              if (isToolStreaming) {
                textPart.state = 'waiting'
              } else {
                textPart.state = 'streaming'
              }

              // Add new tool invocations
              for (const tool of tools) {
                if (!seenTools.has(tool.toolCallId)) {
                  seenTools.add(tool.toolCallId)
                  assistantMessage.parts.push(tool)
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
          if (parsed.type === 'item' && parsed.content) {
            rawContent += parsed.content
            const cleanedContent = cleanRouterJson(rawContent)
            const { text: cleanedText, tools } = extractToolCalls(cleanedContent)
            textPart.text = cleanedText

            for (const tool of tools) {
              if (!seenTools.has(tool.toolCallId)) {
                seenTools.add(tool.toolCallId)
                assistantMessage.parts.push(tool)
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

  // Bootstrap: send pending user message to n8n
  // This happens when creating a new chat - the user message is saved to DB
  // but hasn't been sent to n8n yet
  const pendingUserMessage = checkPendingUserMessage()
  if (pendingUserMessage) {
    // Use nextTick to ensure the component is mounted before streaming
    nextTick(() => {
      streamMessage({
        text: pendingUserMessage.text,
        persistUserMessage: false, // Already persisted in DB
        existingUserMessage: pendingUserMessage.message
      })
    })
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

// Tool name mapping
const TOOL_TYPE_MAP: Record<string, string> = {
  carousel: 'tool-carousel',
  'property-card': 'tool-property-card',
  'image-display': 'tool-image-display',
  propertyCard: 'tool-property-card',
  imageDisplay: 'tool-image-display'
}

// Regex to match tool calls: [tool:toolName]{...json...}[/tool]
const TOOL_REGEX = /\[tool:(\w+(?:-\w+)*)\]([\s\S]*?)\[\/tool\]/gi

function generateToolId(toolName: string, data: string): string {
  let hash = 0
  const input = `${toolName}:${data}`
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return `tool-${Math.abs(hash).toString(36)}`
}

interface ExtractedTool {
  type: `tool-${string}`
  state: 'output-available'
  output: Record<string, unknown>
  input: Record<string, unknown>
  toolCallId: string
}

interface ExtractToolsResult {
  text: string
  tools: ExtractedTool[]
  isToolStreaming: boolean
}

// Regex to detect partial/incomplete tool tags
const PARTIAL_TOOL_REGEX = /\[tool:[\w-]*(?:\][\s\S]*)?$/

/**
 * Extracts tool calls from content.
 * Format: [tool:carousel]{"title": "...", "items": [...]}[/tool]
 */
function extractToolCalls(content: string): ExtractToolsResult {
  if (!content) {
    return { text: '', tools: [], isToolStreaming: false }
  }

  const tools: ExtractedTool[] = []

  // First, extract complete tools
  let cleanedText = content.replace(TOOL_REGEX, (_, toolName: string, payload: string) => {
    const normalizedName = toolName.toLowerCase()
    const type = (TOOL_TYPE_MAP[normalizedName] || `tool-${normalizedName}`) as `tool-${string}`

    let data: Record<string, unknown> = {}
    const payloadTrimmed = payload?.trim() ?? ''

    if (payloadTrimmed) {
      try {
        const parsed = JSON.parse(payloadTrimmed)
        data = typeof parsed === 'object' && parsed !== null
          ? parsed as Record<string, unknown>
          : { value: parsed }
      } catch {
        // If JSON parse fails, try to extract partial data
        data = { raw: payloadTrimmed }
      }
    }

    tools.push({
      type,
      state: 'output-available',
      output: data,
      input: data,
      toolCallId: generateToolId(toolName, payloadTrimmed)
    })

    return '' // Remove the tool tag from text
  })

  // Check if there's a partial/incomplete tool being streamed
  const partialMatch = cleanedText.match(PARTIAL_TOOL_REGEX)
  const isToolStreaming = partialMatch !== null

  // If there's a partial tool, remove it from the displayed text
  if (isToolStreaming) {
    cleanedText = cleanedText.replace(PARTIAL_TOOL_REGEX, '')
  }

  return {
    text: cleanedText.trim(),
    tools,
    isToolStreaming
  }
}

/**
 * Cleans router JSON from content, extracting only the response field.
 * Router format: {"route": "general", "response": "actual message"}
 * Also handles: {"route": "propriedades", "response": ""}Content from specialist agent
 */
function cleanRouterJson(content: string): string {
  const trimmed = content.trim()

  // Quick check - if it doesn't start with { or doesn't have "route", return as-is
  if (!trimmed.startsWith('{') || !trimmed.includes('"route"')) {
    return content
  }

  // Pattern to match complete router JSON (with possibly empty response)
  // Matches: {"route": "...", "response": "..."}
  const routerJsonPattern = /^\s*\{\s*"route"\s*:\s*"[^"]*"\s*,\s*"response"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\}/

  const match = trimmed.match(routerJsonPattern)
  if (match && match[1] !== undefined) {
    // Extract the response content (may be empty)
    const responseContent = match[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')

    // Get anything after the JSON (content from specialist agent)
    const afterJson = trimmed.slice(match[0].length)

    // Combine response content with anything after (if response was empty, just return what's after)
    const result = responseContent + afterJson
    return result.trim() ? result : ''
  }

  // Check if we're still building the JSON (partial)
  const responseMarker = '"response":'
  const responseIdx = trimmed.indexOf(responseMarker)

  if (responseIdx === -1) {
    // Still building the route part, hide everything
    return ''
  }

  // Find the closing brace to see if JSON is complete
  const lastBrace = trimmed.lastIndexOf('}')
  const lastQuote = trimmed.lastIndexOf('"')

  // If JSON looks complete but regex didn't match, try JSON.parse
  if (lastBrace > responseIdx && lastBrace > lastQuote) {
    try {
      // Find the end of the JSON object
      const jsonEnd = lastBrace + 1
      const jsonPart = trimmed.slice(0, jsonEnd)
      const parsed = JSON.parse(jsonPart)

      if (parsed && typeof parsed.route === 'string') {
        const response = typeof parsed.response === 'string' ? parsed.response : ''
        const afterJson = trimmed.slice(jsonEnd)
        return (response + afterJson).trim() ? response + afterJson : ''
      }
    } catch {
      // Continue with partial handling
    }
  }

  // Still building - extract partial response content
  let valueStart = responseIdx + responseMarker.length

  // Skip whitespace after :
  while (valueStart < trimmed.length && trimmed[valueStart] !== undefined && /\s/.test(trimmed[valueStart]!)) {
    valueStart++
  }

  // Check if it's a string value starting with "
  if (trimmed[valueStart] !== '"') {
    return content
  }

  valueStart++ // Skip the opening quote

  // Extract the partial response, handling escapes
  let response = ''
  let i = valueStart
  while (i < trimmed.length) {
    const char = trimmed[i]
    if (char === '\\' && i + 1 < trimmed.length) {
      const nextChar = trimmed[i + 1]
      if (nextChar === '"') {
        response += '"'
        i += 2
      } else if (nextChar === 'n') {
        response += '\n'
        i += 2
      } else if (nextChar === '\\') {
        response += '\\'
        i += 2
      } else {
        response += char
        i++
      }
    } else if (char === '"') {
      break
    } else {
      response += char
      i++
    }
  }

  return response
}

/**
 * Normalizes initial messages loaded from the database.
 * - Cleans router JSON from text
 * - Extracts tool calls and converts them to tool parts
 * - Detects raw JSON that should be a tool
 * - Sets state to 'done' for all text parts
 * - Normalizes tool parts to ensure consistent format
 */
function normalizeInitialMessages(messages: FlexiMessage[]): FlexiMessage[] {
  return messages.map((message) => {
    const newParts: FlexiMessagePart[] = []

    for (const part of message.parts) {
      // Handle text parts - may contain embedded tool tags or raw JSON
      if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
        // Clean router JSON first
        const cleanedContent = cleanRouterJson(part.text)

        // Extract tools from [tool:] tags
        const { text: afterToolExtract, tools } = extractToolCalls(cleanedContent)

        // Extract embedded JSON tools (without [tool:] wrapper)
        const { tools: embeddedTools, cleanedText: finalText } = extractEmbeddedToolJson(afterToolExtract)

        // Add the cleaned text part (if any remains)
        if (finalText.trim()) {
          newParts.push({
            type: 'text',
            text: finalText,
            state: 'done'
          })
        }

        // Add extracted tools from [tool:] tags
        for (const tool of tools) {
          newParts.push(tool as unknown as FlexiMessagePart)
        }

        // Add tools detected from embedded JSON
        for (const tool of embeddedTools) {
          newParts.push(tool as unknown as FlexiMessagePart)
        }
      }
      // Handle tool parts from database - normalize format
      else if (part.type && typeof part.type === 'string' && part.type.startsWith('tool-')) {
        // Tool parts from DB have: type, state, output, input, toolCallId
        // Ensure they have the correct format for the UI components
        const toolPart = part as unknown as Record<string, unknown>
        newParts.push({
          type: toolPart.type as string,
          state: (toolPart.state as string) || 'output-available',
          output: toolPart.output as Record<string, unknown> || {},
          input: toolPart.input as Record<string, unknown> || toolPart.output as Record<string, unknown> || {},
          toolCallId: (toolPart.toolCallId as string) || `tool-${Date.now()}`
        } as unknown as FlexiMessagePart)
      }
      // Keep other non-text parts as-is (artifacts, etc.)
      else {
        newParts.push(part)
      }
    }

    // If no parts were added, add an empty text part
    if (newParts.length === 0) {
      newParts.push({
        type: 'text',
        text: '',
        state: 'done'
      })
    }

    return {
      ...message,
      parts: newParts
    }
  })
}

/**
 * Extracts embedded JSON from text that looks like a carousel or property card.
 * The JSON may be embedded in the middle of text, not wrapped in [tool:] tags.
 * 
 * Example input:
 * "Here are some options:\n{"title":"Accommodations","items":[...]}Let me know if you need help"
 * 
 * Returns the extracted tool and the remaining text without the JSON.
 */
function extractEmbeddedToolJson(text: string): { tools: ExtractedTool[]; cleanedText: string } {
  const tools: ExtractedTool[] = []
  let cleanedText = text

  // Pattern to find JSON objects that look like carousel data
  // Matches {"title":..., "items":[...]} pattern
  const jsonPattern = /\{"title"\s*:\s*"[^"]*"\s*,\s*"items"\s*:\s*\[[\s\S]*?\]\}/g

  let match: RegExpExecArray | null
  const matches: Array<{ start: number; end: number; json: string }> = []

  // Find all potential JSON matches
  while ((match = jsonPattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      json: match[0]
    })
  }

  // Process matches in reverse order to preserve indices when removing
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]!

    try {
      // Try to parse - may need to extend the match to get complete JSON
      let jsonStr = m.json
      let parsed: Record<string, unknown> | null = null

      // Try parsing the basic match first
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        // If basic parsing fails, try to find the complete JSON by balancing braces
        const startIdx = m.start
        let braceCount = 0
        let endIdx = startIdx
        let inString = false
        let escape = false

        for (let j = startIdx; j < text.length; j++) {
          const char = text[j]

          if (escape) {
            escape = false
            continue
          }

          if (char === '\\') {
            escape = true
            continue
          }

          if (char === '"' && !escape) {
            inString = !inString
            continue
          }

          if (!inString) {
            if (char === '{') braceCount++
            if (char === '}') {
              braceCount--
              if (braceCount === 0) {
                endIdx = j + 1
                break
              }
            }
          }
        }

        if (endIdx > startIdx) {
          jsonStr = text.substring(startIdx, endIdx)
          try {
            parsed = JSON.parse(jsonStr)
            // Update the match end position
            m.end = endIdx
            m.json = jsonStr
          } catch {
            // Still can't parse, skip this match
            continue
          }
        }
      }

      if (!parsed) continue

      // Check if this looks like a carousel
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        const firstItem = parsed.items[0] as Record<string, unknown>
        if (firstItem && (firstItem.title || firstItem.image || firstItem.price)) {
          tools.push({
            type: 'tool-carousel',
            state: 'output-available',
            output: parsed,
            input: parsed,
            toolCallId: generateToolId('carousel', jsonStr)
          })

          // Remove JSON from text
          cleanedText = cleanedText.substring(0, m.start) + cleanedText.substring(m.end)
        }
      }
    } catch {
      // JSON parsing failed, skip
      continue
    }
  }

  // Also check for standalone property card JSON (single property object)
  const propertyPattern = /\{"id"\s*:\s*"[^"]*"\s*,\s*"title"\s*:\s*"[^"]*"[\s\S]*?"(?:image|price|description)"\s*:[\s\S]*?\}/g

  while ((match = propertyPattern.exec(cleanedText)) !== null) {
    try {
      // Find complete JSON by balancing braces
      const startIdx = match.index
      let braceCount = 0
      let endIdx = startIdx
      let inString = false
      let escape = false

      for (let j = startIdx; j < cleanedText.length; j++) {
        const char = cleanedText[j]

        if (escape) {
          escape = false
          continue
        }

        if (char === '\\') {
          escape = true
          continue
        }

        if (char === '"' && !escape) {
          inString = !inString
          continue
        }

        if (!inString) {
          if (char === '{') braceCount++
          if (char === '}') {
            braceCount--
            if (braceCount === 0) {
              endIdx = j + 1
              break
            }
          }
        }
      }

      if (endIdx > startIdx) {
        const jsonStr = cleanedText.substring(startIdx, endIdx)
        const parsed = JSON.parse(jsonStr)

        // Make sure it's not already inside items array
        if (parsed.title && (parsed.image || parsed.price || parsed.description) && !parsed.items) {
          tools.push({
            type: 'tool-property-card',
            state: 'output-available',
            output: parsed,
            input: parsed,
            toolCallId: generateToolId('property-card', jsonStr)
          })

          cleanedText = cleanedText.substring(0, startIdx) + cleanedText.substring(endIdx)
        }
      }
    } catch {
      continue
    }
  }

  return { tools, cleanedText: cleanedText.trim() }
}