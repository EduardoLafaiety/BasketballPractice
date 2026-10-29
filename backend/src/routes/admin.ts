import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { idParam, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

const roleSchema = z.object({ isAdmin: z.boolean() })

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

    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id])
    if (!rowCount) throw notFound('Usuário')
    res.status(204).end()
  })

  return router
}
