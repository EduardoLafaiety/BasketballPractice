import { z } from 'zod'
import { dbId } from '../../lib/validate.js'

export const weekSchema = z.object({
  days: z.array(z.object({
    day: z.number().int().min(0).max(6),
    exercises: z.array(z.object({
      exerciseId: dbId,
      minutes: z.number().int().min(1).max(180),
    })).max(50),
  })).length(7).refine((days) => new Set(days.map((d) => d.day)).size === 7, 'Informe cada dia uma vez'),
})

export type RoutineWeekInput = z.infer<typeof weekSchema>
