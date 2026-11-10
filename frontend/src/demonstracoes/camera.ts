// Câmera da demonstração: enquadra o atleta (e a bola, e o parceiro) com zoom, como quem filma da
// lateral da quadra. O chão fica sempre na parte de baixo; o zoom abre quando a bola vai longe.
import { CHAO, type Instante } from './motor'

/** Área da cena que a câmera pode mostrar (o mapa de pegadas fica fora dela). */
export const QUADRO = { w: 680, h: 320 }
const ZOOM_MAX = 1.9
const FOLGA_LADO = 55
const FOLGA_TOPO = 30

/** O que a câmera quer mostrar: o centro horizontal e o zoom. */
export interface Mira {
  cx: number
  z: number
}

/** Janela visível, em coordenadas da cena. */
export interface Janela {
  x: number
  y: number
  w: number
  h: number
  z: number
}

export function mirar(agora: Instante): Mira {
  const pontos = [...Object.values(agora.e), agora.bola, agora.bola2].filter((p) => p !== null)
  let min = Math.min(...pontos.map((p) => p.x))
  let max = Math.max(...pontos.map((p) => p.x))
  // A cabeça fica 12 acima do centro dela.
  let topo = Math.min(...pontos.map((p) => p.y), agora.e.cabeca.y - 12)
  if (agora.px !== undefined) {
    min = Math.min(min, agora.px - 25)
    max = Math.max(max, agora.px + 25)
    topo = Math.min(topo, CHAO - 175)
  }
  const largura = max - min + 2 * FOLGA_LADO
  const altura = QUADRO.h - (topo - FOLGA_TOPO)
  const z = Math.max(1, Math.min(ZOOM_MAX, QUADRO.w / largura, QUADRO.h / altura))
  return { cx: (min + max) / 2, z }
}

/** A janela para uma mira: o chão preso embaixo e sem sair da cena dos lados. */
export function janela({ cx, z }: Mira): Janela {
  const w = QUADRO.w / z
  const h = QUADRO.h / z
  return { x: Math.max(0, Math.min(QUADRO.w - w, cx - w / 2)), y: QUADRO.h - h, w, h, z }
}

/**
 * Aproxima a câmera da mira aos poucos (dt em ms de tela), como um cinegrafista que acompanha o
 * lance em vez de pular junto com cada movimento.
 */
export function seguir(atual: Mira, alvo: Mira, dt: number): Mira {
  const k = 1 - Math.exp(-dt / 220)
  return { cx: atual.cx + (alvo.cx - atual.cx) * k, z: atual.z + (alvo.z - atual.z) * k }
}
