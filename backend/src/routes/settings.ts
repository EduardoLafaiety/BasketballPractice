import { Router } from 'express'
import { z } from 'zod'
import { one, type Database, type Queryable } from '../db/index.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

// Preferências que acompanham o atleta entre dispositivos. Campos ausentes recebem o padrão.
export const settingsSchema = z.object({
  theme: z.enum(['sistema', 'claro', 'escuro']).default('sistema'),
  reminders: z
    .object({
      enabled: z.boolean().default(false),
      time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido')
        .default('18:00'),
      days: z.array(z.number().int().min(0).max(6)).max(7).default([1, 2, 3, 4, 5]),
    })
    .prefault({}),
  metronomeBpm: z.number().int().min(30).max(240).default(90),
})

export type Settings = z.infer<typeof settingsSchema>

export async function readSettings(db: Database, userId: number) {
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

export function settingsRouter(db: Database) {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json(await readSettings(db, currentUser(req)))
  })

  router.put('/', async (req, res) => {
    const settings = parse(settingsSchema, req.body)
    await writeSettings(db, currentUser(req), settings)
    res.json(settings)
  })

  return router
}
