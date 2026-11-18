import { one, type Queryable } from '../../db/index.js'

export async function workoutOwnedBy(db: Queryable, id: number, userId: number) {
  return Boolean(await one(db, 'SELECT 1 FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]))
}
