import { TIME_DO_JOGADOR } from '../assets/jogadores/times'
import { TIMES } from '../equipamentos/dados'

// Fundo das faixas escuras (`--bg` de `.faixa-escura`).
const FUNDO = '#1f2019'
const CONTRASTE_MINIMO = 3
const CONTRASTE_CLAREAR = 2

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

/** Mistura a cor com branco (0 a 1), mantendo o tom. */
function clarear(hex: string, parte: number) {
  const canais = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16)
    return Math.round(c + (255 - c) * parte).toString(16).padStart(2, '0')
  })
  return `#${canais.join('').toUpperCase()}`
}

/**
 * Cor do time que se lê no fundo escuro. A principal fica como está; se for só um pouco escura (Celtics, Knicks), é
 * clareada sem perder o tom; se some no fundo (Nuggets, Nets), usa-se a segunda cor do time.
 */
export function corDoTimeNaFaixa(sigla: string): string | undefined {
  const time = TIMES.find((t) => t.sigla === sigla)
  if (!time) return undefined
  const c = contraste(time.cor, FUNDO)
  if (c >= CONTRASTE_MINIMO) return time.cor
  if (c >= CONTRASTE_CLAREAR) {
    for (let parte = 0.05; parte < 1; parte += 0.05) {
      const clara = clarear(time.cor, parte)
      if (contraste(clara, FUNDO) >= CONTRASTE_MINIMO) return clara
    }
  }
  if (contraste(time.costura, FUNDO) >= CONTRASTE_MINIMO) return time.costura
  return '#FFFFFF'
}

/** Cor do time atual do jogador (pelo id do estilo), já ajustada para o fundo escuro. */
export function corDoJogador(id: string): string | undefined {
  const sigla = TIME_DO_JOGADOR[id]
  return sigla ? corDoTimeNaFaixa(sigla) : undefined
}
