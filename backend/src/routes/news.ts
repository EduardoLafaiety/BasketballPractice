import { Router } from 'express'
import type { Database } from '../db/index.js'
import { listNews } from '../lib/news.js'

export function newsRouter(db: Database) {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json(await listNews(db))
  })

  return router
}
