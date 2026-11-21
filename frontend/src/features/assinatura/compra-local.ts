import type { PlanoAssinatura, ModoPagamento } from '../../../../contracts/billing'

const STORAGE = 'bp.compra-pendente'
export type CompraLocal = { key: string; email: string; plan: PlanoAssinatura; mode?: ModoPagamento }
export function compraLocal(): CompraLocal | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE) ?? 'null') as CompraLocal | null
    return value && /^[a-f0-9]{64}$/.test(value.key) && typeof value.email === 'string' && ['mensal','anual'].includes(value.plan) ? value : null
  } catch { return null }
}
export function prepararCompra(email: string, plan: PlanoAssinatura, mode: ModoPagamento = 'recorrente') {
  const previous = compraLocal()
  if (previous && previous.email !== email) throw new Error('Você já iniciou uma compra. Retome o pagamento anterior antes de alterar o e-mail.')
  // Reutiliza a chave: só o servidor pode conciliar/cancelar a tentativa anterior antes de trocar o plano.
  const value = { email, plan, mode, key: previous?.key ?? [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2,'0')).join('') }
  try { sessionStorage.setItem(STORAGE, JSON.stringify(value)) } catch { throw new Error('Permita o armazenamento deste navegador para continuar com segurança.') }
  return value
}
export function limparCompra() { try { sessionStorage.removeItem(STORAGE) } catch { /* apenas a referência local */ } }
