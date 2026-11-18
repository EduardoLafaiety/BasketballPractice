// Motor das demonstrações: um atleta articulado (quadril, joelhos, cotovelos) desenhado por ângulos.
// Cada coreografia é uma lista de poses-chave; o motor passa por elas numa curva contínua (sem frear
// em cada pose, como num vídeo), trava no chão o pé de apoio, move a bola com física (quique, parábola,
// queda pela rede) e calcula as pegadas. Tudo aqui é cálculo puro, sem DOM, para dar para testar.

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

/**
 * Profundidade em 3D (metros) do que a vista plana não mostra: de lado, o eixo para quem assiste (+ = lado perto,
 * o das mãos/pernas P e F); de frente, o eixo para a frente do atleta (+ = à frente do corpo, − = atrás das costas).
 * Vale da pose em diante, até outra pose mudar; null volta ao padrão (o 3D decide sozinho).
 */
export type CanalZ = 'bola' | 'bola2' | 'maoP' | 'maoL'
export type Z3 = Partial<Record<CanalZ, number>>

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
  /** Pose de passagem só do corpo (o meio de uma passada): a bola, os músculos e as pegadas a ignoram. */
  entre?: boolean
  /** Profundidade 3D da bola e das mãos (ver CanalZ). */
  z3?: Partial<Record<CanalZ, number | null>>
  /**
   * Quem segura a bola (a primeira) no 3D, quando o desenho plano não deixa saber (por trás das costas, entre as
   * pernas): a mão vai até a bola mesmo longe dela no desenho. Vale até outra pose mudar; null volta ao padrão.
   */
  segura?: 'P' | 'L' | 'PL' | 'nenhuma' | { P: number; L: number } | null
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
  tecnica?: 'arremesso' | 'bandeja' | 'gancho'
  vista?: 'lado' | 'frente'
  cena: Cena
  fases: Fase[]
  quadros: Quadro[]
}

export const CHAO = 300
export const TORNOZELO = CHAO - 4
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
const limite = (x: number) => Math.max(0, Math.min(1, x))

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
  // A cabeça acompanha só metade da inclinação do tronco: o atleta mantém o olhar à frente.
  const uCabeca = { x: Math.sin(rad(p.t * 0.45)), y: -Math.cos(rad(p.t * 0.45)) }
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
    cabeca: mais(pescoco, uCabeca, 14),
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

/**
 * Espelha o esqueleto em torno do quadril quando o boneco olha para a esquerda (dir = -1). Valores
 * entre -1 e 1 achatam o corpo na horizontal: é o atleta no meio de uma virada.
 */
export function espelhar(e: Esqueleto, dir: number): Esqueleto {
  if (dir === 1) return e
  const cx = e.quadril.x
  const out = {} as Esqueleto
  for (const k of Object.keys(e) as (keyof Esqueleto)[]) out[k] = { x: cx + (e[k].x - cx) * dir, y: e[k].y }
  return out
}

function transladar(e: Esqueleto, dx: number): Esqueleto {
  if (!dx) return e
  const out = {} as Esqueleto
  for (const k of Object.keys(e) as (keyof Esqueleto)[]) out[k] = { x: e[k].x + dx, y: e[k].y }
  return out
}

type Canal = keyof Pose | 'hx' | 'ar' | 'solo'
const CANAIS: Canal[] = [...CAMPOS, 'hx', 'ar', 'solo']

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
  /** Quando o voo de cada bola começou e quando ela chega ao alvo (ou passa pelo aro). */
  vooBola?: { inicio: number; fim: number }
  vooBola2?: { inicio: number; fim: number }
  entre: boolean
  /** Profundidade 3D já herdada das poses anteriores. */
  z3: Z3
  /** Peso de cada mão segurando a bola (herdado), quando a coreografia diz. */
  segura?: { P: number; L: number }
  /**
   * Ângulo acumulado da virada (rad): cada troca de lado soma meia volta, sempre no mesmo sentido. Assim um giro
   * (vira e volta) dá a volta inteira, em vez de "desvirar" pelo mesmo caminho.
   */
  angulo: number
  /** Inclinação da curva em cada canal (por ms), para atravessar a pose sem frear. */
  tan: Record<Canal, number>
  /** Tornozelos plantados no chão nesta pose (posição na cena), para travar o pé de apoio. */
  apoio: Record<'F' | 'T', Ponto | null>
}

