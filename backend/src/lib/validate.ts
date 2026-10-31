import { z, type ZodTypeAny } from 'zod'
import { HttpError } from './http-error.js'

// O maior backup que cabe nos 10 MB da importação tem bem menos itens que isto. Sem este teto, o Zod valida cada item
// de um array acima do .max() e guarda um erro por item: 5 milhões de zeros travam a API por 5 s e custam 2 GB.
export const MAX_ARRAY_ITEMS = 250_000

/**
 * Recusa o que nenhum schema deveria receber. O Postgres não guarda o caractere nulo em texto.
 * Sem recursão: o corpo pode vir aninhado a milhares de níveis.
 */
function assertSafeInput(data: unknown) {
  const pending: [value: unknown, field: string][] = [[data, 'corpo']]
  let items = 0
  for (let item = pending.pop(); item; item = pending.pop()) {
    const [value, field] = item
    if (typeof value === 'string' && value.includes('\u0000')) {
      throw new HttpError(400, 'Dados inválidos', { [field]: ['Caractere inválido'] })
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) items += value.length
      if (items > MAX_ARRAY_ITEMS) throw new HttpError(400, 'Dados inválidos', { [field]: ['Itens demais'] })
      for (const [key, child] of Object.entries(value)) pending.push([child, field === 'corpo' ? key : field])
    }
  }
}

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  assertSafeInput(data)

  const result = schema.safeParse(data)
  if (!result.success) {
    throw new HttpError(400, 'Dados inválidos', result.error.flatten().fieldErrors)
  }
  return result.data
}

// Maior valor de uma coluna integer: acima disso, o Postgres recusa o parâmetro e o pedido viraria erro 500.
export const MAX_INT = 2_147_483_647

/** Id que cabe na coluna do banco, vindo do corpo. */
export const dbId = z.number().int().positive().max(MAX_INT)

export const idParam = z.object({ id: z.coerce.number().int().positive().max(MAX_INT) })

// Confere se o dia existe no calendário: o Date.parse aceita "2026-02-31" e vira 3 de março.
function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const MIN_DATE = Date.UTC(1900, 0, 1)
const MAX_DATE = Date.UTC(2101, 0, 1)

// O fuso e o "fim do dia" empurram a data em algumas horas: longe dos extremos, o ano sempre cabe no Postgres.
const isInRange = (value: string) => {
  const time = Date.parse(value)
  return time >= MIN_DATE && time < MAX_DATE
}

// Aceita "2026-10-23" ou um ISO completo, de 1900 a 2100.
export const isoDate = z.string().refine((value) => isCalendarDate(value) && isInRange(value), 'Data inválida')
