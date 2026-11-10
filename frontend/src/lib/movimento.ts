import { useSyncExternalStore } from 'react'

// Animações e efeitos do site (rolagem, mouse, demonstrações). Ficam ligados por padrão, mesmo com o
// "menos movimento" do sistema: muita gente tem isso desligado sem saber, e o site perde a cara.
// Quem precisa de menos movimento escolhe em Configurações; a escolha vale para este aparelho.
export type Animacoes = 'ligadas' | 'sistema' | 'desligadas'

const CHAVE = 'bp.animacoes'
const EVENTO = 'bp:animacoes'
const consulta = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')

export function animacoesSalvas(): Animacoes {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo === 'sistema' || salvo === 'desligadas' ? salvo : 'ligadas'
  } catch {
    return 'ligadas'
  }
}

/** Se o site deve evitar movimento agora, pela escolha do atleta (e pelo sistema, se for o caso). */
export function menosMovimento(): boolean {
  if (typeof window === 'undefined') return false
  const escolha = animacoesSalvas()
  if (escolha === 'desligadas') return true
  return escolha === 'sistema' && !!consulta()?.matches
}

/** Marca o <html> para o CSS: data-movimento="reduzido" desliga transições e efeitos de rolagem. */
export function aplicarMovimento() {
  document.documentElement.dataset.movimento = menosMovimento() ? 'reduzido' : 'normal'
}

export function definirAnimacoes(escolha: Animacoes) {
  try {
    localStorage.setItem(CHAVE, escolha)
  } catch {
    // sem armazenamento: vale só nesta visita (fica no padrão)
  }
  aplicarMovimento()
  window.dispatchEvent(new Event(EVENTO))
}

function assinar(avisar: () => void) {
  const mudouSistema = () => {
    aplicarMovimento()
    avisar()
  }
  window.addEventListener(EVENTO, avisar)
  consulta()?.addEventListener?.('change', mudouSistema)
  return () => {
    window.removeEventListener(EVENTO, avisar)
    consulta()?.removeEventListener?.('change', mudouSistema)
  }
}

/** A escolha atual, atualizando o componente quando ela (ou o sistema) muda. */
export function useAnimacoes() {
  const escolha = useSyncExternalStore(assinar, animacoesSalvas, () => 'ligadas' as Animacoes)
  const reduzido = useSyncExternalStore(assinar, menosMovimento, () => false)
  return { escolha, reduzido }
}