const valor = (k: Chave, c: Canal): number => (c === 'hx' || c === 'ar' || c === 'solo' ? k[c] : k.pose[c])

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
      entre: !!q.entre,
      z3: herdarZ3(chaves.at(-1)?.z3, q.z3),
      angulo: (() => {
        const antes = chaves.at(-1)
        if (!antes) return dir === 1 ? 0 : Math.PI
        return antes.dir === dir ? antes.angulo : antes.angulo + Math.PI
      })(),
      segura: q.segura === null ? undefined : typeof q.segura === 'object' ? q.segura : q.segura ? { P: q.segura.includes('P') ? 1 : 0, L: q.segura.includes('L') ? 1 : 0 } : chaves.at(-1)?.segura,
      tan: {} as Record<Canal, number>,
      apoio: { F: null, T: null },
    })
  }
  tangentes(chaves)
  const anim: Animacao = { coreografia: c, frente, chaves, total: tempo, inicioFase: [] }
  for (const k of chaves) {
    const e = esqueletoDa(anim, k)
    for (const pe of ['F', 'T'] as const) {
      const tornozelo = pe === 'F' ? e.tornozeloF : e.tornozeloT
      k.apoio[pe] = k.ar === 0 && Math.abs(tornozelo.y - (TORNOZELO - k.solo)) < 1.5 ? tornozelo : null
    }
  }
  for (const qual of ['bola', 'bola2'] as const) {
    // Ponto de saída de cada voo: onde a bola estava no último quadro antes do voo começar.
    chaves.forEach((k, i) => {
      const b = k[qual]
      if (!b || b.m !== 'voo') return
      let j = i - 1
      while (j >= 0 && (chaves[j].entre || mesmoVoo(chaves[j][qual], b))) j--
      const origem = j >= 0 ? chaves[j] : k
      const ini = posicaoBola(anim, origem[qual], esqueletoDa(anim, origem), origem, qual)
      k[qual === 'bola' ? 'inicioBola' : 'inicioBola2'] = ini ?? { x: k.hx, y: k.hy }
    })
    // Tempo de cada voo, da saída até chegar ao alvo (p = 1): a bola percorre a parábola num ritmo só,
    // mesmo que o voo atravesse vários quadros. Passando pelo aro, a queda pela rede segue a gravidade.
    const campo = qual === 'bola' ? 'vooBola' : 'vooBola2'
    let cadeia: Chave[] = []
    let voo: { inicio: number; fim?: number } | null = null
    let antes: Chave | undefined
    for (const k of chaves) {
      if (k.entre) continue
      const b = k[qual]
      const a = antes?.[qual]
      if (b?.m !== 'voo' || !(a?.m === 'voo' && mesmoVoo(a, b))) {
        for (const c of cadeia) c[campo] = voo?.fim !== undefined ? { inicio: voo.inicio, fim: voo.fim } : undefined
        cadeia = []
        voo = b?.m === 'voo' ? { inicio: antes ? antes.tempo : k.tempo } : null
      }
      if (b?.m === 'voo' && voo) {
        const pa = a?.m === 'voo' && mesmoVoo(a, b) ? a.p : 0
        if (voo.fim === undefined && b.p >= 1) voo.fim = antes && b.p > pa ? antes.tempo + ((1 - pa) / (b.p - pa)) * (k.tempo - antes.tempo) : k.tempo
        cadeia.push(k)
      }
      antes = k
    }
    for (const c of cadeia) c[campo] = voo?.fim !== undefined ? { inicio: voo.inicio, fim: voo.fim } : undefined
  }
  anim.inicioFase = c.fases.map((_, f) => {
    const marcado = c.quadros.findIndex((q) => q.fase === f && q.chave)
    const i = marcado >= 0 ? marcado : chaves.findIndex((k) => k.fase === f)
    return i <= 0 ? 0 : chaves[i].tempo
  })
  return anim
}

