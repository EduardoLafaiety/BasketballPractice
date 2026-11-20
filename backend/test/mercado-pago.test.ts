import assert from 'node:assert/strict'
import { it } from 'node:test'
import { checkoutUrl, mercadoPago } from '../src/modules/billing/mercado-pago.js'

it('consulta faturas com os filtros de assinatura/pagamento sem o limite recusado pelo provedor', async () => {
  const original = globalThis.fetch
  const invoice = { id: 77, preapproval_id: 'assinatura', debit_date: '2026-11-20T12:00:00Z', payment: { id: 88, status: 'approved' } }
  const received: URL[] = []
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); received.push(url)
    assert.equal(url.origin, 'https://api.mercadopago.com')
    assert.equal(url.pathname, '/authorized_payments/search')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer credencial-ficticia')
    // Restrição observada na homologação do endpoint de faturas.
    if (url.searchParams.get('limit') === '100') return Response.json({ message: 'Invalid value for limit' }, { status: 400 })
    return Response.json({ paging: { offset: 0, limit: 12, total: 1 }, results: [invoice] })
  }
  try {
    const client = mercadoPago('credencial-ficticia')
    assert.deepEqual(await client.invoices({ preapproval_id: 'assinatura' }), [invoice])
    assert.deepEqual(await client.invoices({ payment_id: '88' }), [invoice])
    assert.equal(received[0].searchParams.get('preapproval_id'), 'assinatura')
    assert.equal(received[1].searchParams.get('payment_id'), '88')
  } finally { globalThis.fetch = original }
})

it('erros HTTP, timeout e JSON inválido do provedor não expõem credenciais nem respostas privadas', async () => {
  const original = globalThis.fetch
  const privateValue = 'credencial-privada-ficticia'
  try {
    for (const mode of ['http', 'timeout', 'json']) {
      globalThis.fetch = async (_input, init) => {
        assert.equal(init?.redirect, 'error')
        if (mode === 'http') return Response.json({ message: privateValue }, { status: 500 })
        if (mode === 'timeout') throw new DOMException(privateValue, 'TimeoutError')
        return new Response('<html>' + privateValue, { status: 200 })
      }
      await assert.rejects(mercadoPago(privateValue).subscription('assinatura'), (error: unknown) => {
        const e = error as { status: number; message: string }
        assert.equal(e.status, mode === 'http' ? 502 : 503)
        assert.ok(!e.message.includes(privateValue))
        return true
      })
    }
  } finally { globalThis.fetch = original }
})

it('criação preserva a chave de idempotência e cancelamento envia somente o estado esperado', async () => {
  const original = globalThis.fetch
  const calls: { path: string; method: string; key?: string; body: unknown }[] = []
  globalThis.fetch = async (input, init) => {
    const headers = init?.headers as Record<string, string>
    calls.push({ path: new URL(String(input)).pathname, method: init?.method ?? 'GET', key: headers['X-Idempotency-Key'], body: JSON.parse(String(init?.body)) })
    return Response.json({ id: 'assinatura', status: 'cancelled' })
  }
  try {
    const mp = mercadoPago('credencial-ficticia')
    await mp.create({ reason: 'Teste' }, 'mesma-tentativa')
    await mp.cancel('assinatura/uma')
    assert.deepEqual(calls, [
      { path: '/preapproval', method: 'POST', key: 'mesma-tentativa', body: { reason: 'Teste' } },
      { path: '/preapproval/assinatura%2Fuma', method: 'PUT', key: undefined, body: { status: 'cancelled' } },
    ])
  } finally { globalThis.fetch = original }
})

it('checkout não aceita HTTP, credenciais embutidas nem domínios que imitam o provedor', () => {
  for (const url of ['http://www.mercadopago.com.br/subscriptions/checkout', 'https://www.mercadopago.com.br.outro.example/subscriptions/checkout', 'https://usuario:senha@www.mercadopago.com.br/subscriptions/checkout', 'https://www.mercadopago.com.br/fora']) {
    assert.throws(() => checkoutUrl(url))
  }
  assert.equal(checkoutUrl('https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=teste'), 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=teste')
})
