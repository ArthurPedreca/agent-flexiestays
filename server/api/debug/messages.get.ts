import { useDrizzle } from '../../database/drizzle'

export default defineEventHandler(async (event) => {
  const { chatId } = getQuery(event)

  if (!chatId) {
    return { error: 'chatId required' }
  }

  const db = useDrizzle()

  const chat = await db.query.chats.findFirst({
    where: (chat, { eq }) => eq(chat.id, chatId as string),
    with: {
      messages: {
        orderBy: (message, { asc }) => asc(message.createdAt)
      }
    }
  })

  if (!chat) {
    return { error: 'Chat not found' }
  }

  // Return raw messages with parts details
  return {
    chatId: chat.id,
    messagesCount: chat.messages.length,
    messages: chat.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      partsCount: Array.isArray(msg.parts) ? msg.parts.length : 0,
      parts: msg.parts,
      partsTypes: Array.isArray(msg.parts)
        ? (msg.parts as Array<{ type?: string }>).map(p => ({
          type: p?.type,
          hasOutput: 'output' in (p || {}),
          hasState: 'state' in (p || {}),
          keys: Object.keys(p || {})
        }))
        : []
    }))
  }
})
