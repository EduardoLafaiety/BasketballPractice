// Motor das demonstrações: um manequim articulado (quadril, joelhos, cotovelos) desenhado por ângulos.
// Cada coreografia é uma lista de poses-chave; o motor interpola entre elas, posiciona a bola e
// calcula as pegadas. Tudo aqui é cálculo puro, sem DOM, para dar para testar.

/** Ângulos em graus a partir da vertical para baixo; positivo gira para a frente (direita da tela). */
export interface Pose {
  /** Tronco: inclinação para a frente. */
  t: number
  /** Coxa e canela da perna da frente (a mais perto de quem assiste). */
  cF: number
  kF: number
  /** Coxa e canela da perna de trás. */
  cT: number
  kT: number
  /** Braço e antebraço do lado perto (o que segura a bola) e do lado longe. */
  bP: number
  aP: number
  bL: number
  aL: number
  /** Encurtamento da coxa (1 = inteira); simula o joelho subindo na direção de quem assiste. */
  eF: number
  eT: number
}

export type Lado = 'P' | 'L'
export type Ponto = { x: number; y: number }
export type Alvo = 'aro' | 'mao' | 'maoCima' | Ponto

export type Bola =
  | { m: 'mao'; lado?: Lado; d?: number } // na mão, d = 0 (mão) a 1 (chão): o quique
  | { m: 'peito' } // segurando com as duas mãos
  | { m: 'cima'; lado?: Lado } // acima da mão, pronta para arremessar
  | { m: 'em'; x: number; y: number } // parada num ponto da cena
  | { m: 'voo'; para: Alvo; p: number; alt?: number } // em voo, p = 0 (saída) a 1 (chegada); p > 1 cai pela rede

export type Musculo = 'pF' | 'pT' | 'bP' | 'bL'

export interface Quadro extends Partial<Pose> {
  /** Duração (ms) para chegar nesta pose a partir da anterior. */
  d: number
  /** Índice da fase (passo) a que este quadro pertence. */
  fase: number
  /** Posição horizontal: do quadril, ou do pé indicado em `pe` (M = meio entre os pés). */
  x: number
  pe?: 'F' | 'T' | 'M'
  /** Altura do salto e do chão (caixa) sob os pés. */
  ar?: number
  solo?: number
  /** Para onde o boneco olha: 1 = direita, -1 = esquerda. */
  dir?: 1 | -1
  /** Faixa lateral das pegadas (vista de cima): -1 a 1. */
  prof?: number
  bola?: Bola
  bola2?: Bola
  /** Músculos em ação, pintados de laranja. */
  hl?: Musculo[]
  /** Posição do parceiro (defensor, arremessador…). */
  px?: number
  /** Marca a pose que representa a fase (por padrão, o primeiro quadro dela). */
  chave?: boolean
}

export interface Fase {
  titulo: string
  texto: string
}

export interface Cena {
  cesta?: 'lado' | 'frente'
  cones?: { x: number; prof?: number }[]
  linhas?: number[]
  parede?: number
  caixa?: { x: number; w: number; h: number }
  cadeira?: number
  parceiro?: { pose: Partial<Pose>; dir: 1 | -1; x: number }
}

export interface Coreografia {
  vista?: 'lado' | 'frente'
  cena: Cena
  fases: Fase[]
  quadros: Quadro[]
}

export const CHAO = 300
const TORNOZELO = CHAO - 4
const TRONCO = 48
const COXA = 34
const CANELA = 34
const BRACO = 26
const ANTEBRACO = 23
export const RAIO_BOLA = 7
export const ARO = { lado: { x: 636, y: 68 }, frente: { x: 340, y: 68 } }

export const POSE_NEUTRA: Pose = { t: 3, cF: 8, kF: 0, cT: -6, kT: -6, bP: 5, aP: 20, bL: -5, aL: 10, eF: 1, eT: 1 }
const CAMPOS: (keyof Pose)[] = ['t', 'cF', 'kF', 'cT', 'kT', 'bP', 'aP', 'bL', 'aL', 'eF', 'eT']

const rad = (a: number) => (a * Math.PI) / 180
const segmento = (o: Ponto, L: number, a: number): Ponto => ({ x: o.x + L * Math.sin(rad(a)), y: o.y + L * Math.cos(rad(a)) })

