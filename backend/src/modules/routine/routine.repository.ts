import { one, type Queryable } from '../../db/index.js'
import type { RoutineWeekInput } from './routine.schema.js'

export async function lockRoutineWeek(tx: Queryable, userId: number) {
  await tx.query('SELECT pg_advisory_xact_lock(4246, $1)', [userId])
}

/** Reutiliza o treino legado e preserva os vínculos do histórico. */
export async function replaceRoutineDay(tx: Queryable, userId: number, input: RoutineWeekInput['days'][number]) {
  const { day, exercises } = input
  const description = `bp-rotina:${day}`
  const existing = await one<{ id: number }>(tx,
    'SELECT id FROM workouts WHERE user_id = $1 AND description = $2 ORDER BY updated_at DESC, id DESC LIMIT 1',
    [userId, description])
  const id = existing?.id ?? (await one<{ id: number }>(tx,
    'INSERT INTO workouts (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
    [userId, `Rotina ${day}`, description]))!.id
  await tx.query('UPDATE workouts SET updated_at = now() WHERE id = $1 AND user_id = $2', [id, userId])
  await tx.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id])
  for (const [position, exercise] of exercises.entries()) {
    await tx.query(
      'INSERT INTO workout_exercises (workout_id, exercise_id, position, target_seconds) VALUES ($1, $2, $3, $4)',
      [id, exercise.exerciseId, position, exercise.minutes * 60])
  }
  return id
}
