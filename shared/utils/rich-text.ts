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
  if (!normalized) {
    return attributes
  }

  let match: RegExpExecArray | null = null
  const regex = new RegExp(ATTRIBUTE_REGEX)

  while ((match = regex.exec(normalized)) !== null) {
    const [, key, value] = match
    if (!key || !value) {
      continue
    }

    attributes[key.toLowerCase()] = value.trim()
  }

  return attributes
}

export function extractArtifacts(source: string): ExtractArtifactsResult {
  if (!source) {
    return { cleanedText: '', artifacts: [] }
  }

  const artifacts: ArtifactUIPart[] = []
  let cleaned = source

  cleaned = cleaned.replace(ARTIFACT_REGEX, (_, attrString: string, payload: string) => {
    const attributes = parseAttributes(attrString)
    const type = (attributes.type ?? 'custom').toLowerCase()
    const title = attributes.title
    const description = attributes.description
    const payloadRaw = payload?.trim() ?? ''

    let data: Record<string, unknown> = {}

    if (payloadRaw) {
      try {
        const parsed = JSON.parse(payloadRaw)
        if (typeof parsed === 'object' && parsed !== null) {
          data = parsed as Record<string, unknown>
        } else {
          data = { value: parsed }
        }
      } catch {
        data = { raw: payloadRaw }
      }
    }

    const artifact: ArtifactUIPart = {
      type: 'artifact',
      artifactType: type,
      title,
      description,
      data,
      id: generateDeterministicId(`${type}:${payloadRaw}:${title ?? ''}`),
      state: 'done'
    }

    artifacts.push(artifact)

    return ''
  })

  return {
    cleanedText: cleaned,
    artifacts
  }
}

function normalizeLooseBbcode(value: string): string {
  return value
    .replace(/\[(\/?)(b|i|u|s)(?!])/gi, '[$1$2]')
    .replace(/\[(\/?)bbcode(?!])/gi, '[$1bbcode]')
}

export function bbcodeToMarkdown(input: string): string {
  if (!input) {
    return ''
  }

  let output = normalizeLooseBbcode(input).replace(/\r\n/g, '\n')

  const replacements: Array<[RegExp, string]> = [
    [/\[br\s*\/?\]/gi, '\n'],
    [/\[b](.*?)\[\/b]/gis, '**$1**'],
    [/\[i](.*?)\[\/i]/gis, '*$1*'],
    [/\[u](.*?)\[\/u]/gis, '__$1__'],
    [/\[s](.*?)\[\/s]/gis, '~~$1~~'],
    [/\[code](.*?)\[\/code]/gis, '\n```\n$1\n```\n'],
    [/\[bbcode](.*?)\[\/bbcode]/gis, '\n```\n$1\n```\n'],
    [/\[center](.*?)\[\/center]/gis, '$1'],
    [/\[left](.*?)\[\/left]/gis, '$1'],
    [/\[right](.*?)\[\/right]/gis, '$1'],
    [/\[url](.*?)\[\/url]/gis, '<$1>'],
    [/\[url=(.*?)](.*?)\[\/url]/gis, '[$2]($1)'],
    [/\[img](.*?)\[\/img]/gis, '![]($1)']
  ]

  replacements.forEach(([regex, replacement]) => {
    output = output.replace(regex, replacement)
  })

  output = output.replace(/\[quote](.*?)\[\/quote]/gis, (_match: string, body: string) => body.split('\n').map(line => `> ${line}`).join('\n'))
  output = output.replace(/\[quote=(.*?)]([\s\S]*?)\[\/quote]/gis, (_match: string, cite: string, body: string) => {
    const header = cite ? `> **${cite.trim()}**\n` : ''
    const content = body.split('\n').map(line => `> ${line}`).join('\n')
    return `${header}${content}`
  })

  output = output.replace(/\[list](.*?)\[\/list]/gis, (_, body: string) => {
    const items = body.split(/\[\*]/gi)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => `- ${item}`)
    return `\n${items.join('\n')}\n`
  })

  output = output.replace(/\[\/(?:color|size|font|span)[^\]]*]/gi, '')
  output = output.replace(/\[(?:color|size|font|span)[^\]]*]/gi, '')
  output = output.replace(/\n{3,}/g, '\n\n')

  return output.trim()
}

export interface ParsedRichContent {
  markdown: string
  artifacts: ArtifactUIPart[]
}

export function parseRichContent(raw: string): ParsedRichContent {
  const { cleanedText, artifacts } = extractArtifacts(raw)

  return {
    markdown: bbcodeToMarkdown(cleanedText),
    artifacts
  }
}