export interface Esqueleto {
  quadril: Ponto
  pescoco: Ponto
  cabeca: Ponto
  ombroP: Ponto
  ombroL: Ponto
  joelhoF: Ponto
  tornozeloF: Ponto
  joelhoT: Ponto
  tornozeloT: Ponto
  quadrilF: Ponto
  quadrilT: Ponto
  cotoveloP: Ponto
  maoP: Ponto
  cotoveloL: Ponto
  maoL: Ponto
}

/** Posições das articulações com o quadril em (x, y), olhando para a direita. */
export function esqueleto(p: Pose, x: number, y: number, frente: boolean): Esqueleto {
  const quadril = { x, y }
  const u = { x: Math.sin(rad(p.t)), y: -Math.cos(rad(p.t)) }
  const lateral = { x: Math.cos(rad(p.t)), y: Math.sin(rad(p.t)) } // perpendicular ao tronco, só na vista de frente
  const mais = (o: Ponto, v: Ponto, k: number) => ({ x: o.x + v.x * k, y: o.y + v.y * k })
  const pescoco = mais(quadril, u, TRONCO)
  const ombro = mais(quadril, u, TRONCO - 6)
  const largOmbro = frente ? 11 : 0
  const largQuadril = frente ? 7 : 0
  const ombroP = mais(ombro, lateral, largOmbro)
  const ombroL = mais(ombro, lateral, -largOmbro)
  const quadrilF = mais(quadril, lateral, largQuadril)
  const quadrilT = mais(quadril, lateral, -largQuadril)
  const joelhoF = segmento(quadrilF, COXA * p.eF, p.cF)
  const joelhoT = segmento(quadrilT, COXA * p.eT, p.cT)
  const cotoveloP = segmento(ombroP, BRACO, p.bP)
  const cotoveloL = segmento(ombroL, BRACO, p.bL)
  return {
    quadril,
    pescoco,
    cabeca: mais(pescoco, u, 14),
    ombroP,
    ombroL,
    quadrilF,
    quadrilT,
    joelhoF,
    tornozeloF: segmento(joelhoF, CANELA, p.kF),
    joelhoT,
    tornozeloT: segmento(joelhoT, CANELA, p.kT),
    cotoveloP,
    maoP: segmento(cotoveloP, ANTEBRACO, p.aP),
    cotoveloL,
    maoL: segmento(cotoveloL, ANTEBRACO, p.aL),
  }
}

/** Espelha o esqueleto em torno do quadril quando o boneco olha para a esquerda. */
export function espelhar(e: Esqueleto, dir: number): Esqueleto {
  if (dir === 1) return e
  const cx = e.quadril.x
  const out = {} as Esqueleto
  for (const k of Object.keys(e) as (keyof Esqueleto)[]) out[k] = { x: cx - (e[k].x - cx), y: e[k].y }
  return out
}

/** Quadro já resolvido: pose completa, quadril em coordenadas da cena e tempo de chegada. */
export interface Chave {
  pose: Pose
  hx: number
  hy: number
  dir: 1 | -1
  prof: number
  solo: number
  ar: number
  fase: number
  d: number
  tempo: number
  bola?: Bola
  bola2?: Bola
  hl: Musculo[]
  px?: number
  /** Ponto de saída de cada bola quando ela está em voo. */
  inicioBola?: Ponto
  inicioBola2?: Ponto
}

export interface Animacao {
  coreografia: Coreografia
  frente: boolean
  chaves: Chave[]
  total: number
  /** Tempo em que cada fase atinge a sua pose-chave. */
  inicioFase: number[]
}

export function alturaQuadril(p: Pose, solo: number, ar: number, frente: boolean) {
  const e = esqueleto(p, 0, 0, frente)
  return TORNOZELO - solo - ar - Math.max(e.tornozeloF.y, e.tornozeloT.y)
}

