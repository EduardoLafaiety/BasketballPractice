import { one, type Queryable } from '../../db/index.js'
import { settingsSchema, type Settings } from './settings.schema.js'
export { settingsSchema } from './settings.schema.js'
export type { Settings } from './settings.schema.js'

export async function readSettings(db: Queryable, userId: number) {
  const row = await one<{ data: unknown }>(db, 'SELECT data FROM user_settings WHERE user_id = $1', [userId])
  // Dados antigos ou de outra versão: o que não validar volta para o padrão.
  const parsed = settingsSchema.safeParse(row?.data ?? {})
  return parsed.success ? parsed.data : settingsSchema.parse({})
}

export async function writeSettings(db: Queryable, userId: number, settings: Settings) {
  await db.query(
    `INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, JSON.stringify(settings)],
  )
}