/**
 * Inclinação da curva em cada pose-chave (Fritsch-Butland): onde o movimento segue no mesmo sentido,
 * a pose é atravessada sem frear; onde ele volta (ou para), a inclinação é zero e a curva não exagera.
 */
function tangentes(chaves: Chave[]) {
  chaves.forEach((k, i) => {
    const antes = chaves[i - 1]
    const depois = chaves[i + 1]
    for (const c of CANAIS) {
      if (!antes || !depois || !k.d || !depois.d) {
        k.tan[c] = 0
        continue
      }
      const d1 = (valor(k, c) - valor(antes, c)) / k.d
      const d2 = (valor(depois, c) - valor(k, c)) / depois.d
      k.tan[c] = d1 * d2 <= 0 ? 0 : (3 * (k.d + depois.d)) / ((2 * depois.d + k.d) / d1 + (depois.d + 2 * k.d) / d2)
    }
  })
}

/** Curva de Hermite entre duas poses-chave, com u de 0 a 1. */
function hermite(a: Chave, b: Chave, c: Canal, u: number) {
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * valor(a, c) + (u3 - 2 * u2 + u) * b.d * a.tan[c] + (-2 * u3 + 3 * u2) * valor(b, c) + (u3 - u2) * b.d * b.tan[c]
}

function herdarZ3(antes: Z3 | undefined, agora: Quadro['z3']): Z3 {
  const z: Z3 = { ...(antes ?? {}) }
  for (const [k, v] of Object.entries(agora ?? {}) as [CanalZ, number | null][]) {
    if (v === null) delete z[k]
    else z[k] = v
  }
  return z
}

/** Curva de Catmull-Rom: passa por p1 em u = 0 e por p2 em u = 1 sem frear, com a direção dada pelos vizinhos. */
export function catmull(p0: number, p1: number, p2: number, p3: number, u: number) {
  const u2 = u * u
  const u3 = u2 * u
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
}

/** Parâmetro com arranque e chegada suaves só nas pontas de uma sequência (no meio, tempo uniforme). */
function pontas(u: number, comeca: boolean, termina: boolean) {
  if (comeca && termina) return u * u * (3 - 2 * u)
  if (comeca) return u * u * (2 - u)
  if (termina) return 1 - (1 - u) * (1 - u) * (1 + u)
  return u
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
  k: { dir: number; solo: number; inicioBola?: Ponto; inicioBola2?: Ponto },
  qual: 'bola' | 'bola2' = 'bola',
): Ponto | null {
  if (!b) return null
  const dir = anim.frente ? 0 : Math.sign(k.dir)
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
      // Bézier quadrática com p uniforme no tempo: é uma parábola de verdade, como um lançamento.
      const p = Math.min(1, b.p)
      const q = 1 - p
      return { x: q * q * inicio.x + 2 * q * p * ctrl.x + p * p * fim.x, y: q * q * inicio.y + 2 * q * p * ctrl.y + p * p * fim.y }
    }
  }
}

const suave = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)

/** Quique: a mão empurra a bola, que acelera até o chão e volta perdendo velocidade. */
const descendo = (u: number) => 0.35 * u + 0.65 * u * u
const subindo = (u: number) => 1 - descendo(1 - u)

// Queda pela rede: tempo até o chão e quanto de altura sobra a cada quicada.
const QUEDA = 360
const RESTITUICAO = 0.4