export function preparar(c: Coreografia): Animacao {
  const frente = c.vista === 'frente'
  let pose = POSE_NEUTRA
  let tempo = 0
  const chaves: Chave[] = []
  for (const q of c.quadros) {
    pose = { ...pose, ...pick(q) }
    const dir = q.dir ?? chaves.at(-1)?.dir ?? 1
    const solo = q.solo ?? 0
    const local = esqueleto(pose, 0, 0, frente)
    const deslocamento = q.pe === 'F' ? local.tornozeloF.x : q.pe === 'T' ? local.tornozeloT.x : q.pe === 'M' ? (local.tornozeloF.x + local.tornozeloT.x) / 2 : 0
    tempo += q.d
    chaves.push({
      pose,
      hx: q.x - deslocamento * dir,
      hy: alturaQuadril(pose, solo, q.ar ?? 0, frente),
      dir,
      prof: q.prof ?? chaves.at(-1)?.prof ?? 0,
      solo,
      ar: q.ar ?? 0,
      fase: q.fase,
      d: q.d,
      tempo,
      // Sem bola indicada, ela continua como no quadro anterior.
      bola: q.bola ?? chaves.at(-1)?.bola,
      bola2: q.bola2 ?? chaves.at(-1)?.bola2,
      hl: q.hl ?? [],
      px: q.px ?? chaves.at(-1)?.px ?? c.cena.parceiro?.x,
    })
  }
  const anim: Animacao = { coreografia: c, frente, chaves, total: tempo, inicioFase: [] }
  // Ponto de saída de cada voo: onde a bola estava no último quadro antes do voo começar.
  for (const qual of ['bola', 'bola2'] as const) {
    chaves.forEach((k, i) => {
      const b = k[qual]
      if (!b || b.m !== 'voo') return
      let j = i - 1
      while (j >= 0 && mesmoVoo(chaves[j][qual], b)) j--
      const origem = j >= 0 ? chaves[j] : k
      const ini = posicaoBola(anim, origem[qual], esqueletoDa(anim, origem), origem, qual)
      k[qual === 'bola' ? 'inicioBola' : 'inicioBola2'] = ini ?? { x: k.hx, y: k.hy }
    })
  }
  anim.inicioFase = c.fases.map((_, f) => {
    const marcado = c.quadros.findIndex((q) => q.fase === f && q.chave)
    const i = marcado >= 0 ? marcado : chaves.findIndex((k) => k.fase === f)
    return i <= 0 ? 0 : chaves[i].tempo
  })
  return anim
}

function pick(q: Quadro): Partial<Pose> {
  const p: Partial<Pose> = {}
  for (const k of CAMPOS) if (q[k] !== undefined) p[k] = q[k]
  return p
}

const mesmoVoo = (a: Bola | undefined, b: Bola) =>
  a?.m === 'voo' && b.m === 'voo' && JSON.stringify(a.para) === JSON.stringify(b.para)

export function esqueletoDa(anim: Animacao, k: Pick<Chave, 'pose' | 'hx' | 'hy' | 'dir'>) {
  return espelhar(esqueleto(k.pose, k.hx, k.hy, anim.frente), k.dir)
}

function pontoMao(e: Esqueleto, lado: Lado | undefined) {
  return lado === 'L' ? e.maoL : e.maoP
}

/** Onde a bola está para uma regra de bola e um esqueleto. */
export function posicaoBola(
  anim: Animacao,
  b: Bola | undefined,
  e: Esqueleto,
  k: Pick<Chave, 'dir' | 'solo' | 'inicioBola' | 'inicioBola2'>,
  qual: 'bola' | 'bola2' = 'bola',
): Ponto | null {
  if (!b) return null
  const dir = anim.frente ? 0 : k.dir
  const chao = CHAO - k.solo - RAIO_BOLA
  switch (b.m) {
    case 'mao': {
      const m = pontoMao(e, b.lado)
      const naMao = { x: m.x + dir * 4, y: m.y + RAIO_BOLA + 1 }
      const d = b.d ?? 0
      return { x: naMao.x + dir * 3 * d, y: naMao.y + (chao - naMao.y) * d }
    }
    case 'peito':
      if (anim.frente) return { x: (e.maoP.x + e.maoL.x) / 2, y: (e.maoP.y + e.maoL.y) / 2 }
      return { x: e.maoP.x + dir * 6, y: e.maoP.y - 2 }
    case 'cima': {
      const m = pontoMao(e, b.lado)
      return { x: m.x + dir * 2, y: m.y - RAIO_BOLA - 3 }
    }
    case 'em':
      return { x: b.x, y: b.y }
    case 'voo': {
      const aro = ARO[anim.frente ? 'frente' : 'lado']
      const inicio = (qual === 'bola' ? k.inicioBola : k.inicioBola2) ?? aro
      if (b.para === 'aro' && b.p > 1) return { x: aro.x, y: aro.y + 6 + (b.p - 1) * (CHAO - aro.y) }
      const fim =
        b.para === 'aro' ? { x: aro.x, y: aro.y - 4 }
        : b.para === 'mao' ? posicaoBola(anim, { m: 'peito' }, e, k)!
        : b.para === 'maoCima' ? posicaoBola(anim, { m: 'cima' }, e, k)!
        : b.para
      const alt = b.alt ?? (b.para === 'aro' ? 110 : 0)
      const ctrl = { x: (inicio.x + fim.x) / 2, y: Math.min(inicio.y, fim.y) - alt }
      const p = Math.min(1, b.p)
      const q = 1 - p
      return { x: q * q * inicio.x + 2 * q * p * ctrl.x + p * p * fim.x, y: q * q * inicio.y + 2 * q * p * ctrl.y + p * p * fim.y }
    }
  }
}

