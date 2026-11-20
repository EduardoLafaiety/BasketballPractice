export type PlanoAssinatura = 'mensal' | 'anual'
export type ModoPagamento = 'recorrente' | 'avulso'
export interface EstadoCompra {
  email: string
  plan: PlanoAssinatura
  mode?: ModoPagamento
  paid: boolean
  paidUntil: string | null
  status: string
  url: string | null
}
export interface EstadoAssinatura {
  required: boolean
  hasAccess: boolean
  ready: boolean
  canManage?: boolean
  paidUntil: string | null
  subscription: { plan: PlanoAssinatura; mode?: ModoPagamento; status: string } | null
}
