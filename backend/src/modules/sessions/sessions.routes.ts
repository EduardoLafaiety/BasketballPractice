import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { idParam, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { compareSessions } from './session.comparison.js'
import { comparisonQuery, createSessionSchema, listQuery, sessionSchema } from './session.schema.js'
import { createSession, deleteSession, getSession, listSessions, updateSession } from './session.service.js'

export function sessionsRouter(db: Database) {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json(await listSessions(db, currentUser(req), parse(listQuery, req.query)))
  })

  router.get('/comparison', async (req, res) => {
    res.json(await compareSessions(db, currentUser(req), parse(comparisonQuery, req.query)))
  })

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await getSession(db, currentUser(req), id))
  })

  router.post('/', async (req, res) => {
    res.status(201).json(await createSession(db, currentUser(req), parse(createSessionSchema, req.body)))
  })

  router.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await updateSession(db, currentUser(req), id, parse(sessionSchema, req.body)))
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await deleteSession(db, currentUser(req), id)
    res.status(204).end()
  })

  return router
}
