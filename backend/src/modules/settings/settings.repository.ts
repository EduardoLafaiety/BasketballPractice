import { one, type Queryable } from '../../db/index.js'
import type { Settings } from './settings.schema.js'

export function findSettings(db: Queryable, userId: number) {
  return one<{ data: unknown }>(db, 'SELECT data FROM user_settings WHERE user_id = $1', [userId])
}

export async function saveSettings(db: Queryable, userId: number, settings: Settings) {
  await db.query(`INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [userId, JSON.stringify(settings)])
}
