import { isStillReferenced, type Database, type Queryable } from '../../db/index.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import { parse } from '../../lib/validate.js'
import * as repository from './exercise.repository.js'
import { exerciseSchema, type ExerciseInput, type ExerciseQuery } from './exercise.schema.js'

const toExercise = ({ ownerId, ...exercise }: repository.ExerciseRow) => ({ ...exercise, custom: ownerId !== null })

export async function listExercises(db: Queryable, userId: number, query: ExerciseQuery) {
  return (await repository.listVisibleExercises(db, userId, query)).map(toExercise)
}

export async function getExercise(db: Queryable, userId: number, id: number) {
  const exercise = await repository.findVisibleExercise(db, id, userId)
  if (!exercise) throw notFound('Exercício')
  return toExercise(exercise)
}

async function requireOwned(tx: Queryable, userId: number, id: number) {
  const exercise = await repository.findVisibleExercise(tx, id, userId, true)
  if (!exercise) throw notFound('Exercício')
  if (exercise.ownerId !== userId) throw new HttpError(403, 'Exercícios do catálogo padrão não podem ser alterados')
}

export async function createExercise(db: Queryable, userId: number, input: ExerciseInput) {
  return toExercise(await repository.insertExercise(db, userId, input))
}

export async function updateExercise(db: Database, userId: number, id: number, input: unknown) {
  return db.transaction(async (tx) => {
    await requireOwned(tx, userId, id)
    // Preserva a precedência histórica: catálogo protegido/conta alheia antes do corpo.
    return toExercise(await repository.updateExercise(tx, id, userId, parse(exerciseSchema, input)))
  })
}

export async function deleteExercise(db: Database, userId: number, id: number) {
  try {
    await db.transaction(async (tx) => {
      await requireOwned(tx, userId, id)
      await repository.deleteExercise(tx, id, userId)
    })
  } catch (error) {
    if (isStillReferenced(error)) throw new HttpError(409, 'Exercício está em uso por treinos ou registros')
    throw error
  }
}
