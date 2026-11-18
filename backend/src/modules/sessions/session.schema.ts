import { z } from 'zod'
import { dbId, isoDate, MAX_INT } from '../../lib/validate.js'
const count = z.number().int().min(0).max(100000).nullish()

// Zonas da meia-quadra usadas no shot chart: garrafão, lance livre, 5 de média e 5 de três.
export const ZONES = [
  'garrafao',
  'lance_livre',
  'media_canto_e',
  'media_ala_e',
  'media_topo',
  'media_ala_d',
  'media_canto_d',
  'tres_canto_e',
  'tres_ala_e',
  'tres_topo',
  'tres_ala_d',
  'tres_canto_d',
] as const

const shotSchema = z
  .object({
    zone: z.enum(ZONES),
    makes: z.number().int().min(0).max(100000),
    attempts: z.number().int().min(0).max(100000),
  })
  .refine((shot) => shot.makes <= shot.attempts, {
    message: 'Acertos não podem ser maiores que tentativas',
    path: ['makes'],
  })

const entrySchema = z
  .object({
    exerciseId: dbId,
    attempts: count,
    makes: count,
    reps: count,
    seconds: count,
    bestStreak: count,
    notes: z.string().trim().max(500).nullish(),
  })
  .refine((entry) => entry.makes == null || entry.attempts == null || entry.makes <= entry.attempts, {
    message: 'Acertos não podem ser maiores que tentativas',
    path: ['makes'],
  })
  .refine((entry) => entry.bestStreak == null || entry.makes == null || entry.bestStreak <= entry.makes, {
    message: 'A sequência não pode passar do número de acertos',
    path: ['bestStreak'],
  })

export const sessionSchema = z.object({
  workoutId: dbId.nullish(),
  performedAt: isoDate.transform((value) => new Date(value).toISOString()),
  durationMinutes: z.number().int().min(1).max(1440).nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  fatigue: z.number().int().min(1).max(5).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  entries: z.array(entrySchema).max(100).default([]),
  shots: z
    .array(shotSchema)
    .max(ZONES.length)
    .refine((shots) => new Set(shots.map((shot) => shot.zone)).size === shots.length, 'Zona repetida')
    .default([]),
})

export const createSessionSchema = sessionSchema.extend({
  clientId: z.string().uuid().optional(),
  program: z.object({ id: z.string().max(60), day: z.number().int().min(1).max(366) }).optional(),
  tzOffset: z.number().int().min(-840).max(840).default(0),
})

// Diferença do fuso do cliente em minutos, no formato de Date.getTimezoneOffset() (Brasília = 180).
// Sem ela, "dia" e "semana" seriam contados em UTC e um treino às 22h cairia no dia seguinte.
export const tzQuery = z.object({ tzOffset: z.coerce.number().int().min(-840).max(840).default(0) })

export const dateRangeQuery = tzQuery.extend({
  from: isoDate.optional(),
  to: isoDate.optional(),
})

export const listQuery = dateRangeQuery.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(MAX_INT).default(0),
})

export type SessionInput = z.infer<typeof sessionSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type SessionListQuery = z.infer<typeof listQuery>

export type SessionDateRangeQuery = z.infer<typeof dateRangeQuery>

export const comparisonQuery = tzQuery.extend({
  days: z.coerce.number().refine((n) => n === 7 || n === 30).default(7),
  exerciseId: z.coerce.number().int().positive().max(MAX_INT).optional(),
})

export type SessionComparisonQuery = z.infer<typeof comparisonQuery>
