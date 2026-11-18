import type { Style, CatalogRow } from './style.types.js'
import { WARMUP, COOLDOWN } from './style.catalog.js'

/** Divide 100% entre as categorias pelos minutos, sem perder pontos no arredondamento (maior resto). */
export function splitPercent(minutesByCategory: Record<string, number>) {
  const total = Object.values(minutesByCategory).reduce((sum, m) => sum + m, 0)
  if (!total) return {}
  const parts = Object.entries(minutesByCategory).map(([category, m]) => {
    const exact = (m * 100) / total
    return { category, value: Math.floor(exact), rest: exact - Math.floor(exact) }
  })
  let missing = 100 - parts.reduce((sum, p) => sum + p.value, 0)
  for (const part of [...parts].sort((a, b) => b.rest - a.rest)) {
    if (missing-- <= 0) break
    part.value++
  }
  return Object.fromEntries(parts.sort((a, b) => b.value - a.value).map((p) => [p.category, p.value]))
}

export function resolveStyle(style: Style, catalog: Map<string, CatalogRow>) {
  const find = (name: string) => {
    const row = catalog.get(name)
    return row ? { exerciseId: row.id, name: row.name, category: row.category, metric: row.metric } : null
  }
  const moves = style.moves.map(({ exercise, ...move }) => ({ ...move, exercise: find(exercise) }))
  // Nomes que sumiram do catálogo são ignorados, como nas rotinas prontas.
  const session = [WARMUP, ...style.moves, COOLDOWN].flatMap(({ exercise, dose, minutes }) => {
    const found = find(exercise)
    return found ? [{ ...found, dose, minutes }] : []
  })
  const minutesByCategory: Record<string, number> = {}
  for (const block of session) minutesByCategory[block.category] = (minutesByCategory[block.category] ?? 0) + block.minutes
  return { moves, session, mix: splitPercent(minutesByCategory) }
}

