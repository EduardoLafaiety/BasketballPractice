import { timingSafeEqual } from 'node:crypto'
import type { Database, Queryable } from '../../db/index.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import { parse } from '../../lib/validate.js'
import { reminderDue, type DueReminder } from './push.model.js'
import { MAX_SUBSCRIPTIONS, subscriptionSchema } from './push.schema.js'
import * as repository from './push.repository.js'
import type { PushMessage, PushSender, PushSubscriptionRow } from './push.types.js'

async function deliver(send: PushSender, subscription: PushSubscriptionRow, message: PushMessage) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      send(subscription, message),
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Tempo limite no envio da notificação')), 15_000) }),
    ])
  } finally { if (timer !== undefined) clearTimeout(timer) }
}

export async function sendToUser(db: Queryable, send: PushSender, userId: number, message: PushMessage) {
  const subscriptions = await repository.subscriptionsForUser(db, userId)
  let sent = 0
  for (const s of subscriptions) {
    try {
      if (await deliver(send, s, message) === 'gone') await repository.removeUnchangedSubscription(db, userId, s)
      else sent++
    } catch (error) { console.warn('[push] envio falhou', (error as Error).message) }
  }
  return sent
}

export async function dueReminders(db: Queryable, now = new Date(), ids?: number[], lock = false) {
  const rows = await repository.reminderCandidates(db, ids, lock)
  const due: DueReminder[] = rows.flatMap((row) => { const item = reminderDue(row, now); return item ? [item] : [] })
  if (!due.length) return due
  const trained = await repository.trainedSubscriptionIds(db, due.map((s) => s.id), now)
  const skip = new Set(trained.map((s) => s.id))
  return due.filter((s) => !skip.has(s.id))
}

/** Cada aparelho é revalidado sob trava, inclusive entre cron externo e agendador interno. */
export async function runReminders(db: Database, send: PushSender, now = new Date(), active = () => true) {
  const due = await dueReminders(db, now)
  let sent = 0
  for (const snapshot of due) {
    if (!active()) break
    try {
      const delivered = await db.transaction(async (tx) => {
        if (!await repository.tryLockReminder(tx, snapshot.id)) return false
        const current = (await dueReminders(tx, now, [snapshot.id], true))[0]
        if (!current || current.userId !== snapshot.userId) return false
        const result = await deliver(send, current, { title: 'Hora do treino!', body: 'Sua sessão de hoje ainda não foi registrada. Bora pra quadra?', url: '/', tag: 'lembrete' })
        if (result === 'gone') { await repository.removeUnchangedSubscription(tx, current.userId, current); return false }
        await repository.markReminder(tx, current.id, current.localDay)
        return true
      })
      if (delivered) sent++
    } catch (error) { console.warn('[push] lembrete não enviado', (error as Error).message) }
  }
  return { due: due.length, sent }
}

export function createPushService(db: Database, { publicKey, send }: { publicKey: string; send: PushSender | null }) {
  const requireEnabled = () => {
    if (!send) throw new HttpError(503, 'Os lembretes por notificação não estão ligados neste servidor')
    return send
  }
  return {
    configuration: () => ({ enabled: !!send, publicKey: send ? publicKey : null }),
    async subscribe(userId: number, input: unknown) {
      requireEnabled()
      const body = parse(subscriptionSchema, input)
      await db.transaction(async (tx) => {
        await repository.lockSubscriptions(tx, userId)
        if (await repository.countOtherSubscriptions(tx, userId, body.endpoint) >= MAX_SUBSCRIPTIONS) {
          throw new HttpError(400, `Limite de ${MAX_SUBSCRIPTIONS} aparelhos com lembrete`)
        }
        await repository.saveSubscription(tx, userId, body)
      })
      return { subscribed: true }
    },
    async unsubscribe(userId: number, endpoint: string) {
      if (!await repository.unsubscribe(db, userId, endpoint)) throw notFound('Inscrição')
    },
    async test(userId: number) {
      const sent = await sendToUser(db, requireEnabled(), userId,
        { title: 'Hora do treino!', body: 'Assim chega o lembrete, mesmo com o app fechado.', url: '/configuracoes', tag: 'teste' })
      if (!sent) throw new HttpError(404, 'Nenhum aparelho inscrito para receber notificações')
      return { sent }
    },
  }
}

export async function runScheduledReminders(db: Database, send: PushSender | null, secret: string, given: string) {
  const expected = Buffer.from(secret), supplied = Buffer.from(given)
  if (!secret || !send || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw notFound('Rota')
  return runReminders(db, send)
}
