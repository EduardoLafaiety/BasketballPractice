import { z } from 'zod'
import { dbId } from '../../lib/validate.js'
import { CATEGORIES, METRICS } from '../exercises/exercise.schema.js'
import { settingsSchema } from '../settings/settings.schema.js'
import { workoutExerciseSchema, workoutSchema } from '../workouts/workout.schema.js'

export const FORMAT = 'basketball-practice'
export const VERSION = 1

// Referência a um exercício no arquivo: o id vale para os exercícios exportados junto;
// os do catálogo padrão são achados pelo nome (os ids mudam de um banco para outro).
const exerciseRef = { exerciseId: dbId.nullish(), exerciseName: z.string().min(1).max(100) }

export const importSchema = z.object({
  format: z.literal(FORMAT),
  version: z.literal(VERSION),
  exercises: z
    .array(
      z.object({
        id: dbId,
        name: z.string().trim().min(2).max(100),
        category: z.enum(CATEGORIES),
        metric: z.enum(METRICS),
        description: z.string().trim().max(1000).nullish(),
      }),
    )
    .max(500)
    .default([]),
  workouts: z
    .array(
      workoutSchema.omit({ exercises: true }).extend({
        exercises: z.array(workoutExerciseSchema.omit({ exerciseId: true }).extend(exerciseRef)).max(50),
      }),
    )
    .max(500)
    .default([]),
  sessions: z
    .array(
      z
        .object({ workoutName: z.string().nullish(), entries: z.array(z.object(exerciseRef).passthrough()).max(100) })
        .passthrough(),
    )
    .max(20000)
    .default([]),
  settings: settingsSchema.optional(),
})

export type BackupInput = z.infer<typeof importSchema>
export interface BackupImportResult {
  created: { exercises: number; workouts: number; sessions: number }
  skipped: { sessions: number }
}
