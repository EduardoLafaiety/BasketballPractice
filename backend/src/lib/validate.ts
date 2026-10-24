import { z, type ZodTypeAny } from 'zod'
import { HttpError } from './http-error.js'

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new HttpError(400, 'Dados inválidos', result.error.flatten().fieldErrors)
  }
  return result.data
}

export const idParam = z.object({ id: z.coerce.number().int().positive() })

// Confere se o dia existe no calendário: o Date.parse aceita "2026-02-31" e vira 3 de março.
function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

// Aceita "2026-10-23" ou um ISO completo.
export const isoDate = z
  .string()
  .refine((value) => isCalendarDate(value) && !Number.isNaN(Date.parse(value)), 'Data inválida')
