import type { SessionDateRangeQuery } from './session.schema.js'

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
export function dateRangeFilter(range: SessionDateRangeQuery, first: number) {
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
