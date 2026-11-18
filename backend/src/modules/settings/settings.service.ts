import type { Queryable } from '../../db/index.js'
import { settingsSchema, type Settings } from './settings.schema.js'
import { findSettings, saveSettings } from './settings.repository.js'
export { settingsSchema } from './settings.schema.js'
export type { Settings } from './settings.schema.js'

export async function readSettings(db: Queryable, userId: number) {
  const row = await findSettings(db, userId)
  // Dados antigos ou de outra versão: o que não validar volta para o padrão.
  const parsed = settingsSchema.safeParse(row?.data ?? {})
  return parsed.success ? parsed.data : settingsSchema.parse({})
}

export async function writeSettings(db: Queryable, userId: number, settings: Settings) {
  await saveSettings(db, userId, settings)
}
