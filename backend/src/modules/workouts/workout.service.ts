import type { Database, Queryable } from '../../db/index.js'
import { notFound } from '../../lib/http-error.js'
import { assertExercisesVisible } from '../exercises/exercise.repository.js'
import * as repository from './workout.repository.js'
import type { WorkoutInput } from './workout.schema.js'

export async function getWorkout(db: Queryable, userId: number, id: number) {
  const workout = await repository.findWorkout(db, id, userId)
  if (!workout) throw notFound('Treino')
  return { ...workout, exercises: await repository.workoutExercises(db, id) }
}

export const listWorkouts = repository.listWorkouts

export async function createWorkout(db: Database, userId: number, input: WorkoutInput) {
  return db.transaction(async (tx) => {
    await assertExercisesVisible(tx, input.exercises.map((item) => item.exerciseId), userId)
    const id = await repository.insertWorkout(tx, userId, input)
    await repository.replaceWorkoutExercises(tx, id, input.exercises)
    return getWorkout(tx, userId, id)
  })
}

export async function updateWorkout(db: Database, userId: number, id: number, input: WorkoutInput) {
  return db.transaction(async (tx) => {
    if (!await repository.findWorkout(tx, id, userId, true)) throw notFound('Treino')
    await assertExercisesVisible(tx, input.exercises.map((item) => item.exerciseId), userId)
    await repository.updateWorkout(tx, id, userId, input)
    await repository.replaceWorkoutExercises(tx, id, input.exercises)
    return getWorkout(tx, userId, id)
  })
}

export async function deleteWorkout(db: Queryable, userId: number, id: number) {
  if (!await repository.deleteWorkout(db, id, userId)) throw notFound('Treino')
}
