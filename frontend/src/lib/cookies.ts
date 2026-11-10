import { useSyncExternalStore } from 'react'

// Escolha do visitante sobre os cookies que não são necessários para o site funcionar: hoje, só os de
// anúncios personalizados (Google AdSense). Sessão, tema e preferências não dependem desta escolha.
// Sem resposta ou com recusa, o AdSense deve pedir só anúncios não personalizados. Vale para este navegador.
export type Consentimento = 'aceito' | 'recusado'

const CHAVE = 'bp.cookies'
const EVENTO = 'bp:cookies'
// Sobe quando o uso de cookies mudar de um jeito que peça uma nova resposta; a antiga deixa de valer.
const VERSAO = 1

let aberto = false

export function consentimentoSalvo(): Consentimento | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as { versao?: number; escolha?: string } | null
    if (salvo?.versao !== VERSAO) return null
    return salvo.escolha === 'aceito' || salvo.escolha === 'recusado' ? salvo.escolha : null
  } catch {
    return null
  }
}

/** Se os anúncios podem ser personalizados. Falso: o AdSense recebe requestNonPersonalizedAds = 1. */
export function anunciosPermitidos() {
  return consentimentoSalvo() === 'aceito'
}

export function definirConsentimento(escolha: Consentimento) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ versao: VERSAO, escolha, em: new Date().toISOString() }))
  } catch {
    // sem armazenamento: vale só nesta visita, e o aviso volta na próxima
  }
  aberto = false
  window.dispatchEvent(new Event(EVENTO))
}

/** Mostra o aviso de novo, para o visitante mudar a escolha. */
export function abrirPreferenciasCookies() {
  aberto = true
  window.dispatchEvent(new Event(EVENTO))
}

/** Fecha o aviso aberto pelas preferências sem mudar a escolha. */
export function fecharPreferenciasCookies() {
  aberto = false
  window.dispatchEvent(new Event(EVENTO))
}

const avisoVisivel = () => aberto || consentimentoSalvo() === null

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar)
  window.addEventListener('storage', avisar)
  return () => {
    window.removeEventListener(EVENTO, avisar)
    window.removeEventListener('storage', avisar)
  }
}

/** A escolha atual e se o aviso deve aparecer, atualizando quando muda (até em outra aba). */
export function useConsentimento() {
  const escolha = useSyncExternalStore(assinar, consentimentoSalvo, () => null)
  const visivel = useSyncExternalStore(assinar, avisoVisivel, () => false)
  return { escolha, visivel }
}
