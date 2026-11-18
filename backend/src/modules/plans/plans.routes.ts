import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { generateSchema } from './plan.schema.js'
import { generateUserPlan } from './plan.service.js'

export function plansRouter(db: Database) {
  const router = Router()
  router.post('/generate', async (req, res) => {
    res.json(await generateUserPlan(db, currentUser(req), parse(generateSchema, req.body)))
  })
  return router
}
