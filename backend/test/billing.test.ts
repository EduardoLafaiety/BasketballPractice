import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { describe, it } from 'node:test'
import { startApi } from './http.js'
import { periodEnd } from '../src/modules/billing/billing.service.js'
import type { MercadoPago, MpInvoice, MpPayment, MpSubscription } from '../src/modules/billing/mercado-pago.js'

const secret = 'segredo-de-webhook-apenas-para-testes'
const subscriptions = new Map<string, MpSubscription>()
const invoices = new Map<string, MpInvoice>()
const payments = new Map<string, MpPayment>()
let creates = 0
let cancels = 0
let loseResponse = false
let nextPayment = 1000
const client: MercadoPago = {
  async create(body) {
    creates++
    const id = `sub${creates}`
    const s: MpSubscription = { id, external_reference: String(body.external_reference), collector_id: 123, status: 'pending', last_modified: new Date().toISOString(),
      auto_recurring: body.auto_recurring as MpSubscription['auto_recurring'], init_point: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=${id}` }
    subscriptions.set(id, s)
    if (loseResponse) { loseResponse = false; throw new Error('Resposta perdida após criar no provedor') }
    return s
  },
  async subscription(id) { const s = subscriptions.get(id); if (!s) throw new Error('Assinatura desconhecida'); return s },
  async cancel(id) { cancels++; const s = subscriptions.get(id)!; s.status = 'cancelled'; return s },
  async invoice(id) { return invoices.get(id)! },
  async invoices(filter) { return [...invoices.values()].filter(i => filter.payment_id ? String(i.payment?.id) === filter.payment_id : i.preapproval_id === filter.preapproval_id).reverse() },
  async payment(id) { return payments.get(id)! },
}
const billing = { enabled: true, accessToken: 'apenas-teste', webhookSecret: secret, collectorId: '123', appUrl: 'https://basketball.example', liveMode: false, client }
const { api, register, db, baseUrl } = await startApi({ billing })

async function notify(type: string, id: string, options: { signature?: string; ts?: string; bodyId?: string } = {}) {
  const ts = options.ts ?? String(Date.now())
  const rid = 'request-do-teste'
  const digest = createHmac('sha256', secret).update(`id:${id.toLowerCase()};request-id:${rid};ts:${ts};`).digest('hex')
  return fetch(`${baseUrl}/billing/webhook?data.id=${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-request-id': rid, 'x-signature': options.signature ?? `ts=${ts},v1=${digest}` }, body: JSON.stringify({ type, data: { id: options.bodyId ?? id } }) })
}
async function checkout(plan: 'mensal' | 'anual' = 'mensal') {
  const user = await register()
  const r = await api('POST', '/billing/checkout', { plan }, user.token)
  assert.equal(r.status, 200)
  const id = new URL(r.body.url).searchParams.get('preapproval_id')!
  return { ...user, sub: subscriptions.get(id)! }
}
function paid(sub: MpSubscription, start = new Date().toISOString()) {
  sub.status = 'authorized'
  const id = ++nextPayment
  const invoice: MpInvoice = { id: id + 10000, preapproval_id: sub.id, external_reference: sub.external_reference, debit_date: start, payment: { id, status: 'approved' } }
  const payment: MpPayment = { id, status: 'approved', transaction_amount: sub.auto_recurring.transaction_amount, currency_id: 'BRL', collector_id: 123, live_mode: false, date_approved: start, date_last_updated: new Date().toISOString() }
  invoices.set(String(invoice.id), invoice); payments.set(String(id), payment)
  return { invoice, payment }
}

describe('Assinaturas Mercado Pago', () => {
  it('protege os treinos no servidor, mantendo conta e dados pessoais acessíveis', async () => {
    const user = await register()
    assert.equal((await api('GET', '/exercises', undefined, user.token)).status, 402)
    assert.equal((await api('GET', '/settings', undefined, user.token)).status, 200)
    const me = await api('GET', '/auth/me', undefined, user.token)
    assert.equal(me.body.billing.hasAccess, false)
    assert.equal(me.body.billing.required, true)
    assert.equal((await api('POST', '/billing/checkout', { plan: 'mensal' })).status, 401)
  })
  it('bloqueia leituras e alterações de todos os recursos de treino diretamente na API', async () => {
    const user = await register()
    for (const path of ['/exercises', '/workouts', '/routine', '/sessions', '/plans', '/programs', '/styles', '/push/config']) {
      assert.equal((await api('GET', path, undefined, user.token)).status, 402, path)
      assert.equal((await api('POST', path, {}, user.token)).status, 402, path)
      assert.equal((await api('GET', path)).status, 401, path)
    }
    assert.equal((await api('GET', '/settings', undefined, user.token)).status, 200)
    assert.equal((await api('GET', '/data/export', undefined, user.token)).status, 200)
  })
  it('define valores e frequência no servidor e rejeita preço enviado pelo cliente', async () => {
    const monthly = await checkout()
    const yearly = await checkout('anual')
    assert.deepEqual(monthly.sub.auto_recurring, { frequency: 1, frequency_type: 'months', transaction_amount: 15, currency_id: 'BRL' })
    assert.deepEqual(yearly.sub.auto_recurring, { frequency: 12, frequency_type: 'months', transaction_amount: 150, currency_id: 'BRL' })
    assert.equal((await api('POST', '/billing/checkout', { plan: 'mensal', amount: 0.01 }, monthly.token)).status, 400)
    assert.equal((await api('POST', '/billing/checkout', { plan: 'gratis' }, monthly.token)).status, 400)
  })
  it('pedidos concorrentes/repetidos não criam duas assinaturas', async () => {
    const user = await register()
    const before = creates
    const results = await Promise.all([api('POST', '/billing/checkout', { plan: 'mensal' }, user.token), api('POST', '/billing/checkout', { plan: 'mensal' }, user.token)])
    assert.ok(results.some(r => r.status === 200))
    assert.equal(creates, before + 1)
    assert.equal((await api('POST', '/billing/checkout', { plan: 'anual' }, user.token)).status, 409)
  })
  it('assinatura autorizada e retorno do navegador não liberam acesso sem pagamento aprovado', async () => {
    const { token, sub } = await checkout()
    sub.status = 'authorized'
    assert.equal((await notify('subscription_preapproval', sub.id)).status, 200)
    assert.equal((await api('POST', '/billing/refresh', undefined, token)).body.hasAccess, false)
    assert.equal((await api('GET', '/exercises', undefined, token)).status, 402)
  })
  it('pagamentos pendentes, em análise, autorizados e recusados não liberam treino', async () => {
    for (const status of ['pending', 'in_process', 'authorized', 'rejected', 'cancelled']) {
      const { token, sub } = await checkout()
      const { invoice, payment } = paid(sub)
      payment.status = status
      payment.date_approved = null
      assert.equal((await notify('subscription_authorized_payment', String(invoice.id))).status, 200)
      assert.equal((await api('POST', '/billing/refresh', undefined, token)).body.hasAccess, false, status)
      assert.equal((await api('GET', '/exercises', undefined, token)).status, 402, status)
    }
  })
  it('renovação recusada preserva somente o período que já foi pago', async () => {
    const { token, sub } = await checkout()
    const first = paid(sub)
    await notify('subscription_authorized_payment', String(first.invoice.id))
    const until = (await api('GET', '/billing/status', undefined, token)).body.paidUntil
    const renewal = paid(sub, until)
    renewal.payment.status = 'rejected'
    renewal.payment.date_approved = null
    await notify('subscription_authorized_payment', String(renewal.invoice.id))
    const result = await api('GET', '/billing/status', undefined, token)
    assert.equal(result.body.hasAccess, true)
    assert.equal(result.body.paidUntil, until)
  })
  it('confirma pagamento na API e processa evento duplicado sem estender o período', async () => {
    const { token, sub } = await checkout()
    const { invoice } = paid(sub)
    assert.equal((await notify('subscription_authorized_payment', String(invoice.id))).status, 200)
    const first = await api('GET', '/billing/status', undefined, token)
    assert.equal(first.body.hasAccess, true)
    assert.equal((await notify('subscription_authorized_payment', String(invoice.id))).status, 200)
    assert.equal((await api('GET', '/billing/status', undefined, token)).body.paidUntil, first.body.paidUntil)
    assert.equal((await api('GET', '/exercises', undefined, token)).status, 200)
    assert.equal((await api('GET', '/auth/me', undefined, token)).body.billing.hasAccess, true)
  })
  it('assinatura anual concede 12 meses e mensal respeita o calendário', async () => {
    assert.equal(periodEnd('2026-01-31T10:00:00Z', 1).toISOString(), '2026-02-28T10:00:00.000Z')
    assert.equal(periodEnd('2024-02-29T10:00:00Z', 12).toISOString(), '2025-02-28T10:00:00.000Z')
    const { token, sub } = await checkout('anual')
    const { invoice } = paid(sub)
    await notify('subscription_authorized_payment', String(invoice.id))
    assert.equal((await api('GET', '/billing/status', undefined, token)).body.paidUntil, periodEnd(invoice.debit_date, 12).toISOString())
  })
  it('rejeita assinatura inválida, timestamp vencido e corpo/query divergentes', async () => {
    const { sub, token } = await checkout()
    const { invoice } = paid(sub)
    assert.equal((await notify('subscription_authorized_payment', String(invoice.id), { signature: 'ts=1,v1=errada' })).status, 401)
    assert.equal((await notify('subscription_authorized_payment', String(invoice.id), { ts: String(Date.now() - 600_000) })).status, 401)
    assert.equal((await notify('subscription_authorized_payment', String(invoice.id), { bodyId: 'outro' })).status, 401)
    assert.equal((await api('GET', '/billing/status', undefined, token)).body.hasAccess, false)
  })
  it('recusa moeda, valor, recebedor e ambiente que não correspondem à assinatura', async () => {
    const { token, sub } = await checkout()
    const { invoice, payment } = paid(sub)
    for (const [field, bad] of [['currency_id', 'USD'], ['transaction_amount', 0.01], ['collector_id', 999], ['live_mode', true]] as const) {
      const original = payment[field]
      Object.assign(payment, { [field]: bad })
      assert.equal((await notify('subscription_authorized_payment', String(invoice.id))).status, 502)
      assert.equal((await api('GET', '/billing/status', undefined, token)).body.hasAccess, false)
      Object.assign(payment, { [field]: original })
    }
  })
  it('estorno confirmado remove a liberação e eventos antigos consultam o estado atual', async () => {
    const { token, sub } = await checkout()
    const { invoice, payment } = paid(sub)
    await notify('subscription_authorized_payment', String(invoice.id))
    payment.status = 'refunded'
    assert.equal((await notify('payment', String(payment.id))).status, 200)
    assert.equal((await api('GET', '/billing/status', undefined, token)).body.hasAccess, false)
    await notify('subscription_authorized_payment', String(invoice.id))
    assert.equal((await api('GET', '/exercises', undefined, token)).status, 402)
  })
  it('chargeback e estorno parcial revogam o acesso inclusive com evento repetido', async () => {
    for (const partial of [false, true]) {
      const { token, sub } = await checkout()
      const { invoice, payment } = paid(sub)
      await notify('subscription_authorized_payment', String(invoice.id))
      assert.equal((await api('GET', '/billing/status', undefined, token)).body.hasAccess, true)
      if (partial) payment.transaction_amount_refunded = 1
      else payment.status = 'charged_back'
      assert.equal((await notify('payment', String(payment.id))).status, 200)
      assert.equal((await notify('subscription_authorized_payment', String(invoice.id))).status, 200)
      assert.equal((await api('GET', '/billing/status', undefined, token)).body.hasAccess, false)
      assert.equal((await api('GET', '/exercises', undefined, token)).status, 402)
    }
  })
  it('pagamento aprovado com competência futura não antecipa acesso', async () => {
    const { token, sub } = await checkout()
    const { invoice } = paid(sub, new Date(Date.now() + 86400_000).toISOString())
    assert.equal((await notify('subscription_authorized_payment', String(invoice.id))).status, 502)
    assert.equal((await api('GET', '/billing/status', undefined, token)).body.hasAccess, false)
  })
  it('consulta manual recupera confirmação perdida e períodos vencidos não liberam', async () => {
    const { token, sub } = await checkout()
    const { invoice } = paid(sub, new Date(Date.now() - 70 * 86400_000).toISOString())
    await notify('subscription_authorized_payment', String(invoice.id))
    assert.equal((await api('GET', '/billing/status', undefined, token)).body.hasAccess, false)
    paid(sub)
    assert.equal((await api('POST', '/billing/refresh', undefined, token)).body.hasAccess, true)
  })
  it('cancelamento é idempotente, mantém o período pago e impede excluir conta ainda cobrada', async () => {
    const { token, sub } = await checkout()
    paid(sub)
    await api('POST', '/billing/refresh', undefined, token)
    assert.equal((await api('DELETE', '/auth/me', { password: 'senha-segura' }, token)).status, 409)
    const before = cancels
    const result = await api('POST', '/billing/cancel', undefined, token)
    assert.equal(result.status, 200)
    assert.equal(result.body.hasAccess, true)
    assert.equal(result.body.subscription.status, 'cancelled')
    assert.equal((await api('POST', '/billing/cancel', undefined, token)).status, 200)
    assert.equal(cancels, before + 1)
    assert.equal((await api('DELETE', '/auth/me', { password: 'senha-segura' }, token)).status, 204)
  })
  it('uma conta não pode cancelar a assinatura de outra', async () => {
    const { token, sub } = await checkout()
    const other = await register()
    const before = cancels
    await api('POST', '/billing/cancel', undefined, other.token)
    assert.equal(cancels, before)
    assert.equal(sub.status, 'pending')
    assert.equal((await api('GET', '/billing/status', undefined, token)).body.subscription.status, 'pending')
  })
  it('falha ou resposta inconclusiva do provedor não anuncia cancelamento confirmado', async () => {
    const { token, sub } = await checkout()
    const cancel = client.cancel
    try {
      client.cancel = async () => { throw new Error('Falha de rede simulada') }
      assert.equal((await api('POST', '/billing/cancel', undefined, token)).status, 500)
      assert.equal((await api('GET', '/billing/status', undefined, token)).body.subscription.status, 'pending')
      client.cancel = async () => ({ ...sub, status: 'authorized' })
      assert.equal((await api('POST', '/billing/cancel', undefined, token)).status, 502)
      assert.equal((await api('GET', '/billing/status', undefined, token)).body.subscription.status, 'pending')
    } finally { client.cancel = cancel }
    assert.equal((await api('POST', '/billing/cancel', undefined, token)).body.subscription.status, 'cancelled')
  })
  it('resposta de criação perdida não repete cobrança e webhook recupera o vínculo', async () => {
    const user = await register()
    const before = creates
    loseResponse = true
    assert.equal((await api('POST', '/billing/checkout', { plan: 'mensal' }, user.token)).status, 500)
    assert.equal((await api('POST', '/billing/checkout', { plan: 'mensal' }, user.token)).status, 409)
    assert.equal(creates, before + 1)
    const sub = subscriptions.get(`sub${creates}`)!
    assert.equal((await notify('subscription_preapproval', sub.id)).status, 200)
    assert.equal((await api('POST', '/billing/cancel', undefined, user.token)).status, 200)
  })
  it('sem credenciais não inicia checkout nem libera acesso em modo de cobrança', async () => {
    const isolated = await startApi({ billing: { ...billing, accessToken: '', webhookSecret: '' } })
    const user = await isolated.register()
    assert.equal((await isolated.api('GET', '/billing/status', undefined, user.token)).body.ready, false)
    assert.equal((await isolated.api('POST', '/billing/checkout', { plan: 'mensal' }, user.token)).status, 503)
    assert.equal((await isolated.api('GET', '/exercises', undefined, user.token)).status, 402)
    const count = await db.query('SELECT COUNT(*) FROM billing_payments')
    assert.ok(Number(count.rows[0].count) > 0)
  })
})
