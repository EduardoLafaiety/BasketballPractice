import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { parse } from '../../lib/validate.js'
import { HttpError } from '../../lib/http-error.js'
import { currentUser } from '../../middleware/auth.js'
import type { BillingService } from './billing.service.js'
import { validWebhook } from './mercado-pago.js'

export const requireBillingAccess = (service: BillingService): RequestHandler => async (req, _res, next) => {
  if (!(await service.access(currentUser(req))).hasAccess) throw new HttpError(402, 'Uma assinatura ativa é necessária para acessar os treinos.')
  next()
}

export function billingRouter(service: BillingService) {
  const router = Router()
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() })
  router.get('/status', async (req, res) => { res.json(await service.status(currentUser(req))) })
  router.post('/checkout', async (req, res) => {
    const { plan } = parse(z.object({ plan: z.enum(['mensal', 'anual']) }).strict(), req.body)
    res.json(await service.checkout(currentUser(req), plan))
  })
  router.post('/refresh', async (req, res) => { res.json(await service.refresh(currentUser(req))) })
  router.post('/cancel', async (req, res) => { res.json(await service.cancel(currentUser(req))) })
  return router
}

export function billingWebhook(service: BillingService) {
  const router = Router()
  router.post('/', async (req, res) => {
    const id = req.query['data.id']
    const bodyId = req.body?.data?.id
    if (typeof id !== 'string' || (bodyId !== undefined && String(bodyId).toLowerCase() !== id.toLowerCase()) ||
      !validWebhook(service.options.webhookSecret, req.get('x-signature') ?? '', req.get('x-request-id') ?? '', id)) throw new HttpError(401, 'Notificação de pagamento inválida.')
    const type = String(req.body?.type ?? req.query.type ?? '')
    // Só reconhece o evento depois de persistir o estado: falhas recebem retry do MP.
    await service.webhook(type, id)
    res.status(200).json({ received: true })
  })
  return router
}
