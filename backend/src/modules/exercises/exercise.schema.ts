import { z } from 'zod'
import { LEVELS } from '../../db/catalog.js'
export const CATEGORIES = ['arremesso', 'drible', 'passe', 'finalizacao', 'defesa', 'condicionamento'] as const
export const METRICS = ['acertos', 'repeticoes', 'tempo'] as const

export const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(CATEGORIES),
  metric: z.enum(METRICS),
  description: z.string().trim().max(1000).nullish(),
})

export const listQuery = z.object({ category: z.enum(CATEGORIES).optional(), level: z.enum(LEVELS).optional() })
export type ExerciseInput = z.infer<typeof exerciseSchema>
export type ExerciseQuery = z.infer<typeof listQuery>
