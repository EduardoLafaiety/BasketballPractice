import type { NovaSessao } from '../types'

const PREFIXO = 'bp.treino.v1.'
const chave = (conta: string, tipo: string) => `${PREFIXO}${conta}.${tipo}`

export function lerLocal<T>(conta: string, tipo: string): T | null {
  try { return JSON.parse(localStorage.getItem(chave(conta, tipo)) ?? 'null') as T | null }
  catch { return null }
}

/** A falha precisa chegar à interface: sem armazenamento, não prometa um treino salvo. */
export function gravarLocal(conta: string, tipo: string, dados: unknown) {
  localStorage.setItem(chave(conta, tipo), JSON.stringify(dados))
  window.dispatchEvent(new Event('treino-local'))
}

export function removerLocal(conta: string, tipo: string) {
  localStorage.removeItem(chave(conta, tipo))
  window.dispatchEvent(new Event('treino-local'))
}

export function pendentes(conta: string): NovaSessao[] {
  const fila = lerLocal<unknown>(conta, 'fila')
  return Array.isArray(fila) ? fila.filter((s): s is NovaSessao => s && typeof s.clientId === 'string' && typeof s.data === 'string' && Array.isArray(s.entradas)) : []
}

export function enfileirar(conta: string, sessao: NovaSessao) {
  const fila = pendentes(conta)
  gravarLocal(conta, 'fila', [...fila.filter((s) => s.clientId !== sessao.clientId), sessao])
}

export function limparTreinosLocais() {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIXO)) localStorage.removeItem(k)
}

export function temTreinosLocais() {
  try { return Object.keys(localStorage).some((k) => k.startsWith(PREFIXO) && localStorage.getItem(k) !== '[]') }
  catch { return false }
}

// Uma fila por conta, inclusive se mais de um componente pedir sincronização.
const envios = new Map<string, Promise<void>>()
export function sincronizar(conta: string, enviar: (s: NovaSessao) => Promise<unknown>, ativa: () => boolean) {
  const existente = envios.get(conta)
  if (existente) return existente
  const envio = (async () => {
    for (const s of pendentes(conta)) {
      if (!ativa()) return
      await enviar(s)
      if (!ativa()) return
      // Releitura preserva sessões adicionadas enquanto a rede respondia.
      gravarLocal(conta, 'fila', pendentes(conta).filter((p) => p.clientId !== s.clientId))
    }
  })().finally(() => { envios.delete(conta) })
  envios.set(conta, envio)
  return envio
}
