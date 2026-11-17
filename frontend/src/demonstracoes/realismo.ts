// Medidas de realismo das demonstrações em 3D: o que um olho atento estranharia num vídeo.
// Usadas pelos testes (para nenhuma coreografia piorar) e para achar os piores movimentos.
import { corpoNoTempo, distancia, MEDIDAS, type Corpo3D, type V3 } from './corpo3d'
import { preparar, type Coreografia } from './motor'

const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z

/** Distância de um ponto ao segmento AB. */
export function distSegmento(p: V3, a: V3, b: V3) {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / Math.max(1e-9, dot(ab, ab))))
  return distancia(p, { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t })
}

/** Raios (m) das cápsulas do corpo usadas nas medidas: tronco, coxa, canela e cabeça. */
export const VOLUMES = { tronco: 0.13, coxa: 0.075, canela: 0.05, cabeca: 0.1 }

export interface Medidas {
  /** Quanto a bola entrou no tronco/cabeça (m). */
  bolaNoTronco: number
  /** Quanto a bola entrou nas pernas (m). */
  bolaNasPernas: number
  /** Quanto a mão entrou no tronco (m). */
  maoNoTronco: number
  /** Maior distância entre a palma e a superfície da bola, com a bola presa (m). */
  maoLongeDaBola: number
  /** Joelho dobrado para trás (m de desvio da linha quadril-tornozelo para trás). */
  joelhoParaTras: number
  /** Maiores acelerações (m/s²) da pelve e das mãos: trancos. */
  trancoPelve: number
  trancoMao: number
  /** Bola abaixo do chão (m). */
  bolaNoChao: number
}

export function penetracoes(c: Corpo3D) {
  const R = MEDIDAS.raioBola
  let bolaNoTronco = 0
  let bolaNasPernas = 0
  let maoLongeDaBola = 0
  let bolaNoChao = 0
  for (const b of c.bolas) {
    const p = b.centro
    bolaNoTronco = Math.max(bolaNoTronco, VOLUMES.tronco + R - distSegmento(p, c.pelve, c.pescoco), VOLUMES.cabeca + R - distancia(p, c.cabeca))
    for (const l of ['F', 'T'] as const) {
      const perna = c.perna[l]
      bolaNasPernas = Math.max(bolaNasPernas, VOLUMES.coxa + R - distSegmento(p, perna.raiz, perna.meio), VOLUMES.canela + R - distSegmento(p, perna.meio, perna.ponta))
    }
    if (b.presa > 0.85) {
      const perto = Math.min(distancia(c.braco.P.ponta, p), distancia(c.braco.L.ponta, p))
      maoLongeDaBola = Math.max(maoLongeDaBola, perto - R)
    }
    bolaNoChao = Math.max(bolaNoChao, R - p.y - 0.005)
  }
  let maoNoTronco = 0
  for (const l of ['P', 'L'] as const) maoNoTronco = Math.max(maoNoTronco, VOLUMES.tronco - distSegmento(c.braco[l].ponta, c.pelve, c.pescoco))
  let joelhoParaTras = 0
  for (const l of ['F', 'T'] as const) {
    const perna = c.perna[l]
    const meio = { x: (perna.raiz.x + perna.ponta.x) / 2, y: (perna.raiz.y + perna.ponta.y) / 2, z: (perna.raiz.z + perna.ponta.z) / 2 }
    const desvio = dot(sub(perna.meio, meio), c.pelvia.frente)
    joelhoParaTras = Math.max(joelhoParaTras, -desvio)
  }
  return { bolaNoTronco: Math.max(0, bolaNoTronco), bolaNasPernas: Math.max(0, bolaNasPernas), maoNoTronco: Math.max(0, maoNoTronco), maoLongeDaBola, joelhoParaTras, bolaNoChao: Math.max(0, bolaNoChao) }
}

/** Mede uma coreografia inteira, a cada `passo` ms. */
export function medir(c: Coreografia, passo = 1000 / 60): Medidas {
  const anim = preparar(c)
  const m: Medidas = { bolaNoTronco: 0, bolaNasPernas: 0, maoNoTronco: 0, maoLongeDaBola: 0, joelhoParaTras: 0, trancoPelve: 0, trancoMao: 0, bolaNoChao: 0 }
  const hist: Corpo3D[] = []
  const dt = passo / 1000
  for (let t = 0; t <= anim.total; t += passo) {
    const corpo = corpoNoTempo(anim, t, c.cena)
    const p = penetracoes(corpo)
    for (const k of Object.keys(p) as (keyof typeof p)[]) m[k] = Math.max(m[k], p[k])
    hist.push(corpo)
    if (hist.length >= 3) {
      const [a, b, d] = hist.slice(-3)
      const acel = (f: (x: Corpo3D) => V3) => {
        const pa = f(a)
        const pb = f(b)
        const pd = f(d)
        return Math.hypot(pa.x - 2 * pb.x + pd.x, pa.y - 2 * pb.y + pd.y, pa.z - 2 * pb.z + pd.z) / (dt * dt)
      }
      // A volta do fim para o começo (loop) não conta.
      if (t > 3 * passo) {
        m.trancoPelve = Math.max(m.trancoPelve, acel((x) => x.pelve))
        m.trancoMao = Math.max(m.trancoMao, acel((x) => x.braco.P.ponta), acel((x) => x.braco.L.ponta))
      }
    }
  }
  return m
}
