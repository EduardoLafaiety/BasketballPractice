// Peças das coreografias: poses prontas e trechos de movimento que se combinam em cada exercício.
import { esqueleto, POSE_NEUTRA, type Bola, type Cena, type Coreografia, type Lado, type Musculo, type Ponto, type Pose, type Quadro } from './motor'

export type P = Partial<Pose>
export type Q = Partial<Quadro>
/** Um passo da demonstração: título, explicação e os quadros dele. */
export type Passo = [titulo: string, texto: string, quadros: Q[]]

// Pernas
export const EM_PE: P = { t: 3, cF: 8, kF: 0, cT: -6, kT: -6 }
export const BASE: P = { t: 15, cF: 35, kF: 0, cT: -5, kT: -30 }
export const CARGA: P = { t: 15, cF: 45, kF: -8, cT: 10, kT: -32 }
export const SALTO: P = { t: 0, cF: 8, kF: 0, cT: -5, kT: -10 }
export const ATERRISSA: P = { t: 10, cF: 30, kF: -5, cT: 0, kT: -25 }
export const CORRE_A: P = { t: 15, cF: 30, kF: 5, cT: -35, kT: -85 }
export const CORRE_B: P = { t: 15, cF: -35, kF: -85, cT: 30, kT: 5 }
export const ANDA_A: P = { t: 6, cF: 20, kF: 0, cT: -16, kT: -26 }
export const ANDA_B: P = { t: 6, cF: -16, kF: -26, cT: 20, kT: 0 }
export const AGACHA: P = { t: 35, cF: 70, kF: -15, cT: 60, kT: -22 }
export const DEFESA: P = { t: 18, cF: 48, kF: -8, cT: -12, kT: -48 }
export const AFUNDO: P = { t: 5, cF: 70, kF: 0, cT: -35, kT: -80 }
export const JOELHO_A: P = { t: 4, cF: 85, kF: 5, cT: -4, kT: -6 }
export const JOELHO_B: P = { t: 4, cF: -4, kF: -6, cT: 85, kT: 5 }
// Braços
export const DRIBLE: P = { bP: 25, aP: 70, bL: 40, aL: 100 }
export const PEITO: P = { bP: 30, aP: 120, bL: 35, aL: 115 }
export const PRONTO: P = { bP: 50, aP: 95, bL: 55, aL: 95 }
export const ARMAR: P = { bP: 150, aP: 180, bL: 140, aL: 170 }
export const SOLTAR: P = { bP: 165, aP: 165, bL: 160, aL: 160 }
export const FINAL: P = { bP: 160, aP: 110, bL: 150, aL: 140 }
export const SOLTOS: P = { bP: 5, aP: 20, bL: -5, aL: 10 }
export const CORRIDA_A: P = { bP: -35, aP: 10, bL: 40, aL: 110 }
export const CORRIDA_B: P = { bP: 40, aP: 110, bL: -35, aL: 10 }
export const MAO_LIVRE: P = { bL: 25, aL: 45 }
// Vista de frente
export const F_PE: P = { t: 0, cF: 6, kF: 0, cT: -6, kT: 0, eF: 1, eT: 1 }
export const F_BASE: P = { t: 0, cF: 22, kF: -6, cT: -22, kT: 6, eF: 0.85, eT: 0.85 }
export const F_ABERTO: P = { t: 0, cF: 30, kF: -10, cT: -30, kT: 10, eF: 0.9, eT: 0.9 }
export const F_DEFESA: P = { t: 0, cF: 35, kF: -5, cT: -35, kT: 5, eF: 0.8, eT: 0.8, bP: 75, aP: 140, bL: -75, aL: -140 }
export const F_AGACHA: P = { t: 0, cF: 45, kF: -25, cT: -45, kT: 25, eF: 0.6, eT: 0.6 }
export const F_SOLTOS: P = { bP: 8, aP: 12, bL: -8, aL: -12 }
export const F_ALTO: P = { bP: 165, aP: 180, bL: -165, aL: -180 }

/** Bola caindo pela rede até o chão. */
export const NA_REDE: Bola = { m: 'voo', para: 'aro', p: 1, alt: 110 }
export const NO_CHAO: Bola = { m: 'voo', para: 'aro', p: 1.94, alt: 110 }
export const voo = (p: number, alt = 110): Bola => ({ m: 'voo', para: 'aro', p, alt })
export const mao = (d: number, lado: Lado = 'P'): Bola => ({ m: 'mao', d, lado })
export const em = (x: number, y: number): Bola => ({ m: 'em', x, y })
export const PERNAS: Musculo[] = ['pF', 'pT']

