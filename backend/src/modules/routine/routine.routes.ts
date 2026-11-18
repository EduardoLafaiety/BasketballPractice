import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { weekSchema } from './routine.schema.js'
import { saveRoutineWeek } from './routine.service.js'

export function routineRouter(db: Database) {
  const router = Router()
  router.put('/', async (req, res) => {
    res.json(await saveRoutineWeek(db, currentUser(req), parse(weekSchema, req.body)))
  })
  return router
}
