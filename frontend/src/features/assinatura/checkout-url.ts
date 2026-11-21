import type { ModoPagamento } from '../../../../contracts/billing'

export function destinoPagamento(value: string, mode: ModoPagamento) {
  const url = new URL(value)
  const path = mode === 'avulso' ? '/checkout/v1/redirect' : '/subscriptions/checkout'
  if (url.protocol !== 'https:' || url.hostname !== 'www.mercadopago.com.br' || url.username || url.password || url.pathname !== path) throw new Error('Endereço de pagamento inválido.')
  return url.href
}
