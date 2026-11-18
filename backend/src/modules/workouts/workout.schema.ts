import { z } from 'zod'
import { dbId } from '../../lib/validate.js'
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

export type WorkoutInput = z.infer<typeof workoutSchema>
