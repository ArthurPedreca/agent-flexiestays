import type { ArtifactUIPart } from '../types/chat'

interface ExtractArtifactsResult {
  cleanedText: string
  artifacts: ArtifactUIPart[]
}

const ARTIFACT_REGEX = /\[artifact([^\]]*)\]([\s\S]*?)\[\/artifact\]/gi
const ATTRIBUTE_REGEX = /(\w[\w-]*)\s*=\s*"([^"]*)"/gi

function generateDeterministicId(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return `artifact-${Math.abs(hash).toString(36)}`
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

export interface ParsedRichContent {
  markdown: string
  artifacts: ArtifactUIPart[]
}

export function parseRichContent(raw: string): ParsedRichContent {
  const { cleanedText, artifacts } = extractArtifacts(raw)

  return {
    markdown: cleanedText,
    artifacts
  }
}