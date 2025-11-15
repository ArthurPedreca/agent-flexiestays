import { chats } from '../../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const chatId = getRouterParam(event, 'id')

  if (!chatId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chat ID is required'
    })
  }

  const body = await readBody(event)

  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required'
    })
  }

  const db = useDrizzle()

  const [chat] = await db
    .update(chats)
    .set({ title: body.title })
    .where(eq(chats.id, chatId))
    .returning()

  return chat
})
