import { z } from 'zod'
import { useDrizzle, tables, eq, and } from '../../../database/drizzle'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const db = useDrizzle()

  const { id } = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string().min(1).max(36)
    }).parse
  )

  const { title } = await readValidatedBody(
    event,
    z.object({
      title: z.string().min(1).max(200)
    }).parse
  )

  const userId = session.user?.id || session.id
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not authenticated'
    })
  }

  // Ensure the chat belongs to the authenticated user
  const chat = await db.query.chats.findFirst({
    where: (chat) => and(
      eq(chat.id, id),
      eq(chat.userId, userId)
    )
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    })
  }

  await db
    .update(tables.chats)
    .set({ title })
    .where(eq(tables.chats.id, id))

  return { ok: true, title }
})
