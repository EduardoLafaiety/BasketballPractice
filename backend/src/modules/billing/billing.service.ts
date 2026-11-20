import { randomUUID } from 'node:crypto'
import type { Database, Queryable } from '../../db/index.js'
import { HttpError } from '../../lib/http-error.js'
import { hashOneTimeToken } from '../../lib/one-time-token.js'
import { singlePayments } from './billing-avulso.js'
import { billingRepository as repo, type Subscription } from './billing.repository.js'
import { checkoutUrl, mercadoPago, type MercadoPago, type MpInvoice, type MpSubscription } from './mercado-pago.js'

export const BILLING_PLANS = {
  mensal: { amount: 15, months: 1 }, anual: { amount: 150, months: 12 },
} as const
export type BillingPlan = keyof typeof BILLING_PLANS
export interface BillingOptions {
  enabled: boolean; accessToken: string; webhookSecret: string; collectorId: string; appUrl: string; liveMode: boolean
  client?: MercadoPago
}

/** Soma meses com calendário UTC, preservando o último dia em meses mais curtos. */
export function periodEnd(start: string, months: number) {
  const date = new Date(start)
  if (!Number.isFinite(date.getTime())) throw new HttpError(502, 'Data de cobrança inválida no provedor.')
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return date
}

export function createBillingService(db: Database, options: BillingOptions) {
  const mp = options.client ?? mercadoPago(options.accessToken)
  const ready = Boolean(options.accessToken && options.webhookSecret && /^\d+$/.test(options.collectorId))
  const configured = () => { if (!ready) throw new HttpError(503, 'As assinaturas ainda não estão disponíveis. Nenhuma cobrança foi iniciada.') }
  const latest = repo.latest
  const lock = async (tx: Queryable, userId: number) => {
    if (!await repo.user(tx, userId)) throw new HttpError(404, 'Conta não encontrada.')
  }
  const lockSubscription = async (tx: Queryable, local: Subscription) => {
    if (local.checkout_email) await repo.lockEmail(tx, local.checkout_email)
    const current = await repo.byReference(tx, local.id)
    if (current?.user_id != null) await lock(tx, current.user_id)
  }
  const single = singlePayments(db, mp, options, BILLING_PLANS, periodEnd, lockSubscription)
  async function access(userId: number, tx: Queryable = db) {
    if (!options.enabled) return { required: false, hasAccess: true, paidUntil: null }
    const row = await repo.access(tx, userId)
    return { required: options.enabled, hasAccess: !options.enabled || Boolean(row?.admin) || Boolean(row?.paid_until && new Date(row.paid_until).getTime() > Date.now()), paidUntil: row?.paid_until?.toISOString() ?? null }
  }
  function verifySubscription(remote: MpSubscription, local: Subscription) {
    const plan = BILLING_PLANS[local.plan]
    if (remote.external_reference !== local.id || String(remote.collector_id) !== options.collectorId || remote.id !== local.mp_id ||
      remote.auto_recurring?.currency_id !== 'BRL' || Number(remote.auto_recurring.transaction_amount) !== plan.amount ||
      remote.auto_recurring.frequency !== plan.months || remote.auto_recurring.frequency_type !== 'months') throw new HttpError(502, 'A assinatura recebida não corresponde ao plano desta conta.')
  }
  async function syncSubscription(tx: Queryable, local: Subscription) {
    if (!local.mp_id) return
    const remote = await mp.subscription(local.mp_id)
    verifySubscription(remote, local)
    if (!['pending', 'authorized', 'paused', 'cancelled'].includes(remote.status)) throw new HttpError(502, 'Estado de assinatura desconhecido.')
    await repo.status(tx, local.id, remote.status)
  }
  async function syncInvoice(invoice: MpInvoice) {
    const local = await repo.byProvider(db, invoice.preapproval_id)
    if (!local || local.mode !== 'recorrente' || !invoice.payment?.id) return
    await db.transaction(async tx => {
      await lockSubscription(tx, local)
      // A consulta ocorre depois do lock: eventos simultâneos/antigos leem o estado atual do pagamento.
      await syncSubscription(tx, local)
      const payment = await mp.payment(String(invoice.payment!.id))
      const plan = BILLING_PLANS[local.plan]
      if (String(payment.id) !== String(invoice.payment!.id) || payment.currency_id !== 'BRL' || Number(payment.transaction_amount) !== plan.amount ||
        String(payment.collector_id) !== options.collectorId || payment.live_mode !== options.liveMode ||
        (invoice.external_reference && invoice.external_reference !== local.id)) throw new HttpError(502, 'Pagamento incompatível com a assinatura.')
      // Nunca concede acesso com "authorized" da assinatura: exige pagamento aprovado e sem estorno.
      const approved = payment.status === 'approved' && !Number(payment.transaction_amount_refunded ?? 0) && payment.date_approved
      const start = invoice.debit_date || payment.date_approved
      const until = approved && start ? periodEnd(start, plan.months) : null
      if (until && new Date(start!).getTime() > Date.now() + 300_000) throw new HttpError(502, 'Cobrança com data futura não pode liberar acesso.')
      await repo.payment(tx, String(payment.id), local.id, String(invoice.id), approved ? 'approved' : payment.status === 'approved' ? 'refunded' : payment.status, until)
    })
  }
  async function resolveSubscription(id: string) {
    const local = await repo.byProvider(db, id)
    if (local) return local.mode === 'recorrente' ? local : undefined
    // Recupera inclusive uma criação cuja resposta HTTP se perdeu, sem criar outra cobrança.
    const remote = await mp.subscription(id)
    const candidate = await repo.byReference(db, String(remote.external_reference))
    if (!candidate || candidate.mp_id || candidate.mode !== 'recorrente') return undefined
    verifySubscription(remote, { ...candidate, mp_id: id })
    await db.transaction(async tx => {
      await lockSubscription(tx, candidate)
      await repo.recover(tx, candidate.id, id, remote.status)
    })
    return { ...candidate, mp_id: id }
  }
  async function refreshLocal(local: Subscription) {
    if (!local.mp_id) return
    if (local.mode === 'avulso') return single.refresh(local)
    await db.transaction(async tx => { await lockSubscription(tx, local); await syncSubscription(tx, local) })
    const invoices = await mp.invoices({ preapproval_id: local.mp_id })
    for (const invoice of invoices.filter(i => i.preapproval_id === local.mp_id).slice(0, 5)) await syncInvoice(invoice)
  }
  async function openCheckout(local: Subscription, email: string, returnPath: string) {
    if (local.mode === 'avulso') return single.open(local, email, returnPath)
    if (local.checkout_url) return { url: checkoutUrl(local.checkout_url) }
    if (!(await repo.claim(db, local.id)).rowCount) throw new HttpError(409, 'A criação anterior ainda precisa ser confirmada. Consulte o atendimento antes de iniciar outra assinatura.')
    const item = BILLING_PLANS[local.plan]
    const remote = await mp.create({ reason: `Basketball Practice — ${local.plan === 'mensal' ? 'Mensal' : 'Anual'}`, external_reference: local.id,
      payer_email: email, status: 'pending', auto_recurring: { frequency: item.months, frequency_type: 'months', transaction_amount: item.amount, currency_id: 'BRL' },
      back_url: `${options.appUrl}${returnPath}` }, local.id)
    await repo.provider(db, local.id, remote.id)
    verifySubscription(remote, { ...local, mp_id: remote.id })
    const url = checkoutUrl(remote.init_point)
    if (!(await repo.checkout(db, local.id, url)).rowCount) throw new HttpError(409, 'Este checkout foi cancelado. Consulte sua assinatura antes de continuar.')
    return { url }
  }
  async function cancelUnpaid(tx: Queryable, local: Subscription) {
    if (local.user_id != null) await lock(tx, local.user_id)
    if (['cancelled','failed'].includes(local.status)) return
    if (local.mode !== 'recorrente' || !local.mp_id) throw new HttpError(409, 'Retome a compra anterior. O atendimento pode ajudar a trocar um pagamento já iniciado.')
    const remote = await mp.subscription(local.mp_id)
    verifySubscription(remote, local)
    const invoices = await mp.invoices({ preapproval_id: local.mp_id })
    if (remote.status !== 'pending' || invoices.length || (await repo.paidUntil(tx, local.id))?.until) throw new HttpError(409, 'Existe uma cobrança em processamento ou paga. Verifique o pagamento antes de trocar o plano.')
    const cancelled = await mp.cancel(local.mp_id)
    verifySubscription(cancelled, local)
    if (cancelled.status !== 'cancelled') throw new HttpError(502, 'O cancelamento anterior ainda não foi confirmado. Nenhuma nova compra foi criada.')
    if ((await mp.invoices({ preapproval_id: local.mp_id })).length) throw new HttpError(409, 'Há uma cobrança da tentativa anterior. Verifique o pagamento antes de iniciar outro plano.')
    await repo.cancel(tx, local.id)
  }
  return {
    options, access, ready,
    async purchase(email: string, plan: BillingPlan, key: string, mode: Subscription['mode'] = 'recorrente') {
      if (!options.enabled) throw new HttpError(503, 'As assinaturas ainda não estão disponíveis. Nenhuma cobrança foi iniciada.')
      configured()
      const hash = hashOneTimeToken(key)
      const local = await db.transaction(async tx => {
        await repo.lockEmail(tx, email)
        const previous = await repo.byKey(tx, hash)
        if (previous) {
          if (previous.checkout_email !== email) throw new HttpError(409, 'Este pagamento já foi iniciado com outros dados. Retome a compra original.')
          if (previous.plan === plan && previous.mode === mode) return previous
          await cancelUnpaid(tx, previous)
          await repo.retireKey(tx, previous.id, hashOneTimeToken(randomUUID()))
        }
        if (await repo.openByEmail(tx, email)) throw new HttpError(409, 'Há uma compra ou assinatura em andamento para este e-mail. Retome o pagamento original ou entre em contato com o atendimento.')
        return (await repo.createGuest(tx, randomUUID(), email, plan, hash, mode))!
      })
      return openCheckout(local, email, '/compra')
    },
    async purchaseStatus(key: string) {
      const local = await repo.byKey(db, hashOneTimeToken(key))
      if (!local) throw new HttpError(404, 'Compra não encontrada. Use o mesmo navegador em que iniciou o pagamento ou fale com o atendimento.')
      if (ready && local.mp_id) await refreshLocal(local)
      const until = (await repo.paidUntil(db, local.id))?.until
      const current = (await repo.byReference(db, local.id))!
      return { email: local.checkout_email!, plan: local.plan, paid: Boolean(until && until.getTime() > Date.now()), paidUntil: until?.toISOString() ?? null,
        mode: current.mode, status: current.status, url: current.checkout_url ? checkoutUrl(current.checkout_url, current.mode) : null }
    },
    async claimPurchases(userId: number) {
      if (!options.enabled) return
      const user = await repo.email(db, userId)
      if (!user) return
      await db.transaction(async tx => {
        // A identidade chega apenas da autenticação por senha/e-mail confirmado, nunca do checkout público.
        await repo.lockEmail(tx, user.email)
        await lock(tx, userId)
        const purchases = await repo.unassignedPaid(tx, user.email.toLowerCase())
        for (const purchase of purchases) {
          const current = await latest(tx, userId)
          if (current && !['cancelled', 'failed','completed'].includes(current.status) && !['cancelled', 'failed','completed'].includes(purchase.status)) continue
          await repo.assign(tx, purchase.id, userId)
        }
      })
    },
    async status(userId: number) {
      const subscription = await latest(db, userId)
      return { ...await access(userId), ready: options.enabled && ready, canManage: ready, subscription: subscription ? { plan: subscription.plan, mode: subscription.mode, status: subscription.status } : null }
    },
    async checkout(userId: number, plan: BillingPlan, mode: Subscription['mode'] = 'recorrente') {
      if (!options.enabled) throw new HttpError(503, 'As assinaturas ainda não estão disponíveis. Nenhuma cobrança foi iniciada.')
      configured()
      const user = await repo.email(db, userId)
      if (!user) throw new HttpError(404, 'Conta não encontrada.')
      // Registro persistido ANTES da chamada externa. Falha ambígua não provoca uma segunda assinatura.
      const local = await db.transaction(async tx => {
        await repo.lockEmail(tx, user.email)
        await lock(tx, userId)
        if ((await access(userId, tx)).hasAccess) throw new HttpError(409, 'Você já tem acesso ativo. Consulte sua assinatura.')
        const current = await latest(tx, userId)
        if (current && !['cancelled', 'failed','completed'].includes(current.status)) {
          if (current.plan === plan && current.mode === mode) return current
          await cancelUnpaid(tx, current)
        }
        const purchase = await repo.openByEmail(tx, user.email.toLowerCase())
        if (purchase?.user_id === null) {
          if (purchase.plan !== plan || purchase.mode !== mode) throw new HttpError(409, 'Retome o plano escolhido na compra original ou fale com o atendimento.')
          await repo.assign(tx, purchase.id, userId)
          return { ...purchase, user_id: userId }
        }
        return (await repo.create(tx, randomUUID(), userId, plan, mode))!
      })
      return openCheckout(local, user.email, '/assinatura?retorno=1')
    },
    async refresh(userId: number) {
      configured()
      const local = await latest(db, userId)
      if (local) await refreshLocal(local)
      return this.status(userId)
    },
    async cancel(userId: number) {
      configured()
      await db.transaction(async tx => {
        await lock(tx, userId)
        const local = await latest(tx, userId)
        if (!local || ['cancelled', 'failed','completed'].includes(local.status)) return
        if (local.mode === 'avulso') throw new HttpError(409, 'Esta compra não tem renovação automática. Consulte o atendimento para cancelar um pagamento.')
        if (!local.mp_id) throw new HttpError(409, 'A criação ainda precisa de conciliação. Entre em contato com o atendimento.')
        const remote = await mp.cancel(local.mp_id)
        verifySubscription(remote, local)
        if (remote.status !== 'cancelled') throw new HttpError(502, 'O cancelamento ainda não foi confirmado pelo Mercado Pago.')
        await repo.cancel(tx, local.id)
      })
      // O período já pago permanece; cancelar interrompe as próximas cobranças.
      return this.status(userId)
    },
    async webhook(type: string, id: string) {
      configured()
      if (type === 'subscription_preapproval') {
        const local = await resolveSubscription(id)
        if (local) await db.transaction(async tx => { await lockSubscription(tx, local); await syncSubscription(tx, local) })
      } else if (type === 'subscription_authorized_payment') {
        const invoice = await mp.invoice(id)
        await resolveSubscription(invoice.preapproval_id)
        await syncInvoice(invoice)
      }
      else if (type === 'payment') {
        if (await single.sync(await mp.payment(id))) return
        for (const invoice of (await mp.invoices({ payment_id: id })).filter(i => String(i.payment?.id) === id).slice(0, 5)) {
          await resolveSubscription(invoice.preapproval_id)
          await syncInvoice(invoice)
        }
      }
    },
  }
}
export type BillingService = ReturnType<typeof createBillingService>
