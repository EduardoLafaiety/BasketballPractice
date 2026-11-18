import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { idParam, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { roleSchema } from './admin.schema.js'
import { changeRole, listUsers, removeUser } from './admin.service.js'

export function adminRouter(db: Database) {
  const router = Router()
  router.get('/users', async (req, res) => {
    res.json(await listUsers(db, currentUser(req)))
  })
  router.patch('/users/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { isAdmin } = parse(roleSchema, req.body)
    res.json(await changeRole(db, currentUser(req), id, isAdmin))
  })
  router.delete('/users/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await removeUser(db, currentUser(req), id)
    res.status(204).end()
  })
  return router
}
