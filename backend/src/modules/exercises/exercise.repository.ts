import { many, one, type Queryable } from '../../db/index.js'
import { HttpError } from '../../lib/http-error.js'
import type { ExerciseInput, ExerciseQuery } from './exercise.schema.js'
import type { ExerciseApi } from '../../../../contracts/api.js'

export interface ExerciseRow extends Omit<ExerciseApi, 'custom'> {
  level: NonNullable<ExerciseApi['level']> | null; warmup: boolean; position: number | null; ownerId: number | null
}

const COLUMNS = `id, name, category, metric, description, level, warmup, position, user_id AS "ownerId"`

export function findVisibleExercise(db: Queryable, id: number, userId: number, lock = false) {
  return one<ExerciseRow>(db,
    `SELECT ${COLUMNS} FROM exercises WHERE id = $1 AND (user_id IS NULL OR user_id = $2)${lock ? ' FOR UPDATE' : ''}`,
    [id, userId])
}

export function listVisibleExercises(db: Queryable, userId: number, { category, level }: ExerciseQuery) {
  return many<ExerciseRow>(db,
    `SELECT ${COLUMNS} FROM exercises
     WHERE (user_id IS NULL OR user_id = $1) AND ($2::text IS NULL OR category = $2) AND ($3::text IS NULL OR level = $3)
     ORDER BY category, name`, [userId, category ?? null, level ?? null])
}

export async function insertExercise(db: Queryable, userId: number, input: ExerciseInput) {
  return (await one<ExerciseRow>(db,
    `INSERT INTO exercises (user_id, name, category, metric, description) VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
    [userId, input.name, input.category, input.metric, input.description ?? null]))!
}

export async function updateExercise(tx: Queryable, id: number, userId: number, input: ExerciseInput) {
  return (await one<ExerciseRow>(tx,
    `UPDATE exercises SET name = $1, category = $2, metric = $3, description = $4 WHERE id = $5 AND user_id = $6 RETURNING ${COLUMNS}`,
    [input.name, input.category, input.metric, input.description ?? null, id, userId]))!
}

export async function deleteExercise(tx: Queryable, id: number, userId: number) {
  return (await tx.query('DELETE FROM exercises WHERE id = $1 AND user_id = $2', [id, userId])).rowCount
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
