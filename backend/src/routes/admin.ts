import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database } from '../db/index.js'
import { deleteUser } from '../db/users.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { idParam, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

const roleSchema = z.object({ isAdmin: z.boolean() })

const headlineSchema = z.object({
  title: z.string().trim().min(3).max(160),
  sourceName: z.string().trim().min(1).max(80).nullable().default(null),
  // Só http(s): o link vai para um href, e "javascript:" rodaria no site.
  url: z.string().trim().url().max(2000).regex(/^https?:\/\//i, 'Use um link http ou https').nullable().default(null),
  hours: z.number().int().min(1).max(168).default(24),
})

type AdminUser = {
  id: number
  name: string
  email: string
  isAdmin: boolean
  createdAt: Date
  workouts: number
  sessions: number
  lastSessionAt: Date | null
}

const USER_SUMMARY = `
  SELECT u.id, u.name, u.email, u.is_admin AS "isAdmin", u.created_at AS "createdAt",
         (SELECT count(*)::int FROM workouts w WHERE w.user_id = u.id) AS workouts,
         (SELECT count(*)::int FROM practice_sessions s WHERE s.user_id = u.id) AS sessions,
         (SELECT max(s.performed_at) FROM practice_sessions s WHERE s.user_id = u.id) AS "lastSessionAt"
  FROM users u`

// O admin não mexe na própria conta: assim sempre sobra pelo menos um administrador.
function rejectSelf(req: Parameters<typeof currentUser>[0], id: number, action: string) {
  if (id === currentUser(req)) throw new HttpError(400, `Você não pode ${action} a própria conta`)
}

export function adminRouter(db: Database) {
  const router = Router()

  router.get('/users', async (_req, res) => {
    res.json(await many<AdminUser>(db, `${USER_SUMMARY} ORDER BY u.created_at DESC`))
  })

  router.patch('/users/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { isAdmin } = parse(roleSchema, req.body)
    rejectSelf(req, id, 'alterar o papel de')

    const updated = await one<{ id: number }>(db, 'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id', [
      isAdmin,
      id,
    ])
    if (!updated) throw notFound('Usuário')
    res.json(await one<AdminUser>(db, `${USER_SUMMARY} WHERE u.id = $1`, [id]))
  })

  router.delete('/users/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    rejectSelf(req, id, 'excluir')

    const rowCount = await db.transaction((tx) => deleteUser(tx, id))
    if (!rowCount) throw notFound('Usuário')
    res.status(204).end()
  })

  router.post('/news', async (req, res) => {
    const { title, sourceName, url, hours } = parse(headlineSchema, req.body)
    await db.query(`DELETE FROM news_items WHERE origin = 'admin' AND expires_at <= now()`)
    const created = await one(
      db,
      `INSERT INTO news_items (origin, title, source_name, url, expires_at)
       VALUES ('admin', $1, $2, $3, now() + make_interval(hours => $4::int))
       RETURNING id, origin, title, source_name AS "sourceName", url, published_at AS "publishedAt", expires_at AS "expiresAt"`,
      [title, sourceName, url, hours],
    )
    res.status(201).json(created)
  })

  router.delete('/news/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    // A do GNews só fica escondida: apagada, voltaria na próxima busca.
    const hidden = await db.query(`UPDATE news_items SET hidden = true WHERE id = $1 AND origin = 'gnews'`, [id])
    const deleted = hidden.rowCount ? hidden : await db.query(`DELETE FROM news_items WHERE id = $1`, [id])
    if (!deleted.rowCount) throw notFound('Manchete')
    res.status(204).end()
  })

  return router
}