const suave = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

export interface Instante {
  e: Esqueleto
  dir: 1 | -1
  fase: number
  hl: Musculo[]
  bola: Ponto | null
  bola2: Ponto | null
  px?: number
}

/** Estado da animação no tempo t (ms). */
export function instante(anim: Animacao, t: number): Instante {
  const ks = anim.chaves
  let i = 0
  while (i < ks.length - 2 && t >= ks[i + 1].tempo) i++
  const a = ks[i]
  const b = ks[Math.min(i + 1, ks.length - 1)]
  const bruto = b.d ? Math.min(1, Math.max(0, (t - a.tempo) / b.d)) : 1
  const k = suave(bruto)
  const lerp = (x: number, y: number) => x + (y - x) * k
  const pose = {} as Pose
  for (const c of CAMPOS) pose[c] = lerp(a.pose[c], b.pose[c])
  const dir = k < 0.5 ? a.dir : b.dir
  // A altura do quadril sai da pose interpolada, para os pés não atravessarem o chão entre as poses.
  const hy = alturaQuadril(pose, lerp(a.solo, b.solo), lerp(a.ar, b.ar), anim.frente)
  const atual = { pose, hx: lerp(a.hx, b.hx), hy, dir }
  const e = esqueletoDa(anim, atual)
  const bolaEm = (qual: 'bola' | 'bola2') => {
    const ctx = { dir, solo: lerp(a.solo, b.solo), inicioBola: b.inicioBola ?? a.inicioBola, inicioBola2: b.inicioBola2 ?? a.inicioBola2 }
    const pa = posicaoBola(anim, a[qual], e, { ...ctx, inicioBola: a.inicioBola, inicioBola2: a.inicioBola2 }, qual)
    const pb = posicaoBola(anim, b[qual], e, ctx, qual)
    if (!pa || !pb) return k < 0.5 ? pa : pb
    return { x: lerp(pa.x, pb.x), y: lerp(pa.y, pb.y) }
  }
  return {
    e,
    dir,
    fase: faseEm(anim, t),
    hl: bruto > 0 ? b.hl : a.hl,
    bola: bolaEm('bola'),
    bola2: bolaEm('bola2'),
    px: a.px !== undefined && b.px !== undefined ? lerp(a.px, b.px) : undefined,
  }
}

/** A fase mostrada no tempo t: a do próximo quadro-chave a ser alcançado. */
export function faseEm(anim: Animacao, t: number) {
  for (const k of anim.chaves) if (k.tempo >= t - 0.01) return k.fase
  return anim.chaves.at(-1)!.fase
}

export interface Pegada {
  x: number
  y: number
  pe: 'F' | 'T'
  fase: number
  tempo: number
  dir: number
}

/** Pegadas vistas de cima: cada vez que um pé toca o chão num lugar novo. */
export function pegadas(anim: Animacao): Pegada[] {
  const lista: Pegada[] = []
  const ultimo: Record<'F' | 'T', Ponto | null> = { F: null, T: null }
  for (const k of anim.chaves) {
    const e = esqueletoDa(anim, k)
    for (const pe of ['F', 'T'] as const) {
      const tornozelo = pe === 'F' ? e.tornozeloF : e.tornozeloT
      if (Math.abs(tornozelo.y - (TORNOZELO - k.solo)) > 2) continue
      const faixa = anim.frente ? 0 : pe === 'F' ? -9 : 9
      const ponto = { x: tornozelo.x + (anim.frente ? 0 : k.dir * 4), y: faixa + k.prof * 14 }
      const antes = ultimo[pe]
      if (antes && Math.abs(antes.x - ponto.x) < (anim.frente ? 12 : 10) && Math.abs(antes.y - ponto.y) < 4) continue
      ultimo[pe] = ponto
      lista.push({ ...ponto, pe, fase: k.fase, tempo: k.tempo, dir: k.dir })
    }
  }
  return lista
}
