import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from '../../lib/http-error.js'

export interface MpSubscription {
  id: string; external_reference: string; collector_id: number; status: string; init_point?: string; last_modified: string
  auto_recurring: { frequency: number; frequency_type: string; transaction_amount: number; currency_id: string }
}
export interface MpInvoice {
  id: number; preapproval_id: string; external_reference?: string; debit_date: string
  payment?: { id: number; status: string }
}
export interface MpPayment {
  id: number; status: string; transaction_amount: number; transaction_amount_refunded?: number
  currency_id: string; collector_id: number; live_mode: boolean; date_approved: string | null; date_last_updated: string
}
export interface MercadoPago {
  create(body: Record<string, unknown>, key: string): Promise<MpSubscription>
  subscription(id: string): Promise<MpSubscription>
  cancel(id: string): Promise<MpSubscription>
  invoice(id: string): Promise<MpInvoice>
  invoices(filter: { preapproval_id?: string; payment_id?: string }): Promise<MpInvoice[]>
  payment(id: string): Promise<MpPayment>
}

export function mercadoPago(accessToken: string): MercadoPago {
  async function request<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> {
    try {
      const response = await fetch(`https://api.mercadopago.com${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(6000),
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(key ? { 'X-Idempotency-Key': key } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      if (!response.ok) throw new HttpError(502, 'O Mercado Pago não confirmou a operação. Tente consultar sua assinatura antes de repetir.')
      return await response.json() as T
    } catch (error) {
      if (error instanceof HttpError) throw error
      // Não expõe token, resposta do provedor ou dados do pagador nos logs/cliente.
      throw new HttpError(503, 'Não foi possível confirmar a resposta do Mercado Pago. Consulte sua assinatura antes de tentar novamente.')
    }
  }
  return {
    create: (body, key) => request('/preapproval', 'POST', body, key),
    subscription: id => request(`/preapproval/${encodeURIComponent(id)}`),
    cancel: id => request(`/preapproval/${encodeURIComponent(id)}`, 'PUT', { status: 'cancelled' }),
    invoice: id => request(`/authorized_payments/${encodeURIComponent(id)}`),
    // A busca de faturas usa o limite padrão do provedor. limit=100 é recusado
    // por esta API, embora outros endpoints de busca aceitem esse valor.
    invoices: async filter => (await request<{ results: MpInvoice[] }>(`/authorized_payments/search?${new URLSearchParams({ ...filter, sort: 'debit_date:desc' })}`)).results,
    payment: id => request(`/v1/payments/${encodeURIComponent(id)}`),
  }
}

/** Manifesto do MP: usa data.id da query, nunca o identificador indicado apenas no corpo. */
export function validWebhook(secret: string, signature: string, requestId: string, dataId: string, now = Date.now()) {
  const parts = Object.fromEntries(signature.split(',').map(p => p.trim().split('=')))
  const ts = parts.ts
  if (!secret || !requestId || !/^[\w-]{1,160}$/.test(requestId) || !/^[a-zA-Z0-9-]{1,160}$/.test(dataId) || !/^\d{10,13}$/.test(ts ?? '') || !/^[a-fA-F0-9]{64}$/.test(parts.v1 ?? '')) return false
  const timestamp = Number(ts) * (ts.length === 10 ? 1000 : 1)
  if (Math.abs(now - timestamp) > 300_000) return false
  const expected = createHmac('sha256', secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest()
  return timingSafeEqual(expected, Buffer.from(parts.v1, 'hex'))
}

export function checkoutUrl(value: string | undefined) {
  if (!value) throw new HttpError(502, 'O Mercado Pago não retornou o endereço de pagamento.')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.hostname !== 'www.mercadopago.com.br' || url.username || url.password || !url.pathname.startsWith('/subscriptions/checkout')) throw new HttpError(502, 'Endereço de pagamento inválido.')
  return url.href
}