/** Quanto a bola já caiu, τ ms depois de passar pelo aro, quicando no chão até parar. */
export function quedaComQuiques(tau: number, altura: number) {
  if (tau <= QUEDA) return { caiu: altura * (tau / QUEDA) ** 2, noChao: false }
  let t = tau - QUEDA
  let voo = 2 * QUEDA * RESTITUICAO
  let pico = altura * RESTITUICAO * RESTITUICAO
  while (pico > 0.4) {
    if (t <= voo) {
      const x = t / voo
      return { caiu: altura - 4 * pico * x * (1 - x), noChao: x < 0.06 || x > 0.94 }
    }
    t -= voo
    voo *= RESTITUICAO
    pico *= RESTITUICAO * RESTITUICAO
  }
  return { caiu: altura, noChao: false }
}

export interface PontoBola extends Ponto {
  pegada?: { tipo: 'arremesso' | 'bandeja' | 'gancho'; lado: Lado; apoio: boolean; peso: number }
  /** Fase física do quique: 0 = contato no alto, 1 = bola no piso. */
  quique?: { lado: Lado; d: number }
  /** Bola em voo (arremesso, passe, caindo da rede): nenhuma mão a segura, mesmo passando perto. */
  voando?: boolean
  /** Giro (graus): a bola rola conforme anda, com efeito para trás no arremesso. */
  giro: number
  /** Achatamento ao bater no chão: 1 = redonda. */
  amasso: number
}

export interface Instante {
  e: Esqueleto
  dir: 1 | -1
  fase: number
  hl: Musculo[]
  bola: PontoBola | null
  bola2: PontoBola | null
  px?: number
  solo: number
  /** Virada contínua de -1 a 1 (sem o limite de 0,3 do desenho plano). */
  virada: number
  /** Ângulo acumulado da virada (rad): o 3D gira o corpo por ele (0 = olhando para a direita da cena). */
  angulo: number
  /** Profundidade 3D da bola e das mãos neste instante (só os canais definidos na coreografia). */
  z3: Z3
  /**
   * Quanto vale a profundidade da coreografia (0 a 1) contra a padrão: quando só uma das poses vizinhas define o
   * canal, a passagem é gradual, sem salto.
   */
  z3peso: Z3
  /** Peso de cada mão segurando a bola, quando a coreografia diz (senão o 3D decide pela distância). */
  segura?: { P: number; L: number }
  /** Quanto vale o "segura" da coreografia (0 a 1) contra a distância, na passagem entre poses com e sem ele. */
  seguraPeso: number
  /** Giro do corpo de -1 a 1 (cosseno do ângulo de virada): o visualizador 3D desfaz o espelho e gira de verdade. */
  giro: number
  /** Faixa lateral do atleta na cena, de -1 a 1 (a mesma das pegadas). */
  prof: number
  /** A pose interpolada (ângulos) neste instante. */
  pose: Pose
}

/** O índice do quadro "de verdade" (não de passagem) mais próximo, para trás ou para a frente. */
function vizinho(ks: Chave[], i: number, passo: 1 | -1) {
  while (i > 0 && i < ks.length - 1 && ks[i].entre) i += passo
  return Math.max(0, Math.min(ks.length - 1, i))
}

