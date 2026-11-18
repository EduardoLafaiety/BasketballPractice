import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { tzQuery } from '../sessions/session.schema.js'
import { completeSchema, dayParam, programParam } from './program.schema.js'
import { completeDay, getProgram, leaveProgram, listPrograms, startProgram } from './program.service.js'

export function programsRouter(db: Database) {
  const router = Router()
  router.get('/', async (req, res) => {
    const { tzOffset } = parse(tzQuery, req.query)
    res.json(await listPrograms(db, currentUser(req), tzOffset))
  })
  router.get('/:id', async (req, res) => {
    const { id } = parse(programParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    res.json(await getProgram(db, currentUser(req), id, tzOffset))
  })
  router.post('/:id/start', async (req, res) => {
    const { id } = parse(programParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    res.status(201).json(await startProgram(db, currentUser(req), id, tzOffset))
  })
  router.post('/:id/days/:day/complete', async (req, res) => {
    const { id, day } = parse(dayParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    const { sessionId } = parse(completeSchema, req.body ?? {})
    res.status(201).json(await completeDay(db, currentUser(req), id, day, tzOffset, sessionId ?? null))
  })
  router.delete('/:id', async (req, res) => {
    const { id } = parse(programParam, req.params)
    await leaveProgram(db, currentUser(req), id)
    res.status(204).end()
  })
  return router
}