/** Passadas de corrida alternando as pernas; com bola, ela quica a cada passada. */
export function correr(xs: number[], fase: number, bola: 'drible' | 'drible-L' | 'sem' = 'drible', extra: (i: number) => Partial<Quadro> = () => ({})): Quadro[] {
  return xs.map((x, i) => {
    const a = i % 2 === 0
    const pernas = a ? CORRE_A : CORRE_B
    const bracos: P =
      bola === 'sem' ? (a ? CORRIDA_A : CORRIDA_B)
      : bola === 'drible-L' ? { bL: 30, aL: 75, bP: a ? -30 : 35, aP: a ? 20 : 100 }
      : { bP: 30, aP: 75, bL: a ? 40 : -30, aL: a ? 110 : 20 }
    const quique = bola === 'sem' ? undefined : mao(a ? 1 : 0, bola === 'drible-L' ? 'L' : 'P')
    return { d: 200, fase, x, ...pernas, ...bracos, bola: quique, ...extra(i) }
  })
}

/** Final de arremesso: sobe, solta, a bola cai na cesta e o atleta aterrissa. */
export function arremesso(x: number, fase: number, alt = 110, extra: Partial<Quadro> = {}, faseSoltura = fase + 1): Quadro[] {
  return [
    { d: 300, fase, x, ...SALTO, ar: 22, ...ARMAR, bola: { m: 'cima' }, hl: ['pF', 'pT'], ...extra },
    { d: 140, fase: faseSoltura, x, ...SALTO, ar: 26, ...SOLTAR, bola: { m: 'cima' }, hl: ['bP'], ...extra },
    { d: 330, fase: faseSoltura, x, ...SALTO, ar: 16, ...FINAL, bola: voo(0.6, alt), hl: ['bP'], ...extra },
    { d: 380, fase: faseSoltura, x, ...ATERRISSA, ar: 0, ...FINAL, bola: voo(1, alt), ...extra },
    { d: 900, fase: faseSoltura, x, ...ATERRISSA, ...SOLTOS, bola: voo(1.94, alt), ...extra },
  ]
}

/** Deslizamento lateral (vista de frente): abre o pé que lidera e recolhe o outro, sem cruzar. */
export function deslizar(inicio: number, passos: number, sentido: 1 | -1, fases: [number, number]) {
  const fechado: P = F_DEFESA
  const aberto: P = sentido === 1 ? { ...fechado, cF: 62, kF: 2, eF: 1 } : { ...fechado, cT: -62, kT: -2, eT: 1 }
  const pe = (p: P, qual: 'F' | 'T') => {
    const e = esqueleto({ ...POSE_NEUTRA, ...p }, 0, 0, true)
    return qual === 'F' ? e.tornozeloF.x : e.tornozeloT.x
  }
  const lider = sentido === 1 ? 'F' : 'T'
  const outro = sentido === 1 ? 'T' : 'F'
  const quadros: Quadro[] = []
  let parado = inicio + pe(fechado, outro)
  for (let i = 0; i < passos; i++) {
    quadros.push({ d: 260, fase: fases[0], x: parado, pe: outro, ...aberto, hl: [sentido === 1 ? 'pF' : 'pT'] })
    const apoio = parado - pe(aberto, outro) + pe(aberto, lider)
    quadros.push({ d: 240, fase: fases[1], x: apoio, pe: lider, ...fechado, hl: [sentido === 1 ? 'pT' : 'pF'] })
    parado = apoio - pe(fechado, lider) + pe(fechado, outro)
  }
  return { quadros, fim: parado - pe(fechado, outro) }
}

/** Monta a coreografia a partir dos passos: numera as fases e herda a posição do quadro anterior. */
export function ex(vista: 'lado' | 'frente', cena: Cena, passos: Passo[]): Coreografia {
  let x = 340
  let pe: Quadro['pe']
  const quadros: Quadro[] = []
  passos.forEach(([, , lista], fase) => {
    for (const q of lista) {
      if (q.x !== undefined) pe = q.pe
      x = q.x ?? x
      quadros.push({ ...q, d: quadros.length ? (q.d ?? 300) : 0, fase: q.fase ?? fase, x, pe })
    }
  })
  return { vista, cena, fases: passos.map(([titulo, texto]) => ({ titulo, texto })), quadros }
}

/** Repete uma sequência de poses. */
export const ciclo = (poses: Q[], vezes: number, d = 320): Q[] =>
  Array.from({ length: vezes }, () => poses.map((p) => ({ d, ...p }))).flat()

