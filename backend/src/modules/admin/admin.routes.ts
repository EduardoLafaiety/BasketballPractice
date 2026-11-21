import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { idParam, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { updateUserSchema } from './admin.schema.js'
import { updateUser, userDetail, revokeUserSessions, listUsers, removeUser } from './admin.service.js'

export function adminRouter(db: Database) {
  const router = Router()
  router.get('/users', async (req, res) => {
    res.json(await listUsers(db, currentUser(req)))
  })
  router.patch('/users/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const input = parse(updateUserSchema, req.body)
    res.json(await updateUser(db, currentUser(req), id, input))
  })
  router.get('/users/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await userDetail(db, currentUser(req), id))
  })
  router.post('/users/:id/revoke-sessions', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await revokeUserSessions(db, currentUser(req), id)
    res.status(204).end()
  })
  router.delete('/users/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await removeUser(db, currentUser(req), id)
    res.status(204).end()
  })
  return router
}
