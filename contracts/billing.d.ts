export type PlanoAssinatura = 'mensal' | 'anual'
export interface EstadoAssinatura {
  required: boolean
  hasAccess: boolean
  ready: boolean
  canManage?: boolean
  paidUntil: string | null
  subscription: { plan: PlanoAssinatura; status: string } | null
}
