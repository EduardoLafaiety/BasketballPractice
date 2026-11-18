import { Router } from 'express'
import { many, type Database, type Queryable } from '../../db/index.js'
import { HttpError } from '../../lib/http-error.js'
import { parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'

import { generateSchema } from './plan.schema.js'
import { generatePlan, type ExerciseRow } from './plan.generator.js'
export { generatePlan } from './plan.generator.js'
const visibleExercises = (db: Queryable, userId: number) =>
  many<ExerciseRow>(
    db,
    `SELECT id, name, category, metric, level, warmup, position FROM exercises WHERE user_id IS NULL OR user_id = $1
     ORDER BY id`,
    [userId],
  )

export function plansRouter(db: Database) {
  const router = Router()

  router.post('/generate', async (req, res) => {
    const body = parse(generateSchema, req.body)
    const exercises = await visibleExercises(db, currentUser(req))
    if (!exercises.length) throw new HttpError(400, 'Nenhum exercício disponível')
    const blocks = generatePlan(exercises, body)
    res.json({ minutes: blocks.reduce((total, block) => total + block.minutes, 0), blocks })
  })

  return router
}
