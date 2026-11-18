import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { unsubscribeSchema } from './push.schema.js'
import { createPushService, runScheduledReminders } from './push.service.js'
import type { PushSender } from './push.types.js'

export function pushRouter(db: Database, options: { publicKey: string; send: PushSender | null }) {
  const router = Router()
  const push = createPushService(db, options)
  router.get('/config', (_req, res) => { res.json(push.configuration()) })
  router.post('/subscriptions', async (req, res) => {
    res.status(201).json(await push.subscribe(currentUser(req), req.body))
  })
  router.delete('/subscriptions', async (req, res) => {
    const { endpoint } = parse(unsubscribeSchema, req.body)
    await push.unsubscribe(currentUser(req), endpoint)
    res.status(204).end()
  })
  router.post('/test', async (req, res) => { res.json(await push.test(currentUser(req))) })
  return router
}

export function pushCronRouter(db: Database, { secret, send }: { secret: string; send: PushSender | null }) {
  const router = Router()
  router.post('/', async (req, res) => {
    res.json(await runScheduledReminders(db, send, secret, String(req.headers['x-cron-secret'] ?? '')))
  })
  return router
}
