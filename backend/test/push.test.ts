import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dueReminders, runReminders, type PushMessage, type PushSubscriptionRow } from '../src/lib/push.js'
import { startApi } from './http.js'

/** Envio falso: guarda cada mensagem; endpoints em `cancelados` respondem como inscrição cancelada (410). */
function envioFalso() {
  const enviados: { endpoint: string; message: PushMessage }[] = []
  const cancelados = new Set<string>()
  const send = async (s: PushSubscriptionRow, message: PushMessage) => {
    if (cancelados.has(s.endpoint)) return 'gone' as const
    enviados.push({ endpoint: s.endpoint, message })
    return 'ok' as const
  }
  return { send, enviados, cancelados }
}

const falso = envioFalso()
const { api, db, register, baseUrl } = await startApi({ push: { publicKey: 'chave-publica-vapid', send: falso.send, cronSecret: 'segredo-do-cron' } })

let n = 0
const inscricao = (extra: object = {}) => ({
  endpoint: `https://push.exemplo.com/envio/${++n}`,
  keys: { p256dh: 'BNc1Lk_chave-p256dh', auth: 'segredo_auth' },
  tzOffset: 180,
  ...extra,
})

const lembrete = (token: string, time = '18:00', days = [0, 1, 2, 3, 4, 5, 6]) =>
  api('PUT', '/settings', { theme: 'sistema', reminders: { enabled: true, time, days }, metronomeBpm: 90 }, token)

// Terça, 10/11/2026, 18h05 em Brasília (tzOffset 180).
const TERCA_18H05 = new Date('2026-11-10T21:05:00Z')

describe('Web Push: inscrições', () => {
  it('informa a chave pública e inscreve o navegador', async () => {
    const { token } = await register()
    assert.deepEqual((await api('GET', '/push/config', undefined, token)).body, { enabled: true, publicKey: 'chave-publica-vapid' })
    assert.equal((await api('POST', '/push/subscriptions', inscricao(), token)).status, 201)

    for (const ruim of [inscricao({ endpoint: 'http://inseguro.com/x' }), inscricao({ endpoint: 'nao-e-url' }), inscricao({ keys: { p256dh: 'com espaço', auth: 'x' } }), inscricao({ tzOffset: 9999 })]) {
      assert.equal((await api('POST', '/push/subscriptions', ruim, token)).status, 400, JSON.stringify(ruim))
    }
  })

  it('a notificação de teste chega a todos os aparelhos; inscrição cancelada some', async () => {
    const { token, id } = await register()
    const a = inscricao()
    const b = inscricao()
    await api('POST', '/push/subscriptions', a, token)
    await api('POST', '/push/subscriptions', b, token)
    falso.cancelados.add(b.endpoint)

    const teste = await api('POST', '/push/test', undefined, token)
    assert.equal(teste.status, 200)
    assert.equal(teste.body.sent, 1)
    assert.ok(falso.enviados.some((e) => e.endpoint === a.endpoint && e.message.title === 'Hora do treino!'))
    const { rows } = await db.query<{ endpoint: string }>('SELECT endpoint FROM push_subscriptions WHERE user_id = $1', [id])
    assert.deepEqual(rows.map((r) => r.endpoint), [a.endpoint])

    assert.equal((await api('DELETE', '/push/subscriptions', { endpoint: a.endpoint }, token)).status, 204)
    assert.equal((await api('POST', '/push/test', undefined, token)).status, 404)
  })

  it('o mesmo navegador entrando com outra conta passa a ser dela', async () => {
    const x = await register()
    const y = await register()
    const mesma = inscricao()
    await api('POST', '/push/subscriptions', mesma, x.token)
    await api('POST', '/push/subscriptions', mesma, y.token)
    const { rows } = await db.query<{ userId: number }>('SELECT user_id AS "userId" FROM push_subscriptions WHERE endpoint = $1', [mesma.endpoint])
    assert.deepEqual(rows, [{ userId: y.id }])
  })
})

