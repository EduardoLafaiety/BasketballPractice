import type { Tema } from '../types'

const CHAVE = 'bp.tema'

/** Aplica o tema no <html>; "sistema" segue o prefers-color-scheme. */
export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'sistema') delete raiz.dataset.theme
  else raiz.dataset.theme = tema === 'escuro' ? 'dark' : 'light'
  // Guardado localmente para aplicar antes do login carregar (evita piscar o tema errado).
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // sem armazenamento: aplica só nesta visita
  }
}

export function temaSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo === 'claro' || salvo === 'escuro' ? salvo : 'sistema'
  } catch {
    return 'sistema'
  }
}
