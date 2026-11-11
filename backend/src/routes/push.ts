import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { one, type Database } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { runReminders, sendToUser, type PushSender } from '../lib/push.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

// Endereços dos serviços de push são sempre https e curtos; as chaves vêm em base64url.
const base64url = z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).max(200)
const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith('https://'), 'Endereço de push inválido'),
  keys: z.object({ p256dh: base64url, auth: base64url }),
  tzOffset: z.number().int().min(-840).max(840).default(0),
})
const MAX_SUBSCRIPTIONS = 10

export function pushRouter(db: Database, { publicKey, send }: { publicKey: string; send: PushSender | null }) {
  const router = Router()

  const requireEnabled = () => {
    if (!send) throw new HttpError(503, 'Os lembretes por notificação não estão ligados neste servidor')
    return send
  }

  router.get('/config', (_req, res) => {
    res.json({ enabled: !!send, publicKey: send ? publicKey : null })
  })

  // Inscreve este navegador. O mesmo navegador entrando com outra conta passa a ser dela.
  router.post('/subscriptions', async (req, res) => {
    requireEnabled()
    const userId = currentUser(req)
    const body = parse(subscriptionSchema, req.body)
    const { n } = (await one<{ n: number }>(db, 'SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE user_id = $1 AND endpoint <> $2', [userId, body.endpoint]))!
    if (n >= MAX_SUBSCRIPTIONS) throw new HttpError(400, `Limite de ${MAX_SUBSCRIPTIONS} aparelhos com lembrete`)
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, tz_offset) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, tz_offset = EXCLUDED.tz_offset`,
      [userId, body.endpoint, body.keys.p256dh, body.keys.auth, body.tzOffset],
    )
    res.status(201).json({ subscribed: true })
  })

  router.delete('/subscriptions', async (req, res) => {
    const { endpoint } = parse(z.object({ endpoint: z.string().max(1000) }), req.body)
    const { rowCount } = await db.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [currentUser(req), endpoint])
    if (!rowCount) throw notFound('Inscrição')
    res.status(204).end()
  })

  router.post('/test', async (req, res) => {
    const sent = await sendToUser(db, requireEnabled(), currentUser(req), {
      title: 'Hora do treino!',
      body: 'Assim chega o lembrete, mesmo com o app fechado.',
      url: '/configuracoes',
      tag: 'teste',
    })
    if (!sent) throw new HttpError(404, 'Nenhum aparelho inscrito para receber notificações')
    res.json({ sent })
  })

  return router
}

/**
 * POST /api/push/run para um agendador externo (cron) acordar a API e mandar os lembretes devidos.
 * O plano grátis do Render dorme sem visitas, e o agendador interno para junto. Protegido por PUSH_CRON_SECRET.
 */
export function pushCronRouter(db: Database, { secret, send }: { secret: string; send: PushSender | null }) {
  const router = Router()
  router.post('/', async (req, res) => {
    const given = Buffer.from(String(req.headers['x-cron-secret'] ?? ''))
    const expected = Buffer.from(secret)
    if (!secret || !send || given.length !== expected.length || !timingSafeEqual(given, expected)) throw notFound('Rota')
    res.json(await runReminders(db, send))
  })
  return router
}
