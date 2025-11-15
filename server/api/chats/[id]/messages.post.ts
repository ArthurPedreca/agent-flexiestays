import { messages } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const chatId = getRouterParam(event, 'id')

  if (!chatId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chat ID is required'
    })
  }

  const body = await readBody(event)

  if (!body.role || !body.parts) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role and parts are required'
    })
  }

  const db = useDrizzle()

  const [message] = await db.insert(messages).values({
    chatId,
    role: body.role,
    parts: body.parts
  }).returning()

  return message
})
