import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { notFound } from '../lib/http-error.js'
import { dbId, idParam, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { assertExercisesVisible } from './exercises.js'

export const workoutSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullish(),
  exercises: z
    .array(
      z.object({
        exerciseId: dbId,
        sets: z.number().int().min(1).max(100).nullish(),
        targetReps: z.number().int().min(1).max(10000).nullish(),
        targetSeconds: z.number().int().min(1).max(86400).nullish(),
        notes: z.string().trim().max(500).nullish(),
      }),
    )
    .max(50)
    .default([]),
})

type WorkoutInput = z.infer<typeof workoutSchema>

export function workoutsRouter(db: Database) {
  const router = Router()

  const findWorkout = async (id: number, userId: number) => {
    const workout = await one(
      db,
      `SELECT id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM workouts WHERE id = $1 AND user_id = $2`,
      [id, userId],
    )
    if (!workout) throw notFound('Treino')

    const exercises = await many(
      db,
      `SELECT we.exercise_id AS "exerciseId", e.name, e.category, e.metric, we.position,
              we.sets, we.target_reps AS "targetReps", we.target_seconds AS "targetSeconds", we.notes
       FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
       WHERE we.workout_id = $1 ORDER BY we.position`,
      [id],
    )
    return { ...workout, exercises }
  }

  const replaceExercises = async (tx: Queryable, workoutId: number, input: WorkoutInput) => {
    await tx.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId])
    if (!input.exercises.length) return

    // Insere todos os itens de uma vez; a posição vem da ordem do array (0, 1, 2...).
    const column = <K extends keyof WorkoutInput['exercises'][number]>(key: K) =>
      input.exercises.map((item) => item[key] ?? null)
    await tx.query(
      `INSERT INTO workout_exercises (workout_id, exercise_id, position, sets, target_reps, target_seconds, notes)
       SELECT $1, t.exercise_id, t.ord - 1, t.sets, t.target_reps, t.target_seconds, t.notes
       FROM unnest($2::int[], $3::int[], $4::int[], $5::int[], $6::text[])
            WITH ORDINALITY AS t(exercise_id, sets, target_reps, target_seconds, notes, ord)`,
      [workoutId, column('exerciseId'), column('sets'), column('targetReps'), column('targetSeconds'), column('notes')],
    )
  }

  router.get('/', async (req, res) => {
    const workouts = await many(
      db,
      `SELECT w.id, w.name, w.description, w.created_at AS "createdAt", w.updated_at AS "updatedAt",
              COUNT(we.id)::int AS "exerciseCount"
       FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
       WHERE w.user_id = $1 GROUP BY w.id ORDER BY w.updated_at DESC, w.id DESC`,
      [currentUser(req)],
    )
    res.json(workouts)
  })

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await findWorkout(id, currentUser(req)))
  })

  router.post('/', async (req, res) => {
    const userId = currentUser(req)
    const body = parse(workoutSchema, req.body)
    await assertExercisesVisible(db, body.exercises.map((item) => item.exerciseId), userId)

    const id = await db.transaction(async (tx) => {
      const { id } = (await one<{ id: number }>(
        tx,
        'INSERT INTO workouts (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [userId, body.name, body.description ?? null],
      ))!
      await replaceExercises(tx, id, body)
      return id
    })
    res.status(201).json(await findWorkout(id, userId))
  })

  router.put('/:id', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(idParam, req.params)
    const body = parse(workoutSchema, req.body)
    await findWorkout(id, userId)
    await assertExercisesVisible(db, body.exercises.map((item) => item.exerciseId), userId)

    await db.transaction(async (tx) => {
      await tx.query('UPDATE workouts SET name = $1, description = $2, updated_at = now() WHERE id = $3', [
        body.name,
        body.description ?? null,
        id,
      ])
      await replaceExercises(tx, id, body)
    })
    res.json(await findWorkout(id, userId))
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { rowCount } = await db.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [id, currentUser(req)])
    if (!rowCount) throw notFound('Treino')
    res.status(204).end()
  })

  return router
}
