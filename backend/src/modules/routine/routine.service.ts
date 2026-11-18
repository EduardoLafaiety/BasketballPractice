import type { Database } from '../../db/index.js'
import { assertExercisesVisible } from '../exercises/exercise.repository.js'
import { lockRoutineWeek, replaceRoutineDay } from './routine.repository.js'
import type { RoutineWeekInput } from './routine.schema.js'

/** Toda a semana é confirmada ou desfeita; a persistência continua compatível com os treinos existentes. */
export async function saveRoutineWeek(db: Database, userId: number, input: RoutineWeekInput) {
  return db.transaction(async (tx) => {
    await lockRoutineWeek(tx, userId)
    await assertExercisesVisible(tx, input.days.flatMap((day) => day.exercises.map((e) => e.exerciseId)), userId)
    const ids: Record<number, number> = {}
    for (const day of input.days) ids[day.day] = await replaceRoutineDay(tx, userId, day)
    return { ids }
  })
}
