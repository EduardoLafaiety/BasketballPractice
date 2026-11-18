import type { NovaSessao } from '../../../shared/types'
import { sessaoValida } from './validacao-local'
import { rascunhoValido } from './sessao'

const PREFIXO = 'bp.treino.v1.'
const chave = (conta: string, tipo: string) => `${PREFIXO}${conta}.${tipo}`

export function lerLocal<T>(conta: string, tipo: string): T | null {
  try {
    const valor = JSON.parse(localStorage.getItem(chave(conta, tipo)) ?? 'null')
    if (tipo === 'rascunho' && valor && typeof valor === 'object' && 'versaoRascunho' in valor) return valor.versaoRascunho === 2 ? valor.dados as T : null
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
      if (item?.versao === 2 && sessaoValida(item.sessao) && k === chaveItem(conta, item.sessao.clientId)) itens.set(item.sessao.clientId, item.sessao)
      else itens.delete(k.slice(prefixoItem(conta).length))
    } catch { itens.delete(k.slice(prefixoItem(conta).length)) /* Não envia o legado se a versão mais recente é desconhecida. */ }
  }
  return [...itens.values()]
}

/** Dados desconhecidos permanecem no aparelho e podem ser exportados antes de qualquer descarte. */
export function registrosComProblema(conta: string): string[] {
  const problemas: string[] = []
  try {
    for (const k of Object.keys(localStorage).filter((k) => k === chave(conta, 'rascunho') || k === chave(conta, 'fila') || k.startsWith(prefixoItem(conta)))) {
      try {
        const valor = JSON.parse(localStorage.getItem(k)!)
        if (k === chave(conta, 'rascunho')) {
          if (!rascunhoValido(valor?.versaoRascunho === 2 ? valor.dados : valor)) problemas.push(k)
        } else if (k === chave(conta, 'fila')) {
          if (!Array.isArray(valor) || !valor.every(sessaoValida)) problemas.push(k)
        } else if (valor?.versao !== 2 || !sessaoValida(valor.sessao) || k !== chaveItem(conta, valor.sessao.clientId)) problemas.push(k)
      } catch { problemas.push(k) }
    }
  } catch { /* A falha de armazenamento é mostrada ao gravar. */ }
  return problemas
}

export function exportarTreinosLocais(conta: string) {
  const registros = Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith(`${PREFIXO}${conta}.`) || k.startsWith(prefixoItem(conta)) || k === `bp.treino.v3.${conta}.offline`).map((k) => [k, localStorage.getItem(k)]))
  return JSON.stringify({ formato: 'basketball-practice-recuperacao-local', versao: 1, conta, registros }, null, 2)
}

export function descartarRegistrosInvalidos(conta: string) {
  for (const k of registrosComProblema(conta)) {
    if (k === chave(conta, 'fila')) {
      try {
        const valor = JSON.parse(localStorage.getItem(k)!)
        if (Array.isArray(valor)) { localStorage.setItem(k, JSON.stringify(valor.filter(sessaoValida))); continue }
      } catch { /* Apenas o registro inválido confirmado será removido. */ }
    }
    localStorage.removeItem(k)
  }
  window.dispatchEvent(new Event('treino-local'))
}

/** Detecta uma gravação de outra aba antes de sobrescrever o rascunho lido. */
export function criarGravadorRascunho(conta: string, esperado?: unknown) {
  let anterior: string | null = null
  try { anterior = localStorage.getItem(chave(conta, 'rascunho')) } catch { /* A gravação exibirá a falha. */ }
  const desatualizado = esperado !== undefined && JSON.stringify(lerLocal(conta, 'rascunho')) !== JSON.stringify(esperado)
  const guardar = (dados: unknown) => {
    if (desatualizado || localStorage.getItem(chave(conta, 'rascunho')) !== anterior) throw new Error('O rascunho mudou em outra aba. Reabra o treino para usar a versão mais recente.')
    gravarLocal(conta, 'rascunho', dados)
    anterior = localStorage.getItem(chave(conta, 'rascunho'))
  }
  return Object.assign(guardar, { remover: () => {
    if (!desatualizado && localStorage.getItem(chave(conta, 'rascunho')) === anterior) removerLocal(conta, 'rascunho')
  } })
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
  for (const k of Object.keys(localStorage)) if (/^bp\.treino\.v[123]\./.test(k)) localStorage.removeItem(k)
}

export function temTreinosLocais() {
  try { return Object.keys(localStorage).some((k) => /^bp\.treino\.v[12]\./.test(k) && localStorage.getItem(k) !== '[]') }
  catch { return false }
}
