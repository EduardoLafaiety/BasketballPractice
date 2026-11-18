import { many, type Queryable } from '../../db/index.js'
import type { CatalogRow } from './style.types.js'

export async function loadCatalog(db: Queryable) {
  const rows = await many<CatalogRow>(db, 'SELECT id, name, category, metric FROM exercises WHERE user_id IS NULL ORDER BY id')
  return new Map(rows.map((row) => [row.name, row]))
}
