import { one, type Queryable } from '../../db/index.js'
import type { RoutineWeekInput } from './routine.schema.js'
import { insertWorkout, replaceWorkoutExercises, touchWorkout } from '../workouts/workout.repository.js'

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
  const id = existing?.id ?? await insertWorkout(tx, userId, { name: `Rotina ${day}`, description })
  await touchWorkout(tx, id, userId)
  await replaceWorkoutExercises(tx, id, exercises.map((e) => ({ exerciseId: e.exerciseId, targetSeconds: e.minutes * 60 })))
  return id
}