/** Estado da animação no tempo t (ms). */
export function instante(anim: Animacao, t: number): Instante {
  const ks = anim.chaves
  let i = 0
  while (i < ks.length - 2 && t >= ks[i + 1].tempo) i++
  const a = ks[i]
  const b = ks[Math.min(i + 1, ks.length - 1)]
  const u = b.d ? limite((t - a.tempo) / b.d) : 1
  const k = suave(u)
  const lerp = (x: number, y: number, f = k) => x + (y - x) * f

  // Corpo: curva contínua por todas as poses (inclusive as de passagem).
  const pose = {} as Pose
  for (const c of CAMPOS) pose[c] = hermite(a, b, c, u)
  const solo = Math.max(0, hermite(a, b, 'solo', u))
  const ar = Math.max(0, hermite(a, b, 'ar', u))
  // Virada: o corpo afina na horizontal enquanto gira, em vez de espelhar de repente.
  let giro: number = b.dir
  let virada: number = b.dir
  if (a.dir !== b.dir && !anim.frente) {
    const s = lerp(a.dir, b.dir)
    virada = s
    giro = Math.sign(s || b.dir) * Math.max(0.3, Math.abs(s))
  }
  const dir = (giro < 0 ? -1 : 1) as 1 | -1
  // A altura do quadril sai da pose interpolada, para os pés não atravessarem o chão entre as poses.
  const hy = alturaQuadril(pose, solo, ar, anim.frente)
  let e = esqueletoDa(anim, { pose, hx: hermite(a, b, 'hx', u), hy, dir: giro as 1 | -1 })

  // Pé de apoio: se o mesmo pé está plantado nas duas poses, ele não escorrega no meio do caminho.
  if (a.dir === b.dir) {
    const correcoes: number[] = []
    for (const pe of ['F', 'T'] as const) {
      const pa = a.apoio[pe]
      const pb = b.apoio[pe]
      if (!pa || !pb || Math.abs(pa.x - pb.x) > 14) continue
      correcoes.push(lerp(pa.x, pb.x) - (pe === 'F' ? e.tornozeloF.x : e.tornozeloT.x))
    }
    if (correcoes.length) e = transladar(e, correcoes.reduce((s, c) => s + c, 0) / correcoes.length)
  }

  // Bola e músculos seguem só os quadros de verdade, ignorando as poses de passagem.
  const ia = vizinho(ks, i, -1)
  const ib = vizinho(ks, Math.min(i + 1, ks.length - 1), 1)
  const ba = ks[ia]
  const bb = ks[ib]
  const ub = bb.tempo > ba.tempo ? limite((t - ba.tempo) / (bb.tempo - ba.tempo)) : 1
  const kb = suave(ub)

  // No quique, a mão acompanha a bola: desce com ela e sobe para recebê-la.
  const quique = (qual: 'bola' | 'bola2') => {
    const x = ba[qual]
    const y = bb[qual]
    if (x?.m !== 'mao' || y?.m !== 'mao' || (x.lado ?? 'P') !== (y.lado ?? 'P')) return null
    const da = x.d ?? 0
    const db = y.d ?? 0
    const d = db > da ? da + (db - da) * descendo(ub) : db < da ? da + (db - da) * subindo(ub) : da
    return { d, lado: x.lado ?? 'P' }
  }
  const quiques = { bola: quique('bola'), bola2: quique('bola2') }
  for (const q of [quiques.bola, quiques.bola2]) {
    if (!q) continue
    const cot = q.lado === 'L' ? 'cotoveloL' : 'cotoveloP'
    const mao = q.lado === 'L' ? 'maoL' : 'maoP'
    const ombro = e[q.lado === 'L' ? 'ombroL' : 'ombroP']
    const desce = Math.min(11 * Math.min(1, q.d / 0.35), Math.max(0, CHAO - solo - 2 * RAIO_BOLA - e[mao].y))
    const alvo = { x: e[mao].x, y: e[mao].y + desce }
    const dx = alvo.x - ombro.x, dy = alvo.y - ombro.y
    const distancia = Math.min(BRACO + ANTEBRACO - 0.01, Math.max(0.01, Math.hypot(dx, dy)))
    const tamanho = Math.hypot(dx, dy) || 1
    const ux = dx / tamanho, uy = dy / tamanho
    const a = (BRACO * BRACO - ANTEBRACO * ANTEBRACO + distancia * distancia) / (2 * distancia)
    const h = Math.sqrt(Math.max(0, BRACO * BRACO - a * a))
    const opcoes = [-1, 1].map(s => ({ x: ombro.x + ux * a - uy * h * s, y: ombro.y + uy * a + ux * h * s }))
    const dobrado = opcoes.sort((a, b) => Math.hypot(a.x - e[cot].x, a.y - e[cot].y) - Math.hypot(b.x - e[cot].x, b.y - e[cot].y))[0]
    e = { ...e, [cot]: dobrado, [mao]: { x: ombro.x + ux * distancia, y: ombro.y + uy * distancia } }
  }

  const bolaEm = (qual: 'bola' | 'bola2'): PontoBola | null => {
    const ctx = { dir: giro, solo, inicioBola: bb.inicioBola ?? ba.inicioBola, inicioBola2: bb.inicioBola2 ?? ba.inicioBola2 }
    const x = ba[qual]
    const y = bb[qual]
    const chao = CHAO - solo - RAIO_BOLA
    const pronta = (p: Ponto | null, amasso = 1): PontoBola | null => (p ? { ...p, giro: (-p.x / RAIO_BOLA) * (180 / Math.PI), amasso } : null)
    const q = quiques[qual]
    if (q) {
      const p = posicaoBola(anim, { m: 'mao', lado: q.lado, d: q.d }, e, ctx, qual)
      const ponto = pronta(p, q.d > 0.97 ? 0.82 : 1)
      return ponto ? { ...ponto, quique: q } : null
    }
    if (y?.m === 'voo') {
      const voando = (p: PontoBola | null) => (p ? { ...p, voando: true } : null)
      // Em voo o tempo corre uniforme: a parábola sai sem frear e chega sem frear.
      const voo = qual === 'bola' ? bb.vooBola : bb.vooBola2
      const pa = x?.m === 'voo' && mesmoVoo(x, y) ? x.p : 0
      const p = voo && voo.fim > voo.inicio ? (t - voo.inicio) / (voo.fim - voo.inicio) : pa + (y.p - pa) * ub
      if (y.para === 'aro' && p > 1 && voo) {
        const aro = ARO[anim.frente ? 'frente' : 'lado']
        const topo = aro.y + 6
        const queda = quedaComQuiques(t - voo.fim, chao - topo)
        return voando(pronta({ x: aro.x, y: topo + queda.caiu }, queda.noChao ? 0.85 : 1))
      }
      // Chegando à mão (recepção), a bola volta a poder ser segurada no fim do voo.
      // Na recepção, as mãos vão ao encontro da bola no último trecho do voo (pela distância no desenho).
      const noAr = y.para === 'mao' || y.para === 'maoCima' ? p < 0.6 : true
      const ponto = pronta(posicaoBola(anim, { ...y, p: Math.max(0, Math.min(1, p)) }, e, ctx, qual))
      return noAr ? voando(ponto) : ponto
    }
    // Bola passando de ponto em ponto (em volta do corpo, entre as pernas...): curva contínua, sem parar em cada ponto.
    if (x?.m === 'em' && y?.m === 'em') {
      const antes = ks[vizinho(ks, Math.max(0, ia - 1), -1)]
      const depois = ks[vizinho(ks, Math.min(ks.length - 1, ib + 1), 1)]
      const p0 = antes !== ba && antes[qual]?.m === 'em' ? (antes[qual] as { x: number; y: number }) : null
      const p3 = depois !== bb && depois[qual]?.m === 'em' ? (depois[qual] as { x: number; y: number }) : null
      const w = pontas(ub, !p0, !p3)
      // A curva não passa do chão (a curva de Catmull-Rom pode passar um pouco dos pontos).
      return pronta({
        x: catmull(p0?.x ?? x.x, x.x, y.x, p3?.x ?? y.x, w),
        y: Math.min(chao, catmull(p0?.y ?? x.y, x.y, y.y, p3?.y ?? y.y, w)),
      })
    }
    const pa = posicaoBola(anim, x, e, { ...ctx, inicioBola: ba.inicioBola, inicioBola2: ba.inicioBola2 }, qual)
    const pb = posicaoBola(anim, y, e, ctx, qual)
    if (!pa || !pb) return pronta(kb < 0.5 ? pa : pb)
    return pronta({ x: lerp(pa.x, pb.x, kb), y: lerp(pa.y, pb.y, kb) })
  }
  // Profundidade 3D: a da bola segue os quadros de verdade (como a bola); a das mãos, todas as poses.
  const z3: Z3 = {}
  const z3peso: Z3 = {}
  const canalZ = (c: CanalZ, i0: number, i1: number, uu: number, real: boolean) => {
    const A = ks[i0].z3[c]
    const B = ks[i1].z3[c]
    if (A === undefined && B === undefined) return
    if (A === undefined || B === undefined) {
      z3[c] = (A ?? B)!
      const s = uu * uu * (3 - 2 * uu)
      z3peso[c] = A === undefined ? s : 1 - s
      return
    }
    z3peso[c] = 1
    const ant = real ? ks[vizinho(ks, Math.max(0, i0 - 1), -1)] : ks[Math.max(0, i0 - 1)]
    const dep = real ? ks[vizinho(ks, Math.min(ks.length - 1, i1 + 1), 1)] : ks[Math.min(ks.length - 1, i1 + 1)]
    const p0 = ant !== ks[i0] ? ant.z3[c] : undefined
    const p3 = dep !== ks[i1] ? dep.z3[c] : undefined
    z3[c] = catmull(p0 ?? A, A, B, p3 ?? B, pontas(uu, p0 === undefined, p3 === undefined))
  }
  canalZ('bola', ia, ib, ub, true)
  canalZ('bola2', ia, ib, ub, true)
  canalZ('maoP', i, Math.min(i + 1, ks.length - 1), u, false)
  canalZ('maoL', i, Math.min(i + 1, ks.length - 1), u, false)

  const sa = ba.segura
  const sb = bb.segura
  const segura = sa && sb ? { P: lerp(sa.P, sb.P, kb), L: lerp(sa.L, sb.L, kb) } : (sa ?? sb)
  const seguraPeso = sa && sb ? 1 : sb ? kb : sa ? 1 - kb : 0

  const comPegada = (qual: 'bola' | 'bola2') => {
    const ponto = bolaEm(qual)
    if (!ponto || !anim.coreografia.tecnica) return ponto
    const x = ba[qual], y = bb[qual]
    let cima = y?.m === 'cima' ? y : x?.m === 'cima' ? x : undefined
    if (!cima && y?.m === 'voo' && y.para === 'aro') {
      for (let j = ia; j >= 0; j--) if (ks[j][qual]?.m === 'cima') { cima = ks[j][qual] as Extract<Bola, { m: 'cima' }>; break }
    }
    if (!cima) return ponto
    const lado = cima.lado ?? 'P'
    const outra = lado === 'P' ? e.maoL : e.maoP
    const apoio = anim.coreografia.tecnica === 'arremesso' && Math.hypot(outra.x - ponto.x, outra.y - ponto.y) < 30
    const peso = ponto.voando ? 0 : x?.m === 'cima' && y?.m === 'cima' ? 1 : y?.m === 'cima' ? kb : x?.m === 'cima' ? 1 - kb : 0
    return { ...ponto, pegada: { tipo: anim.coreografia.tecnica, lado, apoio, peso } }
  }
  return {
    e,
    dir,
    virada,
    angulo: anim.frente ? 0 : a.angulo + (b.angulo - a.angulo) * k,
    z3,
    z3peso,
    segura,
    seguraPeso,
    fase: faseEm(anim, t),
    hl: ub > 0 ? bb.hl : ba.hl,
    bola: comPegada('bola'),
    bola2: comPegada('bola2'),
    px: a.px !== undefined && b.px !== undefined ? lerp(a.px, b.px) : undefined,
    solo,
    giro,
    prof: lerp(a.prof, b.prof),
    pose,
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
    if (k.entre) continue
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