describe('Web Push: agendador de lembretes', () => {
  it('manda no horário local, uma vez por dia, só para quem ainda não treinou', async () => {
    const quem = await register()
    const treinou = await register()
    const semLembrete = await register()
    const outroDia = await register()
    for (const c of [quem, treinou, semLembrete, outroDia]) await api('POST', '/push/subscriptions', inscricao(), c.token)
    await lembrete(quem.token)
    await lembrete(treinou.token)
    await lembrete(outroDia.token, '18:00', [1, 3, 5]) // terça não está na lista
    await api('POST', '/sessions', { performedAt: '2026-11-10T15:00:00Z', durationMinutes: 30, entries: [] }, treinou.token)

    const ids = (lista: { userId: number }[]) => lista.map((d) => d.userId).filter((id) => [quem.id, treinou.id, semLembrete.id, outroDia.id].includes(id))
    assert.deepEqual(ids(await dueReminders(db, new Date('2026-11-10T20:59:00Z'))), []) // 17h59: cedo
    assert.deepEqual(ids(await dueReminders(db, TERCA_18H05)), [quem.id])
    assert.deepEqual(ids(await dueReminders(db, new Date('2026-11-10T21:31:00Z'))), []) // 18h31: passou da janela

    const antes = falso.enviados.length
    await runReminders(db, falso.send, TERCA_18H05)
    assert.ok(falso.enviados.length > antes)
    assert.equal(falso.enviados.at(-1)!.message.tag, 'lembrete')
    assert.deepEqual(ids(await dueReminders(db, new Date('2026-11-10T21:10:00Z'))), []) // já recebeu hoje
    // Quarta: quem recebeu ontem recebe de novo; quem treinou ontem e o lembrete de seg/qua/sex também.
    const quarta = ids(await dueReminders(db, new Date('2026-11-11T21:05:00Z'))).sort((a, b) => a - b)
    assert.deepEqual(quarta, [quem.id, treinou.id, outroDia.id].sort((a, b) => a - b))
  })

  it('agendador externo só roda com o segredo certo', async () => {
    assert.equal((await api('POST', '/push/run')).status, 404)
    const errado = await fetch(`${baseUrl}/push/run`, { method: 'POST', headers: { 'X-Cron-Secret': 'outro' } })
    assert.equal(errado.status, 404)
    const certo = await fetch(`${baseUrl}/push/run`, { method: 'POST', headers: { 'X-Cron-Secret': 'segredo-do-cron' } })
    assert.equal(certo.status, 200)
    assert.deepEqual(Object.keys(await certo.json()).sort(), ['due', 'sent'])
  })
})

describe('Web Push: desafios entre amigos', () => {
  it('avisa quem foi desafiado e quem desafiou quando o outro aceita', async () => {
    const a = await register()
    const b = await register()
    const pa = (await api('PUT', '/social/profile', { nickname: `push_a${n}` }, a.token)).body
    await api('PUT', '/social/profile', { nickname: `push_b${n}` }, b.token)
    await api('POST', '/social/friends', { code: pa.inviteCode }, b.token)
    const ea = inscricao()
    const eb = inscricao()
    await api('POST', '/push/subscriptions', ea, a.token)
    await api('POST', '/push/subscriptions', eb, b.token)

    const desafio = (await api('POST', '/social/challenges', { opponentId: b.id, metric: 'lances_livres' }, a.token)).body
    await esperar(() => falso.enviados.some((e) => e.endpoint === eb.endpoint && /te desafiou/.test(e.message.title)))
    await api('POST', `/social/challenges/${desafio.id}/accept`, undefined, b.token)
    await esperar(() => falso.enviados.some((e) => e.endpoint === ea.endpoint && /aceitou o desafio/.test(e.message.title)))
  })
})

describe('Web Push desligado', () => {
  it('sem chaves VAPID, a configuração avisa e as rotas recusam', async () => {
    const desligado = await startApi({ push: { publicKey: '', send: null } })
    const { token } = await desligado.register()
    assert.deepEqual((await desligado.api('GET', '/push/config', undefined, token)).body, { enabled: false, publicKey: null })
    assert.equal((await desligado.api('POST', '/push/subscriptions', inscricao(), token)).status, 503)
    assert.equal((await desligado.api('POST', '/push/test', undefined, token)).status, 503)
  })
})

async function esperar(condicao: () => boolean) {
  for (let i = 0; i < 50 && !condicao(); i++) await new Promise((r) => setTimeout(r, 20))
  assert.ok(condicao(), 'a notificação não chegou')
}

