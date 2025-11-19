import { z } from 'zod'
import { useDrizzle, tables, eq, and } from '../../database/drizzle'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const db = useDrizzle()

  const body = await readValidatedBody(
    event,
    z.object({
      id: z.string().min(1).max(36).optional(),
      input: z.string().optional()
    }).parse
  )

  const userId = session.user?.id || session.id
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not authenticated'
    })
  }

  // Generate ID if not provided
  const chatId = body.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`)

  // Check if chat already exists (idempotent)
  const existingChat = await db.query.chats.findFirst({
    where: (chat) => and(
      eq(chat.id, chatId),
      eq(chat.userId, userId)
    )
  })

  if (existingChat) {
    return { id: existingChat.id, title: existingChat.title }
  }

  // Create new chat
  const [chat] = await db.insert(tables.chats).values({
    id: chatId,
    userId,
    title: null
  }).returning()

  if (!chat) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create chat'
    })
  }

  // Only insert initial message if input is provided
  if (body.input) {
    await db.insert(tables.messages).values({
      chatId: chat.id,
      role: 'user',
      parts: [{ type: 'text', text: body.input }]
    })
  }

  return { id: chat.id, title: chat.title }
})
