import { many, one, type Queryable } from '../../db/index.js'
import type { WorkoutInput } from './workout.schema.js'

interface WorkoutRow {
  id: number; name: string; description: string | null
  createdAt: Date | string; updatedAt: Date | string
}

interface WorkoutExerciseRow {
  exerciseId: number; name: string; category: string; metric: string; position: number
  sets: number | null; targetReps: number | null; targetSeconds: number | null; notes: string | null
}

export async function findWorkout(db: Queryable, id: number, userId: number, lock = false) {
  return one<WorkoutRow>(db,
    `SELECT id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM workouts WHERE id = $1 AND user_id = $2${lock ? ' FOR UPDATE' : ''}`, [id, userId])
}

export async function listWorkouts(db: Queryable, userId: number) {
  return many<WorkoutRow & { exerciseCount: number }>(db,
    `SELECT w.id, w.name, w.description, w.created_at AS "createdAt", w.updated_at AS "updatedAt",
            COUNT(we.id)::int AS "exerciseCount"
     FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
     WHERE w.user_id = $1 GROUP BY w.id ORDER BY w.updated_at DESC, w.id DESC`, [userId])
}

export async function workoutExercises(db: Queryable, id: number) {
  return many<WorkoutExerciseRow>(db,
    `SELECT we.exercise_id AS "exerciseId", e.name, e.category, e.metric, we.position,
            we.sets, we.target_reps AS "targetReps", we.target_seconds AS "targetSeconds", we.notes
     FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = $1 ORDER BY we.position`, [id])
}

export async function insertWorkout(tx: Queryable, userId: number, input: Pick<WorkoutInput, 'name' | 'description'>) {
  return (await one<{ id: number }>(tx,
    'INSERT INTO workouts (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
    [userId, input.name, input.description ?? null]))!.id
}

export async function updateWorkout(tx: Queryable, id: number, userId: number, input: WorkoutInput) {
  await tx.query('UPDATE workouts SET name = $1, description = $2, updated_at = now() WHERE id = $3 AND user_id = $4',
    [input.name, input.description ?? null, id, userId])
}

export async function touchWorkout(tx: Queryable, id: number, userId: number) {
  await tx.query('UPDATE workouts SET updated_at = now() WHERE id = $1 AND user_id = $2', [id, userId])
}

export async function findWorkoutByIdentity(tx: Queryable, userId: number, name: string, description?: string | null) {
  return one<{ id: number }>(tx,
    'SELECT id FROM workouts WHERE user_id = $1 AND name = $2 AND description IS NOT DISTINCT FROM $3 ORDER BY id DESC LIMIT 1 FOR UPDATE',
    [userId, name, description ?? null])
}

/** Compartilhado entre edição, rotina e importação. O chamador valida referências e propriedade. */
export async function replaceWorkoutExercises(tx: Queryable, workoutId: number, items: WorkoutInput['exercises']) {
  await tx.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId])
  if (!items.length) return
  const column = <K extends keyof WorkoutInput['exercises'][number]>(key: K) => items.map((item) => item[key] ?? null)
  await tx.query(
    `INSERT INTO workout_exercises (workout_id, exercise_id, position, sets, target_reps, target_seconds, notes)
     SELECT $1, t.exercise_id, t.ord - 1, t.sets, t.target_reps, t.target_seconds, t.notes
     FROM unnest($2::int[], $3::int[], $4::int[], $5::int[], $6::text[])
          WITH ORDINALITY AS t(exercise_id, sets, target_reps, target_seconds, notes, ord)`,
    [workoutId, column('exerciseId'), column('sets'), column('targetReps'), column('targetSeconds'), column('notes')])
}

export async function deleteWorkout(db: Queryable, id: number, userId: number) {
  return (await db.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, userId])).rowCount
}

export async function workoutOwnedBy(db: Queryable, id: number, userId: number) {
  return Boolean(await one(db, 'SELECT 1 FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]))
}
