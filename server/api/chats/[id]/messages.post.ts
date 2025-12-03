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

  const body = await readValidatedBody(
    event,
    z.object({
      role: z.enum(['user', 'assistant']),
      parts: z.array(z.any())
    }).parse
  )

  const userId = session.user?.id || session.id
  if (!userId) {
    console.error('❌ Usuário não autenticado ao tentar salvar mensagem')
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
    console.error('❌ Chat não encontrado:', { chatId: id, userId })
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    })
  }

  const result = await db.insert(tables.messages).values({
    chatId: id,
    role: body.role,
    parts: body.parts
  })

  console.log('✅ Mensagem salva no Supabase:', {
    chatId: id,
    role: body.role,
    userId,
    partsCount: body.parts.length
  })

  return { ok: true }
})
