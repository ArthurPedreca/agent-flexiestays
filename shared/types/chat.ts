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

export interface TextUIPart {
  type: 'text'
  text: string
  state?: 'waiting' | 'streaming' | 'done'
}

export interface ToolUIPart {
  type: `tool-${string}`
  state: 'input-available' | 'input-streaming' | 'output-available' | 'output-error'
  output?: Record<string, unknown>
  input?: Record<string, unknown>
  toolCallId: string
}

export type BaseUIPart = UIMessage['parts'][number]

export type FlexiMessagePart = BaseUIPart | ArtifactUIPart | TextUIPart | ToolUIPart

export type FlexiMessage = Omit<UIMessage, 'parts'> & {
  parts: FlexiMessagePart[]
}
