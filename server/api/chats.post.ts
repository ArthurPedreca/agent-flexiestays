import { useDrizzle, tables } from '../database/drizzle'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  const { input, id } = await readBody(event)
  const db = useDrizzle()

  const chatValues: any = {
    title: '',
    userId: session.user?.id || session.id
  }

  // Allow custom ID if provided
  if (id) {
    chatValues.id = id
  }

  const [chat] = await db.insert(tables.chats).values(chatValues).returning()
  if (!chat) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create chat' })
  }

  // Only insert initial message if input is provided
  if (input) {
    await db.insert(tables.messages).values({
      chatId: chat.id,
      role: 'user',
      parts: [{ type: 'text', text: input }]
    })
  }

  return chat
})
