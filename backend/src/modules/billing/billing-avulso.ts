import type { Database, Queryable } from '../../db/index.js'
import { HttpError } from '../../lib/http-error.js'
import { billingRepository as repo, type Subscription } from './billing.repository.js'
import { checkoutUrl, type MercadoPago, type MpPayment, type MpPreference } from './mercado-pago.js'

/** Checkout Pro: compra de um período, sem débito automático de renovações. */
export function singlePayments(db: Database, mp: MercadoPago, options: { collectorId: string; liveMode: boolean; appUrl: string },
  plans: Record<Subscription['plan'], { amount: number; months: number }>, periodEnd: (start: string, months: number) => Date,
  lock: (tx: Queryable, local: Subscription) => Promise<void>) {
  function verifyPreference(remote: MpPreference, local: Subscription) {
    const item = remote.items?.[0]
    if (remote.id !== local.mp_id || remote.external_reference !== local.id || String(remote.collector_id) !== options.collectorId || remote.items.length !== 1 ||
      item.quantity !== 1 || Number(item.unit_price) !== plans[local.plan].amount || item.currency_id !== 'BRL') throw new HttpError(502, 'Checkout incompatível com o plano escolhido.')
  }
  async function sync(payment: MpPayment) {
    if (!payment?.external_reference) return false
    const local = await repo.byReference(db, payment.external_reference)
    if (!local || local.mode !== 'avulso') return false
    await db.transaction(async tx => {
      await lock(tx, local)
      // Reconsulta sob o lock para que reembolsos e notificações concorrentes não reativem acesso.
      const current = await mp.payment(String(payment.id))
      const order = current.order?.type === 'mercadopago' ? await mp.order(String(current.order.id)) : null
      if (order && !local.mp_id) {
        const preference = await mp.getPreference(order.preference_id)
        verifyPreference(preference, { ...local, mp_id: order.preference_id })
        await repo.recover(tx, local.id, preference.id, 'pending')
        local.mp_id = preference.id
      }
      if (!order || String(order.id) !== String(current.order!.id) || order.preference_id !== local.mp_id || order.external_reference !== local.id ||
        String(order.collector.id) !== options.collectorId || !order.payments.some(p => String(p.id) === String(current.id)) ||
        current.external_reference !== local.id || String(current.collector_id) !== options.collectorId || current.live_mode !== options.liveMode ||
        current.currency_id !== 'BRL' || Number(current.transaction_amount) !== plans[local.plan].amount) throw new HttpError(502, 'Pagamento incompatível com esta compra.')
      const approved = current.status === 'approved' && !Number(current.transaction_amount_refunded ?? 0) && current.date_approved
      if (approved && new Date(approved).getTime() > Date.now() + 300_000) throw new HttpError(502, 'Pagamento com data futura não pode liberar acesso.')
      const until = approved ? periodEnd(approved, plans[local.plan].months) : null
      await repo.payment(tx, String(current.id), local.id, `checkout:${current.id}`, approved ? 'approved' : current.status === 'approved' ? 'refunded' : current.status, until)
      // Um pagamento único não mantém uma renovação aberta. Os direitos vêm do período pago.
      if (approved) await repo.status(tx, local.id, 'completed')
    })
    return true
  }
  return {
    sync,
    async refresh(local: Subscription) {
      const preference = await mp.getPreference(local.mp_id!)
      verifyPreference(preference, local)
      const results = await mp.payments(local.id)
      const ids = new Set([...results.map(p => String(p.id)), ...(await repo.paymentIds(db, local.id)).map(p => p.payment_id)])
      for (const id of ids) await sync(await mp.payment(id))
    },
    async open(local: Subscription, email: string, returnPath: string) {
      if (local.checkout_url) return { url: checkoutUrl(local.checkout_url, 'avulso') }
      if (!(await repo.claim(db, local.id)).rowCount) throw new HttpError(409, 'A criação anterior precisa ser confirmada. Consulte o atendimento antes de pagar novamente.')
      const target = `${options.appUrl}${returnPath}`
      const remote = await mp.preference({
        external_reference: local.id, payer: { email },
        items: [{ id: local.id, title: `Basketball Practice — ${local.plan === 'anual' ? '12 meses' : '1 mês'}`, quantity: 1, unit_price: plans[local.plan].amount, currency_id: 'BRL' }],
        back_urls: { success: target, pending: target, failure: target },
        // Não exclui Pix, boleto, débito nem crédito. Não exige conta do comprador.
        payment_methods: { excluded_payment_methods: [], excluded_payment_types: [], installments: 1 },
        ...(options.appUrl.startsWith('https:') ? { auto_return: 'approved' } : {}),
      }, local.id)
      await repo.provider(db, local.id, remote.id)
      verifyPreference(remote, { ...local, mp_id: remote.id })
      const url = checkoutUrl(remote.init_point, 'avulso')
      await repo.checkout(db, local.id, url)
      return { url }
    },
  }
}
