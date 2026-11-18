import { many, type Queryable } from '../../db/index.js'
import type { ExerciseRow } from './plan.generator.js'

export function visibleExercises(db: Queryable, userId: number) {
  return many<ExerciseRow>(db,
    `SELECT id, name, category, metric, level, warmup, position FROM exercises WHERE user_id IS NULL OR user_id = $1
     ORDER BY id`, [userId])
}
