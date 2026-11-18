import assert from 'node:assert/strict'
import { it } from 'node:test'
import { createPushService, dueReminders, runReminders, sendToUser } from '../src/modules/push/push.service.js'
import { startApi } from './http.js'
import { startReminderScheduler } from '../src/modules/push/push.scheduler.js'
import type { Queryable } from '../src/db/index.js'

const NOW = new Date('2026-11-10T21:05:00Z')
const subscription = (suffix: string) => ({ endpoint: `https://push.exemplo.com/${suffix}`, keys: { p256dh: 'chave_publica', auth: 'segredo' }, tzOffset: 180 })
const enabled = { reminders: { enabled: true, time: '18:00', days: [2] } }

it('um provedor sem resposta tem espera limitada e não bloqueia o serviço indefinidamente', async (t) => {
  const db: Queryable = { query: async <T>() => ({ rows: [{ id: 1, endpoint: 'https://push.exemplo.com/lento', p256dh: 'chave', auth: 'segredo' }] as T[], rowCount: 1 }) }
  let signal!: () => void
  const started = new Promise<void>((resolve) => { signal = resolve })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const sending = sendToUser(db, () => { signal(); return new Promise(() => {}) }, 1, { title: 'Teste', body: 'Teste' })
  await started
  t.mock.timers.tick(15_000)
  assert.equal(await sending, 0)
})

it('preferências inválidas de uma conta não derrubam os lembretes das outras', async () => {
  const { db, register, api } = await startApi()
  const a = await register(), b = await register()
  const push = createPushService(db, { publicKey: 'teste', send: async () => 'ok' })
  await push.subscribe(a.id, subscription('valida'))
  await push.subscribe(b.id, subscription('corrompida'))
  await api('PUT', '/settings', enabled, a.token)
  await api('PUT', '/settings', enabled, b.token)
  await db.query('UPDATE user_settings SET data = $1::jsonb WHERE user_id = $2', [JSON.stringify({ reminders: { enabled: 'inválido', days: 'inválido' } }), b.id])
  assert.deepEqual((await dueReminders(db, NOW)).map((s) => s.userId), [a.id])
})

it('resposta gone atrasada não apaga inscrição transferida ou renovada', async () => {
  const { db, register } = await startApi()
  const a = await register(), b = await register()
  const push = createPushService(db, { publicKey: 'teste', send: async () => 'ok' })
  const item = subscription('transferida')
  await push.subscribe(a.id, item)
  await sendToUser(db, async () => { await push.subscribe(b.id, item); return 'gone' }, a.id, { title: 'Teste', body: 'Teste' })
  assert.equal((await db.query<{ userId: number }>('SELECT user_id AS "userId" FROM push_subscriptions WHERE endpoint = $1', [item.endpoint])).rows[0].userId, b.id)
  const renewed = { ...item, keys: { p256dh: 'chave_nova', auth: 'segredo_novo' } }
  await sendToUser(db, async () => { await push.subscribe(b.id, renewed); return 'gone' }, b.id, { title: 'Teste', body: 'Teste' })
  assert.equal((await db.query<{ auth: string }>('SELECT auth FROM push_subscriptions WHERE endpoint = $1', [item.endpoint])).rows[0].auth, renewed.keys.auth)
})

it('falha de provedor preserva nova tentativa; sucesso marca a data e inscrição cancelada sai', async () => {
  const { db, register, api } = await startApi()
  const user = await register()
  const push = createPushService(db, { publicKey: 'teste', send: async () => 'ok' })
  await push.subscribe(user.id, subscription('retentativa'))
  await api('PUT', '/settings', enabled, user.token)
  assert.deepEqual(await runReminders(db, async () => { throw new Error('Provedor indisponível') }, NOW), { due: 1, sent: 0 })
  assert.equal((await dueReminders(db, NOW)).length, 1)
  assert.deepEqual(await runReminders(db, async () => 'ok', NOW), { due: 1, sent: 1 })
  assert.equal((await dueReminders(db, NOW)).length, 0)
  await push.subscribe(user.id, subscription('cancelada'))
  assert.deepEqual(await runReminders(db, async () => 'gone', NOW), { due: 1, sent: 0 })
  assert.equal((await db.query('SELECT id FROM push_subscriptions WHERE endpoint = $1', [subscription('cancelada').endpoint])).rows.length, 0)
})

it('encerrar o agendador aguarda o envio em andamento e preserva os aparelhos restantes', { timeout: 20_000 }, async () => {
  const { db, register, api } = await startApi()
  const user = await register()
  const push = createPushService(db, { publicKey: 'teste', send: async () => 'ok' })
  await push.subscribe(user.id, subscription('encerrar-a'))
  await push.subscribe(user.id, subscription('encerrar-b'))
  await api('PUT', '/settings', enabled, user.token)
  let signal!: () => void
  let release!: () => void
  const started = new Promise<void>((resolve) => { signal = resolve })
  const gate = new Promise<void>((resolve) => { release = resolve })
  let calls = 0
  const stop = startReminderScheduler(db, async () => { calls++; signal(); await gate; return 'ok' }, 60_000, () => NOW)
  try {
    await started
    let finished = false
    const stopping = stop().then(() => { finished = true })
    await Promise.resolve()
    assert.equal(finished, false)
    release()
    await stopping
    assert.equal(calls, 1)
    assert.equal((await dueReminders(db, NOW)).length, 1)
  } finally { release(); await stop() }
})
