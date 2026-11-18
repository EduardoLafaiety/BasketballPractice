import { z } from 'zod'

const base64url = z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).max(200)
export const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith('https://'), 'Endereço de push inválido'),
  keys: z.object({ p256dh: base64url, auth: base64url }),
  tzOffset: z.number().int().min(-840).max(840).default(0),
})
export const unsubscribeSchema = z.object({ endpoint: z.string().max(1000) })
export type SubscriptionInput = z.infer<typeof subscriptionSchema>
export const MAX_SUBSCRIPTIONS = 10
