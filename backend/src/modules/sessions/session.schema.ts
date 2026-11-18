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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

// "AAAA-MM-DD" vira a meia-noite local do cliente (tzOffset); um ISO com horário vale o instante exato.
function startOf(value: string, tzOffset: number) {
  const start = new Date(value)
  if (DATE_ONLY.test(value)) start.setTime(start.getTime() + tzOffset * 60_000)
  return start
}

// Fim exclusivo do intervalo: "AAAA-MM-DD" vale o dia local inteiro; um ISO com horário vale até aquele instante.
function exclusiveEnd(to: string, tzOffset: number) {
  const end = startOf(to, tzOffset)
  if (DATE_ONLY.test(to)) end.setUTCDate(end.getUTCDate() + 1)
  else end.setTime(end.getTime() + 1)
  return end.toISOString()
}

// Filtro por intervalo de datas (inclusivo) sobre practice_sessions com alias "s".
// Datas sem horário são dias no fuso do cliente (UTC se não vier tzOffset); com horário, o instante exato.
// `first` é o número do primeiro placeholder ($n) que o filtro pode usar.
export function dateRangeFilter(range: z.infer<typeof dateRangeQuery>, first: number) {
  const from = `$${first}::timestamptz`
  const to = `$${first + 1}::timestamptz`
  return {
    sql: `(${from} IS NULL OR s.performed_at >= ${from})
      AND (${to} IS NULL OR s.performed_at < ${to})`,
    params: [
      range.from ? startOf(range.from, range.tzOffset).toISOString() : null,
      range.to ? exclusiveEnd(range.to, range.tzOffset) : null,
    ],
  }
}
