import { Router } from 'express'
import { z } from 'zod'
import { isStillReferenced, many, one, type Database, type Queryable } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { idParam, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

export const CATEGORIES = ['arremesso', 'drible', 'passe', 'finalizacao', 'defesa', 'condicionamento'] as const
export const METRICS = ['acertos', 'repeticoes', 'tempo'] as const

const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(CATEGORIES),
  metric: z.enum(METRICS),
  description: z.string().trim().max(1000).nullish(),
})

const listQuery = z.object({ category: z.enum(CATEGORIES).optional() })

type ExerciseRow = {
  id: number
  name: string
  category: string
  metric: string
  description: string | null
  ownerId: number | null
}

const COLUMNS = `id, name, category, metric, description, user_id AS "ownerId"`

const toExercise = ({ ownerId, ...exercise }: ExerciseRow) => ({ ...exercise, custom: ownerId !== null })

// Exercícios visíveis ao usuário: catálogo padrão + os que ele criou.
function findVisibleExercise(db: Queryable, id: number, userId: number) {
  return one<ExerciseRow>(
    db,
    `SELECT ${COLUMNS} FROM exercises WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
    [id, userId],
  )
}

// Garante que todos os exercícios existem e são visíveis ao usuário, em uma única consulta.
export async function assertExercisesVisible(db: Queryable, ids: number[], userId: number) {
  const unique = [...new Set(ids)]
  if (!unique.length) return

  const found = await many<{ id: number }>(
    db,
    'SELECT id FROM exercises WHERE id = ANY($1::int[]) AND (user_id IS NULL OR user_id = $2)',
    [unique, userId],
  )
  const visible = new Set(found.map((row) => row.id))
  const missing = unique.find((id) => !visible.has(id))
  if (missing !== undefined) throw new HttpError(400, `Exercício ${missing} não existe`)
}

export function exercisesRouter(db: Database) {
  const router = Router()

  const findOwned = async (id: number, userId: number) => {
    const exercise = await findVisibleExercise(db, id, userId)
    if (!exercise) throw notFound('Exercício')
    if (exercise.ownerId !== userId) throw new HttpError(403, 'Exercícios do catálogo padrão não podem ser alterados')
    return exercise
  }

  router.get('/', async (req, res) => {
    const { category } = parse(listQuery, req.query)
    const rows = await many<ExerciseRow>(
      db,
      `SELECT ${COLUMNS} FROM exercises
       WHERE (user_id IS NULL OR user_id = $1) AND ($2::text IS NULL OR category = $2)
       ORDER BY category, name`,
      [currentUser(req), category ?? null],
    )
    res.json(rows.map(toExercise))
  })

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const exercise = await findVisibleExercise(db, id, currentUser(req))
    if (!exercise) throw notFound('Exercício')
    res.json(toExercise(exercise))
  })

  router.post('/', async (req, res) => {
    const body = parse(exerciseSchema, req.body)
    const exercise = await one<ExerciseRow>(
      db,
      `INSERT INTO exercises (user_id, name, category, metric, description) VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [currentUser(req), body.name, body.category, body.metric, body.description ?? null],
    )
    res.status(201).json(toExercise(exercise!))
  })

  router.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await findOwned(id, currentUser(req))
    const body = parse(exerciseSchema, req.body)

    const exercise = await one<ExerciseRow>(
      db,
      `UPDATE exercises SET name = $1, category = $2, metric = $3, description = $4 WHERE id = $5
       RETURNING ${COLUMNS}`,
      [body.name, body.category, body.metric, body.description ?? null, id],
    )
    res.json(toExercise(exercise!))
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await findOwned(id, currentUser(req))

    // As FKs com ON DELETE RESTRICT barram a exclusão de exercícios em uso, sem corrida entre checar e apagar.
    try {
      await db.query('DELETE FROM exercises WHERE id = $1', [id])
    } catch (error) {
      if (isStillReferenced(error)) {
        throw new HttpError(409, 'Exercício está em uso por treinos ou registros')
      }
      throw error
    }
    res.status(204).end()
  })

  return router
}
