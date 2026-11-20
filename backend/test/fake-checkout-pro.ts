import type { MercadoPago, MpOrder, MpPayment, MpPreference } from '../src/modules/billing/mercado-pago.js'

export function fakeCheckoutPro(payments: Map<string, MpPayment>, autoApprove = false) {
  const preferences = new Map<string, MpPreference>(), orders = new Map<string, MpOrder>()
  const bodies: Record<string, unknown>[] = []
  let count = 0
  let loseResponse = false
  function pay(preference: MpPreference, status = 'pending') {
    const id = 900000 + ++count
    const payment: MpPayment = { id, status, transaction_amount: preference.items[0].unit_price, external_reference: preference.external_reference,
      order: { id, type: 'mercadopago' }, currency_id: 'BRL', collector_id: 123, live_mode: false, date_approved: status === 'approved' ? new Date().toISOString() : null, date_last_updated: new Date().toISOString() }
    orders.set(String(id), { id, preference_id: preference.id, external_reference: preference.external_reference, collector: { id: 123 }, payments: [{ id }] })
    payments.set(String(id), payment)
    return payment
  }
  const client: Pick<MercadoPago, 'preference' | 'getPreference' | 'payments' | 'order'> = {
    async preference(body) {
      bodies.push(body)
      const id = `pref-${++count}`
      const remote: MpPreference = { id, init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${id}`, collector_id: 123, external_reference: String(body.external_reference), items: body.items as MpPreference['items'] }
      preferences.set(id, remote)
      if (autoApprove) pay(remote, 'approved')
      if (loseResponse) { loseResponse = false; throw new Error('Resposta perdida após criar preferência') }
      return remote
    },
    async getPreference(id) { return preferences.get(id)! },
    async payments(reference) { return [...payments.values()].filter(p => p.external_reference === reference) },
    async order(id) { return orders.get(id)! },
  }
  return { client, preferences, orders, bodies, pay, loseNextResponse: () => { loseResponse = true } }
}
