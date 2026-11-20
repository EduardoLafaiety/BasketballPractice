import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHmac } from 'node:crypto'
import { describe, it } from 'node:test'
import { startApi } from './http.js'
import { criarConta } from './caixa.js'
import { fakeCheckoutPro } from './fake-checkout-pro.js'
import type { MercadoPago, MpPayment } from '../src/modules/billing/mercado-pago.js'
import { periodEnd } from '../src/modules/billing/billing.service.js'

const payments = new Map<string, MpPayment>(), fake = fakeCheckoutPro(payments), secret = 'somente-testes'
// Rotas de assinatura não são chamadas nestes testes. Nenhuma chamada ao MP real é permitida.
const unexpected = async (): Promise<never> => { throw new Error('Chamada inesperada à API de assinaturas no teste avulso') }
const client: MercadoPago = { ...fake.client, create: unexpected, subscription: unexpected, cancel: unexpected, invoice: unexpected,
  async payment(id: string) { return payments.get(id)! }, async invoices() { return [] } }
const { api, db, caixa, baseUrl } = await startApi({ billing: { enabled: true, accessToken: 'ficticio', webhookSecret: secret, collectorId: '123', liveMode: false, appUrl: 'https://basketball.example', client } })
async function guest(plan: 'mensal' | 'anual' = 'anual') {
  const input = { email: `cliente-${randomUUID()}@example.com`, plan, mode: 'avulso', checkoutKey: randomBytes(32).toString('hex') }
  const response = await api('POST','/billing/purchase',input)
  assert.equal(response.status,200, JSON.stringify(response.body))
  const preference = fake.preferences.get(new URL(response.body.url).searchParams.get('pref_id')!)!
  return { input, preference, response }
}
async function notify(payment: MpPayment) {
  const ts = String(Date.now()), rid = 'checkout-pro-teste', id = String(payment.id)
  const signature = createHmac('sha256',secret).update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex')
  return fetch(`${baseUrl}/billing/webhook?data.id=${id}`, { method: 'POST', headers: { 'Content-Type':'application/json', 'x-request-id':rid, 'x-signature':`ts=${ts},v1=${signature}` }, body:JSON.stringify({ type:'payment',data:{id} }) })
}
describe('Checkout Pro com pagamento por período', () => {
  it('anual custa R$ 150 e permite todos os meios, sem exigir conta Mercado Pago ou criar usuário', async () => {
    const before = (await db.query('SELECT count(*) FROM users')).rows[0].count
    const { input, preference, response } = await guest()
    assert.equal(preference.items[0].unit_price,150)
    assert.equal(preference.items[0].quantity,1)
    assert.deepEqual(fake.bodies.at(-1)?.payment_methods,{excluded_payment_methods:[],excluded_payment_types:[],installments:1})
    assert.equal(fake.bodies.at(-1)?.purpose,undefined)
    assert.equal((await db.query('SELECT count(*) FROM users')).rows[0].count,before)
    assert.equal((await api('POST','/billing/purchase',input)).body.url,response.body.url)
    assert.equal((await api('POST','/billing/purchase/status',{checkoutKey:input.checkoutKey})).body.paid,false)
    assert.equal((await api('POST','/billing/purchase',{...input,amount:1})).status,400)
  })
  for (const method of ['pix','bolbradesco','debelo','visa']) it(`${method}: pendente bloqueia, aprovação libera o período e estorno revoga`, async () => {
    const { input,preference } = await guest(method === 'pix' ? 'mensal' : 'anual')
    const p = fake.pay(preference)
    Object.assign(p,{payment_method_id:method})
    const { token } = await criarConta(api,caixa,{name:'Cliente',email:input.email,password:'senha-segura-teste'})
    assert.equal((await notify(p)).status,200)
    assert.equal((await api('GET','/exercises',undefined,token)).status,402)
    assert.equal((await api('POST','/billing/purchase/status',{checkoutKey:input.checkoutKey})).body.paid,false)
    p.status = 'approved'; p.date_approved = new Date().toISOString()
    assert.equal((await notify(p)).status,200)
    const me = await api('GET','/auth/me',undefined,token)
    assert.equal(me.body.billing.hasAccess,true)
    assert.equal(me.body.billing.paidUntil,periodEnd(p.date_approved,input.plan === 'anual' ? 12 : 1).toISOString())
    assert.equal((await api('GET','/exercises',undefined,token)).status,200)
    const status = await api('GET','/billing/status',undefined,token)
    assert.equal(status.body.subscription.mode,'avulso')
    p.transaction_amount_refunded = p.transaction_amount
    assert.equal((await notify(p)).status,200)
    assert.equal((await api('GET','/exercises',undefined,token)).status,402)
  })
  it('recusa pagamento aprovado de outra preferência, recebedor, valor, moeda ou ambiente', async () => {
    const {input,preference} = await guest()
    const p = fake.pay(preference,'approved'), original = {...p}
    const order = fake.orders.get(String(p.order!.id))!
    for (const change of [{transaction_amount:15},{collector_id:999},{currency_id:'USD'},{live_mode:true},{date_approved:'2099-01-01T00:00:00Z'}]) {
      Object.assign(p,change)
      assert.equal((await notify(p)).status,502)
      Object.assign(p,original)
    }
    const prefId = order.preference_id; order.preference_id = 'outra'
    assert.equal((await notify(p)).status,502)
    order.preference_id = prefId
    const stored = (await db.query('SELECT count(*) FROM billing_payments WHERE subscription_id::text=$1',[preference.external_reference])).rows[0].count
    assert.equal(Number(stored),0)
    assert.equal((await api('GET','/exercises',undefined,input.checkoutKey)).status,401)
  })
  it('recupera criação sem resposta pelo webhook sem duplicar checkout nem conceder acesso pendente', async () => {
    const input = { email:`perdida-${randomUUID()}@example.com`,plan:'anual',mode:'avulso',checkoutKey:randomBytes(32).toString('hex') }
    fake.loseNextResponse()
    const count = fake.preferences.size
    assert.equal((await api('POST','/billing/purchase',input)).status,500)
    assert.equal((await api('POST','/billing/purchase',input)).status,409)
    assert.equal(fake.preferences.size,count+1)
    const preference = [...fake.preferences.values()].at(-1)!, p = fake.pay(preference,'approved')
    assert.equal((await notify(p)).status,200)
    assert.equal((await api('POST','/billing/purchase/status',{checkoutKey:input.checkoutKey})).body.paid,true)
  })
})
