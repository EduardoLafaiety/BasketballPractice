import { z } from 'zod'
import { LEVELS } from '../../db/catalog.js'
import { CATEGORIES } from '../exercises/exercise.schema.js'
export const generateSchema = z.object({
  minutes: z.number().int().min(10).max(180),
  focus: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length).default([]),
  level: z.enum(LEVELS).optional(),
  warmup: z.boolean().default(true),
  seed: z.number().int().optional(),
  // Exercícios a evitar (a rotina semanal passa os já usados nos outros dias); só se repetem se não houver outro da categoria.
  exclude: z.array(z.number().int()).max(500).default([]),
})

export type GenerateInput = z.infer<typeof generateSchema>