/** Passadas com ou sem bola; caminhando, os passos são mais curtos e lentos. */
export function passadas(xs: number[], { bola = 'P', andar = false, d }: { bola?: Lado | null; andar?: boolean; d?: number } = {}): Q[] {
  return xs.map((x, i) => {
    const a = i % 2 === 0
    const pernas = andar ? (a ? ANDA_A : ANDA_B) : a ? CORRE_A : CORRE_B
    const bracos: P =
      bola === null ? (a ? CORRIDA_A : CORRIDA_B)
      : bola === 'L' ? { bL: 30, aL: 75, bP: a ? -30 : 35, aP: a ? 20 : 100 }
      : { bP: 30, aP: 75, bL: a ? 40 : -30, aL: a ? 110 : 20 }
    return { d: d ?? (andar ? 300 : 200), x, ...pernas, ...bracos, ...(bola ? { bola: mao(a ? 1 : 0, bola) } : {}) }
  })
}

/** De xi a xf em n passadas igualmente espaçadas. */
export const trecho = (xi: number, xf: number, n: number) => Array.from({ length: n }, (_, i) => Math.round(xi + ((xf - xi) * (i + 1)) / n))

// Arremesso em partes, com a altura da bola proporcional à distância.
const arco = (x: number) => Math.round(30 + Math.max(0, 636 - x) * 0.17)

export const carga = (x: number, extra: Q = {}): Q => ({ d: 350, x, ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: PERNAS, ...extra })
export const armar = (x: number, ar = 22, extra: Q = {}): Q => ({ d: 300, x, ...SALTO, ar, ...ARMAR, bola: { m: 'cima' }, hl: PERNAS, ...extra })
export function soltura(x: number, ar = 26, alt = arco(x), extra: Q = {}): Q[] {
  return [
    { d: 140, x, ...SALTO, ar, ...SOLTAR, bola: { m: 'cima' }, hl: ['bP'], ...extra },
    { d: 330, x, ...SALTO, ar: Math.round(ar * 0.6), ...FINAL, bola: voo(0.6, alt), hl: ['bP'], ...extra },
    { d: 380, x, ...ATERRISSA, ar: 0, ...FINAL, bola: voo(1, alt), ...extra },
    { d: 800, x, ...ATERRISSA, ...SOLTOS, bola: voo(1.94, alt), ...extra },
  ]
}

/** Passos de um arremesso parado, com textos próprios para cada exercício. */
export function arremessoParado(x: number, textos: [string, string][], { ar = 22, extra = {}, cena = {} }: { ar?: number; extra?: Q; cena?: Cena } = {}): Coreografia {
  const [a, b, c] = textos
  return ex('lado', { cesta: 'lado', ...cena }, [
    [a[0], a[1], [{ x, ...EM_PE, ...PEITO, bola: { m: 'peito' }, ...extra }, carga(x, extra)]],
    [b[0], b[1], [armar(x, ar, extra)]],
    [c[0], c[1], soltura(x, ar + 4, undefined, extra)],
  ])
}

/** A bola chega de um passe: mãos prontas e recepção à frente do peito. */
export const receber = (x: number, de: Ponto = { x: Math.min(x + 180, 640), y: 215 }, extra: Q = {}): Q[] => [
  { d: 260, x, ...EM_PE, t: 8, ...PRONTO, bola: em(de.x, de.y), ...extra },
  { d: 520, x, bola: { m: 'voo', para: 'mao', p: 1, alt: 18 }, ...extra },
]

