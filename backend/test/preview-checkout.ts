// Somente prévia em loopback, com provedor simulado e banco em memória. Não use em produção.
import express from 'express'
import { createApp } from '../src/app.js'
import { openTestDatabase } from './pglite.js'
import type { MercadoPago, MpInvoice, MpPayment, MpSubscription } from '../src/modules/billing/mercado-pago.js'
import type { Email } from '../src/lib/email.js'
import { fakeCheckoutPro } from './fake-checkout-pro.js'
const db = await openTestDatabase()
const subscriptions = new Map<string, MpSubscription>(), invoices = new Map<string, MpInvoice>(), payments = new Map<string, MpPayment>()
let count = 0
const client: MercadoPago = {
  ...fakeCheckoutPro(payments, true).client,
  async create(body) {
    const n = ++count, id = `preview${n}`, now = new Date().toISOString()
    const remote: MpSubscription = { id, external_reference: String(body.external_reference), collector_id: 123, status: 'authorized', init_point: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=${id}`, last_modified: now, auto_recurring: body.auto_recurring as MpSubscription['auto_recurring'] }
    subscriptions.set(id, remote)
    invoices.set(String(n), { id: n, preapproval_id: id, external_reference: remote.external_reference, debit_date: now, payment: { id: n, status: 'approved' } })
    payments.set(String(n), { id: n, status: 'approved', transaction_amount: remote.auto_recurring.transaction_amount, currency_id: 'BRL', collector_id: 123, live_mode: false, date_approved: now, date_last_updated: now })
    return remote
  },
  async subscription(id) { return subscriptions.get(id)! },
  async cancel(id) { const value = subscriptions.get(id)!; value.status = 'cancelled'; return value },
  async invoice(id) { return invoices.get(id)! },
  async invoices(filter) { return [...invoices.values()].filter(i => filter.preapproval_id ? i.preapproval_id === filter.preapproval_id : String(i.payment?.id) === filter.payment_id) },
  async payment(id) { return payments.get(id)! },
}
const outbox: Email[] = []
const server = express()
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]!)
server.get('/dev/emails', (_req,res) => {
  res.setHeader('Cache-Control','no-store')
  res.type('html').send(`<html lang="pt-BR"><meta charset="utf-8"><title>E-mails da prévia local</title><body style="font:18px system-ui;background:#12161d;color:#f4f7fb;padding:32px"><h1>E-mails da prévia local</h1><p>Nenhum e-mail foi enviado. Use o link abaixo para conferir a ativação local.</p>${outbox.map(email => `<article><h2>${escape(email.subject)}</h2><p>${escape(email.to)}</p>${email.text.split('\n').map(line => line.startsWith('http://127.0.0.1:5181/') ? `<p><a style="color:#ffb077" href="${escape(line)}">Abrir link de ativação local</a></p>` : `<p>${escape(line)}</p>`).join('')}</article>`).join('')}<a style="color:#ffb077" href="/">Voltar ao site</a></body></html>`)
})
server.use(createApp(db, { emails: { send: async email => { outbox.push(email) } }, billing: { enabled: true, accessToken: 'preview-only', webhookSecret: 'preview-only', collectorId: '123', liveMode: false, appUrl: 'http://127.0.0.1:5181', client } }))
server.listen(3341,'127.0.0.1', () => console.log('Prévia: http://127.0.0.1:3341/api — provedor simulado, sem cobranças reais'))
