import { Router } from 'express'
import { type Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'

import { settingsSchema, readSettings, writeSettings } from './settings.service.js'
export { settingsSchema, readSettings, writeSettings } from './settings.service.js'
export function settingsRouter(db: Database) {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json(await readSettings(db, currentUser(req)))
  })

  router.put('/', async (req, res) => {
    const settings = parse(settingsSchema, req.body)
    await writeSettings(db, currentUser(req), settings)
    res.json(settings)
  })

  return router
}
