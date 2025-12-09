import type { ArtifactUIPart } from '../types/chat'

interface ExtractArtifactsResult {
  cleanedText: string
  artifacts: ArtifactUIPart[]
}

// Tool types
interface ExtractedToolPart {
  type: `tool-${string}`
  state: 'output-available'
  output: Record<string, unknown>
  input: Record<string, unknown>
  toolCallId: string
}

interface ExtractToolsResult {
  cleanedText: string
  tools: ExtractedToolPart[]
}

export interface ParsedRichContent {
  markdown: string
  artifacts: ArtifactUIPart[]
  tools: ExtractedToolPart[]
}

const ARTIFACT_REGEX = /\[artifact([^\]]*)\]([\s\S]*?)\[\/artifact\]/gi
const ATTRIBUTE_REGEX = /(\w[\w-]*)\s*=\s*"([^"]*)"/gi
const TOOL_REGEX = /\[tool:(\w+(?:-\w+)*)\]([\s\S]*?)\[\/tool\]/gi
const ROUTER_JSON_REGEX = /^\s*\{\s*"route"\s*:\s*"[^"]*"\s*,\s*"response"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\}/

// Tool name mapping
const TOOL_TYPE_MAP: Record<string, string> = {
  carousel: 'tool-carousel',
  'property-card': 'tool-property-card',
  'image-display': 'tool-image-display',
  propertyCard: 'tool-property-card',
  imageDisplay: 'tool-image-display'
}

function generateDeterministicId(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return `artifact-${Math.abs(hash).toString(36)}`
}

function generateToolId(toolName: string, data: string): string {
  let hash = 0
  const input = `${toolName}:${data}`
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return `tool-${Math.abs(hash).toString(36)}`
}

function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const normalized = raw?.trim() ?? ''

  if (!normalized) return attributes

  let match: RegExpExecArray | null = null
  const regex = new RegExp(ATTRIBUTE_REGEX)

  while ((match = regex.exec(normalized)) !== null) {
    const [, key, value] = match
    if (key && value) {
      attributes[key.toLowerCase()] = value.trim()
    }
  }

  return attributes
}

/**
 * Cleans router JSON from content
 */
function cleanRouterJson(content: string): string {
  const trimmed = content.trim()

  if (!trimmed.startsWith('{') || !trimmed.includes('"route"')) {
    return content
  }

  const match = trimmed.match(ROUTER_JSON_REGEX)
  if (match && match[1] !== undefined) {
    const responseContent = match[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')

    const afterJson = trimmed.slice(match[0].length)
    const result = responseContent + afterJson
    return result.trim() ? result : ''
  }

  return content
}

/**
 * Extracts tool calls from content
 */
function extractTools(source: string): ExtractToolsResult {
  if (!source) {
    return { cleanedText: '', tools: [] }
  }

  const tools: ExtractedToolPart[] = []

  const cleaned = source.replace(TOOL_REGEX, (_, toolName: string, payload: string) => {
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

    return ''
  })

  return {
    cleanedText: cleaned.trim(),
    tools
  }
}

export function extractArtifacts(source: string): ExtractArtifactsResult {
  if (!source) {
    return { cleanedText: '', artifacts: [] }
  }

  const artifacts: ArtifactUIPart[] = []

  const cleaned = source.replace(ARTIFACT_REGEX, (_, attrString: string, payload: string) => {
    const attributes = parseAttributes(attrString)
    const type = (attributes.type ?? 'custom').toLowerCase()
    const title = attributes.title
    const description = attributes.description
    const payloadRaw = payload?.trim() ?? ''

    let data: Record<string, unknown> = {}

    if (payloadRaw) {
      try {
        const parsed = JSON.parse(payloadRaw)
        data = typeof parsed === 'object' && parsed !== null
          ? parsed as Record<string, unknown>
          : { value: parsed }
      } catch {
        data = { raw: payloadRaw }
      }
    }

    artifacts.push({
      type: 'artifact',
      artifactType: type,
      title,
      description,
      data,
      id: generateDeterministicId(`${type}:${payloadRaw}:${title ?? ''}`),
      state: 'done'
    })

    return ''
  })

  return {
    cleanedText: cleaned.trim(),
    artifacts
  }
}

export function parseRichContent(raw: string): ParsedRichContent {
  // First clean router JSON
  const cleanedFromRouter = cleanRouterJson(raw)

  // Extract artifacts
  const { cleanedText: afterArtifacts, artifacts } = extractArtifacts(cleanedFromRouter)

  // Extract tools
  const { cleanedText: finalText, tools } = extractTools(afterArtifacts)

  return {
    markdown: finalText,
    artifacts,
    tools
  }
}