import type { Queryable } from '../../db/index.js'
import { HttpError } from '../../lib/http-error.js'
import { generatePlan } from './plan.generator.js'
import { visibleExercises } from './plan.repository.js'
import type { GenerateInput } from './plan.schema.js'

export async function generateUserPlan(db: Queryable, userId: number, input: GenerateInput) {
  const exercises = await visibleExercises(db, userId)
  if (!exercises.length) throw new HttpError(400, 'Nenhum exercício disponível')
  const blocks = generatePlan(exercises, input)
  return { minutes: blocks.reduce((total, block) => total + block.minutes, 0), blocks }
}
