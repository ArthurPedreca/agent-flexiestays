import type { UIMessage } from 'ai'

export interface ArtifactUIPart {
  type: 'artifact'
  artifactType: string
  title?: string
  description?: string
  data: Record<string, unknown>
  id: string
  state?: 'streaming' | 'done' | 'error'
}

export type BaseUIPart = UIMessage['parts'][number]

export type FlexiMessagePart = BaseUIPart | ArtifactUIPart

export type FlexiMessage = Omit<UIMessage, 'parts'> & {
  parts: FlexiMessagePart[]
}