// Finalização em partes.
export const passoUm = (x: number): Q => ({ d: 220, x, t: 12, cF: 30, kF: 5, cT: -30, kT: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pF'] })
export const passoDois = (x: number): Q => ({ d: 220, x, t: 8, cT: 30, kT: 5, cF: -30, kF: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pT'] })
export function subidaBandeja(x: number, { ar = 38, alt = 30, lado = 'P' as Lado, extra = {} as Q } = {}): Q[] {
  return [
    { d: 260, x, ar, t: 0, cT: -10, kT: -15, cF: 95, kF: 5, bP: 165, aP: 160, bL: 60, aL: 100, bola: { m: 'cima', lado }, hl: ['pT', lado === 'L' ? 'bL' : 'bP'], ...extra },
    { d: 180, x: x + 18, ar: ar + 4, bola: voo(0.5, alt), hl: ['bP'], ...extra },
    { d: 220, x: x + 30, ar: Math.round(ar * 0.6), bola: voo(1, alt), ...extra },
    { d: 320, x: x + 38, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, alt), ...extra },
    { d: 700, x: x + 38, bola: voo(1.94, alt), ...extra },
  ]
}

// Passes em partes.
export function passe(x: number, alvo: Ponto, tipo: 'peito' | 'picado' | 'cima' | 'umaMao' = 'peito'): Q[] {
  const volta: Q = { d: 400, x, cF: 25, kF: 0, ...PRONTO, bola: { m: 'voo', para: 'mao', p: 1 } }
  const passo: Q = { x: x + 12, cF: 40, kF: 10 }
  if (tipo === 'cima') {
    return [
      { d: 340, x, bP: 175, aP: 205, bL: 170, aL: 200, bola: { m: 'cima' } },
      { d: 260, ...passo, bP: 120, aP: 110, bL: 118, aL: 108, bola: { m: 'voo', para: { x: alvo.x, y: alvo.y - 40 }, p: 1 }, hl: ['bP', 'bL'] },
      volta,
      { d: 280, x, ...PEITO, bola: { m: 'peito' } },
    ]
  }
  if (tipo === 'umaMao') {
    return [
      { d: 340, x, bP: 170, aP: 230, bL: 70, aL: 80, bola: { m: 'cima' } },
      { d: 260, ...passo, bP: 110, aP: 95, bola: { m: 'voo', para: alvo, p: 1, alt: 30 }, hl: ['bP'] },
      volta,
      { d: 280, x, ...PEITO, bola: { m: 'peito' } },
    ]
  }
  const lanca: Q = tipo === 'picado' ? { bP: 60, aP: 70, bL: 60, aL: 72 } : { bP: 85, aP: 90, bL: 85, aL: 92 }
  const quadros: Q[] = [
    { d: 280, x, ...PEITO, bola: { m: 'peito' } },
    tipo === 'picado'
      ? { d: 240, ...passo, ...lanca, bola: { m: 'voo', para: { x: Math.round((x + alvo.x) / 2 + 30), y: 293 }, p: 1 }, hl: ['bP', 'bL'] }
      : { d: 300, ...passo, ...lanca, bola: { m: 'voo', para: alvo, p: 1 }, hl: ['bP', 'bL'] },
  ]
  if (tipo === 'picado') quadros.push({ d: 200, bola: { m: 'voo', para: { x: alvo.x, y: alvo.y + 25 }, p: 1 } })
  quadros.push(volta)
  return quadros
}

// Manejo de bola de frente.
const BRACOS_DRIBLE: Record<Lado, { baixo: P; alto: P }> = {
  P: { baixo: { bP: 20, aP: 0, bL: -45, aL: -100 }, alto: { bP: 25, aP: 115, bL: -45, aL: -100 } },
  L: { baixo: { bL: -20, aL: 0, bP: 45, aP: 100 }, alto: { bL: -25, aL: -115, bP: 45, aP: 100 } },
}

/** Quiques parados de frente, com uma das mãos. */
export function quiques(lado: Lado, n: number, { d = 220, alto = false, x = 340 } = {}): Q[] {
  return Array.from({ length: n * 2 }, (_, i) => ({
    d,
    x,
    pe: 'M' as const,
    ...(i === 0 ? BRACOS_DRIBLE[lado][alto ? 'alto' : 'baixo'] : {}),
    bola: mao(i % 2 === 0 ? 1 : 0, lado),
  }))
}

/** Troca de mão pela frente do corpo. */
export function trocar(para: Lado, { x = 340, y = 293 } = {}): Q[] {
  return [
    { d: 220, x, pe: 'M', bP: 20, aP: -10, bL: -20, aL: 10, bola: em(x, y) },
    { d: 220, x, pe: 'M', ...BRACOS_DRIBLE[para].baixo, bola: mao(0, para) },
  ]
}

/** Bola em volta do corpo: direita, frente, esquerda e de volta ao centro, na altura y. */
export function emVolta(y: number, raio: number, { vezes = 2, x = 340, d = 240, baixo = false, alto = false }: { vezes?: number; x?: number; d?: number; baixo?: boolean; alto?: boolean } = {}): Q[] {
  const dir: P = alto ? { bP: 140, aP: 170, bL: -165, aL: -100 } : baixo ? { bP: 15, aP: 25, bL: 5, aL: 40 } : { bP: 40, aP: 75, bL: 15, aL: 75 }
  const esq: P = alto ? { bP: 165, aP: 100, bL: -140, aL: -170 } : baixo ? { bP: -5, aP: -40, bL: -15, aL: -25 } : { bP: -15, aP: -75, bL: -40, aL: -75 }
  const meio: P = alto ? { bP: 170, aP: 200, bL: -170, aL: -200 } : baixo ? { bP: 10, aP: -10, bL: -10, aL: 10 } : { bP: 25, aP: -40, bL: -25, aL: 40 }
  return ciclo([
    { x, pe: 'M', ...dir, bola: em(x + raio, y) },
    { x, pe: 'M', ...meio, bola: em(x, y + 3) },
    { x, pe: 'M', ...esq, bola: em(x - raio, y) },
    { x, pe: 'M', ...meio, bola: em(x, y - 3) },
  ], vezes, d)
}
