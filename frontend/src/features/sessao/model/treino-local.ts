import type { NovaSessao } from '../../../shared/types'

const PREFIXO = 'bp.treino.v1.'
const chave = (conta: string, tipo: string) => `${PREFIXO}${conta}.${tipo}`

export function lerLocal<T>(conta: string, tipo: string): T | null {
  try {
    const valor = JSON.parse(localStorage.getItem(chave(conta, tipo)) ?? 'null')
    if (valor && typeof valor === 'object' && 'versaoRascunho' in valor) return valor.versaoRascunho === 2 ? valor.dados as T : null
    return valor as T | null
  }
  catch { return null }
}

/** A falha precisa chegar à interface: sem armazenamento, não prometa um treino salvo. */
export function gravarLocal(conta: string, tipo: string, dados: unknown) {
  localStorage.setItem(chave(conta, tipo), JSON.stringify(tipo === 'rascunho' ? { versaoRascunho: 2, dados } : dados))
  window.dispatchEvent(new Event('treino-local'))
}

export function removerLocal(conta: string, tipo: string) {
  localStorage.removeItem(chave(conta, tipo))
  window.dispatchEvent(new Event('treino-local'))
}

const prefixoItem = (conta: string) => `bp.treino.v2.${conta}.pendente.`
const chaveItem = (conta: string, id: string) => prefixoItem(conta) + id
function sessaoValida(s: unknown): s is NovaSessao {
  if (!s || typeof s !== 'object') return false
  const d = s as NovaSessao
  return typeof d.clientId === 'string' && typeof d.data === 'string' && Number.isFinite(Date.parse(d.data)) &&
    Number.isFinite(d.duracaoMin) && Array.isArray(d.entradas) && d.entradas.every((e) => e && typeof e.drillId === 'string')
}

/** Itens independentes evitam que duas abas sobrescrevam a fila inteira. O legado permanece até a confirmação. */
export function pendentes(conta: string): NovaSessao[] {
  const antigos = lerLocal<unknown>(conta, 'fila')
  const itens = new Map<string, NovaSessao>()
  if (Array.isArray(antigos)) for (const s of antigos) if (sessaoValida(s)) itens.set(s.clientId!, s)
  let chaves: string[] = []
  try { chaves = Object.keys(localStorage) } catch { return [...itens.values()] }
  for (const k of chaves.filter((k) => k.startsWith(prefixoItem(conta)))) {
    try {
      const item = JSON.parse(localStorage.getItem(k)!)
      if (item.versao === 2 && sessaoValida(item.sessao)) itens.set(item.sessao.clientId, item.sessao)
    } catch { /* O registro inválido é preservado para recuperação, não é enviado. */ }
  }
  return [...itens.values()]
}

export function enfileirar(conta: string, sessao: NovaSessao) {
  if (!sessaoValida(sessao)) throw new Error('Não foi possível guardar a sessão: dados locais inválidos.')
  localStorage.setItem(chaveItem(conta, sessao.clientId!), JSON.stringify({ versao: 2, sessao }))
  window.dispatchEvent(new Event('treino-local'))
}

export function removerPendente(conta: string, id: string) {
  const antiga = lerLocal<unknown>(conta, 'fila')
  // Não descarta registros antigos desconhecidos durante a migração.
  if (Array.isArray(antiga)) localStorage.setItem(chave(conta, 'fila'), JSON.stringify(antiga.filter((s) => !s || s.clientId !== id)))
  localStorage.removeItem(chaveItem(conta, id))
  window.dispatchEvent(new Event('treino-local'))
}

export function limparTreinosLocais() {
  for (const k of Object.keys(localStorage)) if (/^bp\.treino\.v[12]\./.test(k)) localStorage.removeItem(k)
}

export function temTreinosLocais() {
  try { return Object.keys(localStorage).some((k) => /^bp\.treino\.v[12]\./.test(k) && localStorage.getItem(k) !== '[]') }
  catch { return false }
}

// Uma fila por conta, inclusive se mais de um componente pedir sincronização.
const envios = new Map<string, Promise<void>>()
export function sincronizar(conta: string, enviar: (s: NovaSessao) => Promise<unknown>, ativa: () => boolean) {
  const existente = envios.get(conta)
  if (existente) return existente
  const executar = async () => {
    for (const s of pendentes(conta)) {
      if (!ativa()) return
      await enviar(s)
      if (!ativa()) return
      // Releitura preserva sessões adicionadas enquanto a rede respondia.
      const atual = pendentes(conta).find((p) => p.clientId === s.clientId)
      if (JSON.stringify(atual) === JSON.stringify(s)) removerPendente(conta, s.clientId!)
    }
  }
  const envio = (navigator.locks ? navigator.locks.request(`bp-treino-envio:${conta}`, executar) : executar()).finally(() => { envios.delete(conta) })
  envios.set(conta, envio)
  return envio
}
