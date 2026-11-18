import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { importSchema } from './backup.schema.js'
import { BackupImportBusyError, createBackupService } from './backup.service.js'

export function dataRouter(db: Database, options: { maxImports?: number } = {}) {
  const router = Router()
  const backups = createBackupService(db, options)
  router.get('/export', async (req, res) => {
    const data = await backups.exportBackup(currentUser(req))
    res.setHeader('Content-Disposition', 'attachment; filename="basketball-practice-' + data.exportedAt.slice(0, 10) + '.json"')
    res.json(data)
  })
  router.post('/import', async (req, res) => {
    const data = parse(importSchema, req.body)
    try { res.json(await backups.importBackup(currentUser(req), data)) }
    catch (error) {
      if (error instanceof BackupImportBusyError) res.setHeader('Retry-After', String(error.retryAfter))
      throw error
    }
  })
  return router
}
