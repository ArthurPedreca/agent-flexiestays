import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '../database/schema'

export { sql, eq, and, or, desc, asc } from 'drizzle-orm'

export const tables = schema

let pool: Pool | null = null
let db: ReturnType<typeof drizzle> | null = null

export function useDrizzle() {
  if (!pool) {
    const databaseUrl = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error('DATABASE_URL or NUXT_DATABASE_URL is not defined')
    }

    console.log('Connecting to database:', databaseUrl.replace(/:[^:@]+@/, ':****@'))

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 5000
    })
  }

  if (!db) {
    db = drizzle(pool, { schema })
  }

  return db
}

export type Chat = typeof schema.chats.$inferSelect
export type Message = typeof schema.messages.$inferSelect
