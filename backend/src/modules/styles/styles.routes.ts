import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { styleParam } from './style.schema.js'
import { getStyle, listStyles } from './style.service.js'
// Compatibilidade com a verificação de fotos existente, até a etapa de frontend.
export { STYLES } from './style.catalog.js'

const CACHE = 'private, max-age=300'
export function stylesRouter(db: Database) {
  const router = Router()
  router.get('/', async (_req, res) => {
    const styles = await listStyles(db)
    res.setHeader('Cache-Control', CACHE)
    res.json(styles)
  })
  router.get('/:id', async (req, res) => {
    const { id } = parse(styleParam, req.params)
    const style = await getStyle(db, id)
    res.setHeader('Cache-Control', CACHE)
    res.json(style)
  })
  return router
}
