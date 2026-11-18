import type { Queryable } from '../../db/index.js'
import { notFound } from '../../lib/http-error.js'
import { STYLES } from './style.catalog.js'
import { resolveStyle } from './style.model.js'
import { loadCatalog } from './style.repository.js'

export async function listStyles(db: Queryable) {
  const catalog = await loadCatalog(db)
  return STYLES.map((style) => {
    const { session, mix } = resolveStyle(style, catalog)
    return { id: style.id, name: style.name, group: style.group, archetype: style.archetype,
      moveCount: style.moves.length, minutes: session.reduce((sum, block) => sum + block.minutes, 0), mix }
  })
}

export async function getStyle(db: Queryable, id: string) {
  const style = STYLES.find((s) => s.id === id)
  if (!style) throw notFound('Estilo')
  const { moves, session, mix } = resolveStyle(style, await loadCatalog(db))
  return { ...style, moves, session, mix, minutes: session.reduce((sum, block) => sum + block.minutes, 0) }
}
