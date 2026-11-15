// A bola da abertura como sprite de jogo 8 bits: uma grade de 40 × 40 blocos, com o couro em faixas de
// cor (sem degradê) e as costuras desenhadas bloco a bloco.

/** Blocos por lado; o viewBox do desenho é LADO × LADO. */
export const LADO = 40
const CENTRO = LADO / 2
const RAIO = 19
const COSTURA = '#1d0f05'
// Do brilho (em cima, à esquerda) para a sombra: as faixas do couro.
const COURO = ['#ffb37a', '#ff9a52', '#f97a26', '#ee6210', '#c24c08', '#a83d05']
const TONS = COURO.length
const LUZ = { x: 0.36 * LADO, y: 0.3 * LADO }

// Costuras curvas: a mesma curva de Bézier do desenho antigo (400 × 400), na escala da grade, e o espelho dela.
const CURVA = [
  [6.4, 6.8],
  [13.4, 13],
  [13.4, 27],
  [6.4, 33.2],
] as const
const pontosDaCurva = Array.from({ length: 200 }, (_, i) => {
  const t = i / 199
  const u = 1 - t
  const em = (k: 0 | 1) => u ** 3 * CURVA[0][k] + 3 * u * u * t * CURVA[1][k] + 3 * u * t * t * CURVA[2][k] + t ** 3 * CURVA[3][k]
  return [em(0), em(1)] as const
})

function ehCostura(x: number, y: number) {
  // Cruz do meio: dois blocos de espessura.
  if (Math.abs(x - CENTRO) < 1 || Math.abs(y - CENTRO) < 1) return true
  // As duas curvas são espelhadas: basta medir a distância no lado esquerdo.
  const xe = x < CENTRO ? x : LADO - x
  return pontosDaCurva.some(([cx, cy]) => Math.hypot(xe - cx, y - cy) < 0.95)
}

/** Tom do bloco (coluna, linha): 0 (brilho) a 5 (sombra), 'costura', ou null fora da bola. */
export function tomDoBloco(coluna: number, linha: number): number | 'costura' | null {
  const x = coluna + 0.5
  const y = linha + 0.5
  if (Math.hypot(x - CENTRO, y - CENTRO) > RAIO) return null
  if (ehCostura(x, y)) return 'costura'
  const sombra = Math.hypot(x - LUZ.x, y - LUZ.y) / (0.8 * LADO)
  return Math.min(TONS - 1, Math.floor(sombra * TONS))
}

export interface Faixa { x: number; y: number; largura: number; cor: string }

// A bola em faixas horizontais: blocos vizinhos do mesmo tom viram um retângulo só.
const FAIXAS = (() => {
  const faixas: { x: number; y: number; largura: number; tom: number | 'costura' }[] = []
  for (let y = 0; y < LADO; y++) {
    let atual: (typeof faixas)[number] | null = null
    for (let x = 0; x < LADO; x++) {
      const tom = tomDoBloco(x, y)
      if (atual && tom === atual.tom) atual.largura++
      else {
        atual = tom === null ? null : { x, y, largura: 1, tom }
        if (atual) faixas.push(atual)
      }
    }
  }
  return faixas
})()

/** A bola pintada com seis tons de couro (do brilho à sombra) e a cor da costura. */
export function faixasDaBola(couro: readonly string[] = COURO, costura = COSTURA): Faixa[] {
  return FAIXAS.map(({ tom, ...f }) => ({ ...f, cor: tom === 'costura' ? costura : couro[tom] }))
}

/** A bola laranja da abertura. */
export const FAIXAS_DA_BOLA = faixasDaBola()
