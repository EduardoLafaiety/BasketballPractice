// Corpo em 3D das demonstrações: cálculo puro (sem three.js), para dar para testar.
//
// As coreografias descrevem o atleta num plano (de lado, ou de frente). Aqui esse esqueleto vira um corpo 3D:
// - as medidas são de um atleta de ~1,88 m (uma escala só para a cena inteira: 1 px da coreografia = 1,3 cm);
// - cada perna e cada braço é um par de ossos de comprimento FIXO, resolvido por cinemática inversa: o pé de
//   apoio fica onde a coreografia pôs, e o joelho/cotovelo dobra para o lado certo, sem esticar nem encolher;
// - a profundidade que a vista plana não mostra vem da física do próprio dado: a coxa "encurtada" (eF) é a
//   coxa apontando para fora (de lado) ou para a frente (de frente); a largura dos quadris e ombros dá a
//   volta pelos eixos; a pelve e os ombros giram em sentidos opostos quando as pernas passam;
// - o pé gira sobre a ponta quando o calcanhar sobe; as mãos abraçam a bola quando ela está perto delas;
// - a virada (dir) é uma rotação de verdade em torno do eixo vertical, não um achatamento.

import {
  alturaQuadril,
  ARO,
  CHAO,
  esqueleto,
  espelhar,
  POSE_NEUTRA,
  RAIO_BOLA,
  type Cena,
  type Esqueleto,
  type Instante,
  type Musculo,
  type Pose,
  type PontoBola,
} from './motor'

export interface V3 {
  x: number
  y: number
  z: number
}

/** Metros por pixel da coreografia: a cesta a 232 px do chão fica nos 3,05 m oficiais. */
export const ESCALA = 3.05 / (CHAO - 68)
/** Medidas do atleta, em metros. */
export const MEDIDAS = {
  coxa: 0.445,
  canela: 0.44,
  braco: 0.31,
  /** Do cotovelo ao centro da palma (antebraço + metade da mão). */
  antebraco: 0.35,
  /** Do cotovelo ao punho. */
  antebracoAteOPunho: 0.26,
  larguraQuadril: 0.095,
  larguraOmbro: 0.205,
  larguraPassada: 0.13,
  alturaTornozelo: 0.088,
  raioBola: 0.121,
} as const

const DEG = Math.PI / 180
const limitar = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const suave = (a: number, b: number, x: number) => {
  const u = limitar((x - a) / (b - a), 0, 1)
  return u * u * (3 - 2 * u)
}
export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z })
const soma = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const mul = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k })
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z
const cruz = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
export const comprimento = (a: V3) => Math.hypot(a.x, a.y, a.z)
export const distancia = (a: V3, b: V3) => comprimento(sub(a, b))
export const normalizar = (a: V3, reserva: V3 = v3(1, 0, 0)): V3 => {
  const n = comprimento(a)
  return n < 1e-9 ? reserva : mul(a, 1 / n)
}
const mistura = (a: V3, b: V3, k: number): V3 => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k })

/** Cinemática inversa de dois ossos: devolve a articulação do meio e a ponta (limitada ao alcance). */
export function doisOssos(raiz: V3, alvo: V3, polo: V3, L1: number, L2: number, reserva: V3) {
  const ate = sub(alvo, raiz)
  const alcance = L1 + L2 - 1e-4
  const minimo = Math.abs(L1 - L2) + 1e-3
  const d = limitar(comprimento(ate), minimo, alcance)
  const dir = normalizar(ate, v3(0, -1, 0))
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a))
  const paraPolo = sub(polo, raiz)
  let perp = sub(paraPolo, mul(dir, dot(paraPolo, dir)))
  if (comprimento(perp) < 1e-3) perp = sub(reserva, mul(dir, dot(reserva, dir)))
  perp = normalizar(perp, reserva)
  const meio = soma(soma(raiz, mul(dir, a)), mul(perp, h))
  return { meio, ponta: soma(raiz, mul(dir, d)) }
}

export interface Membro {
  raiz: V3
  meio: V3
  ponta: V3
}

export interface Pe {
  tornozelo: V3
  /** Para onde os dedos apontam (unitário, no plano do chão). */
  frente: V3
  /** Inclinação da ponta: 0 = pé plano; negativo = calcanhar no ar, ponta no chão. */
  inclinacao: number
  calcanhar: V3
  ponta: V3
}

export interface Eixos {
  /** Para onde o corpo olha, para cima, e para o lado perto (todos unitários, no mundo). */
  frente: V3
  cima: V3
  lado: V3
}

export interface Bola3D {
  /** Centro da bola: no mundo depois de colocarNoMundo; antes, relativo à pelve e girando com o corpo (presa à mão). */
  centro: V3
  /** Centro da bola solta, relativo à pelve e sem girar com o corpo (a bola não é do atleta). */
  livre: V3
  /** Rotação (graus) em torno do eixo do corpo e achatamento ao bater no chão. */
  giro: number
  amasso: number
  /** Em que medida a bola está nas mãos (0 a 1). */
  presa: number
}

export interface Angulos {
  joelhoF: number
  joelhoT: number
  quadrilF: number
  quadrilT: number
  cotoveloP: number
  cotoveloL: number
  tronco: number
}

export interface Corpo3D {
  pelve: V3
  pescoco: V3
  cabeca: V3
  /** Quadris e ombros (F/T = pernas perto/longe, P/L = braços perto/longe). */
  quadril: Record<'F' | 'T', V3>
  ombro: Record<'P' | 'L', V3>
  perna: Record<'F' | 'T', Membro>
  braco: Record<'P' | 'L', Membro>
  pe: Record<'F' | 'T', Pe>
  pelvia: Eixos
  torax: Eixos
  cabecaEixos: Eixos
  bolas: Bola3D[]
  angulos: Angulos
  hl: Musculo[]
}

export interface Contexto {
  /** Vista de frente: o plano da coreografia é o dos ombros, e o corpo olha para quem assiste. */
  frente: boolean
  giro: number
  prof: number
  pose: Pose
  solo: number
  hl?: Musculo[]
  /** Bolas da cena, em pixels (como o motor entrega). */
  bolas?: (PontoBola | null)[]
}

const SOBE = 0.035

/** O esqueleto sem espelho (olhando para a direita) a partir do que o motor entrega. */
function desespelhar(e: Esqueleto, giro: number, frente: boolean): Esqueleto {
  if (frente || giro === 1) return e
  const cx = e.quadril.x
  const k = Math.abs(giro) < 0.05 ? 1 : 1 / giro
  const out = {} as Esqueleto
  for (const c of Object.keys(e) as (keyof Esqueleto)[]) out[c] = { x: cx + (e[c].x - cx) * k, y: e[c].y }
  return out
}

/** Gira em torno do eixo vertical (ângulo em rad), o ponto relativo à pelve. */
function girarY(p: V3, a: number): V3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c }
}

export function construirCorpo3D(entrada: Esqueleto, ctx: Contexto): Corpo3D {
  const { frente } = ctx
  const e = desespelhar(entrada, ctx.giro, frente)
  const q = e.quadril
  const folga = 18

  // --- Plano da coreografia → eixos do corpo: X = para onde olha, Y = para cima, Z = lado perto. ---
  // De lado, o plano tem frente (x) e altura (y); a profundidade (Z) é inventada pelas larguras e pela coxa encurtada.
  // De frente, o plano tem o lado (x) e a altura (y); a profundidade (X, para quem assiste) vem da coxa encurtada.
  // De frente, os ombros do desenho são estreitos (cartum): o lado do tronco e dos braços ganha largura de atleta.
  const plano = (p: { x: number; y: number }, lado: number, fundo: number, largura = 1): V3 =>
    frente
      ? { x: fundo, y: (CHAO - p.y) * ESCALA + SOBE, z: (p.x - q.x) * ESCALA * largura }
      : { x: (p.x - q.x) * ESCALA, y: (CHAO - p.y) * ESCALA + SOBE, z: lado }
  const LARGURA_OMBRO_FRENTE = 1.4

  const abre = (eF: number) => Math.sqrt(Math.max(0, 1 - eF * eF)) * 34 * ESCALA
  const { pose } = ctx

  // Pelve e ombros giram em sentidos opostos quando as pernas passam (como na corrida): rotação sutil e útil.
  const passada = frente ? 0 : limitar((pose.cF - pose.cT) * 0.07, -9, 9) * DEG
  const giroPelve = passada
  const giroOmbro = -passada * 1.25

  const lateral = (lado: number, meia: number, ang: number): V3 =>
    frente ? v3(0, 0, lado * meia) : girarY(v3(0, 0, lado * meia), ang)

  // Peso sobre o pé de apoio: quando um pé sai do chão, a pelve vai para cima do outro e o tronco compensa
  // do lado oposto (a "queda" do quadril de quem caminha ou corre).
  const altoF = (CHAO - e.tornozeloF.y) * ESCALA
  const altoT = (CHAO - e.tornozeloT.y) * ESCALA
  const peso = frente ? 0 : limitar((altoT - altoF) * 0.3, -0.06, 0.06)

  // --- Quadris, ombros e pescoço ---
  const pelve = { ...plano(q, 0, 0), z: peso }
  const quadrilF = frente ? plano(e.quadrilF, 0, 0) : soma(pelve, lateral(1, MEDIDAS.larguraQuadril, giroPelve))
  const quadrilT = frente ? plano(e.quadrilT, 0, 0) : soma(pelve, lateral(-1, MEDIDAS.larguraQuadril, giroPelve))
  const ombroCentro = frente ? mistura(plano(e.ombroP, 0, 0, LARGURA_OMBRO_FRENTE), plano(e.ombroL, 0, 0, LARGURA_OMBRO_FRENTE), 0.5) : plano({ x: (e.ombroP.x + e.ombroL.x) / 2, y: (e.ombroP.y + e.ombroL.y) / 2 }, -peso * 0.6, 0)
  let ombroP = frente ? plano(e.ombroP, 0, 0, LARGURA_OMBRO_FRENTE) : soma(ombroCentro, lateral(1, MEDIDAS.larguraOmbro, giroOmbro))
  let ombroL = frente ? plano(e.ombroL, 0, 0, LARGURA_OMBRO_FRENTE) : soma(ombroCentro, lateral(-1, MEDIDAS.larguraOmbro, giroOmbro))
  const pescoco = plano(e.pescoco, -peso * 0.6, 0)
  const cabeca = plano(e.cabeca, -peso * 0.4, 0)

  // --- Bolas e contato das mãos ---
  const maoP2 = plano(e.maoP, 0, 0, LARGURA_OMBRO_FRENTE)
  const maoL2 = plano(e.maoL, 0, 0, LARGURA_OMBRO_FRENTE)
  const bolasEntrada = (ctx.bolas ?? []).filter((b): b is PontoBola => !!b)
  const bolas: Bola3D[] = []
  const alvoMao = { P: v3(0, 0, 0), L: v3(0, 0, 0) }
  const ladoMao = { P: MEDIDAS.larguraOmbro - 0.035, L: -(MEDIDAS.larguraOmbro - 0.035) }
  const baseMao = (p: V3, lado: 'P' | 'L'): V3 => (frente ? { ...p, x: 0.12 } : { ...p, z: ladoMao[lado] })
  alvoMao.P = baseMao(maoP2, 'P')
  alvoMao.L = baseMao(maoL2, 'L')
  const maoPlano = { P: e.maoP, L: e.maoL }
  for (const b of bolasEntrada) {
    const dP = Math.hypot(b.x - maoPlano.P.x, b.y - maoPlano.P.y)
    const dL = Math.hypot(b.x - maoPlano.L.x, b.y - maoPlano.L.y)
    const wP = 1 - suave(9, folga, dP)
    const wL = 1 - suave(9, folga, dL)
    const livre = plano(b, 0, 0)
    const yBola = (CHAO - b.y - RAIO_BOLA) * ESCALA + MEDIDAS.raioBola
    const centro: V3 = { x: livre.x, y: yBola, z: frente ? livre.z : 0 }
    const dupla = Math.min(wP, wL)
    const presa = Math.max(wP, wL)
    // Presa à mão, a bola gira com o corpo: a posição dela vem do corpo sem espelho (o x da cena pode estar espelhado).
    const naoEspelhado = frente || ctx.giro === 1 || Math.abs(ctx.giro) < 0.05 ? 1 : 1 / ctx.giro
    let c = centro
    if (!frente) {
      // Uma mão: a bola está na palma (no mesmo lado dela). Duas mãos: no meio, abraçada pelos dois lados.
      const zMao = mistura(v3(0, 0, ladoMao.L), v3(0, 0, ladoMao.P), wP / Math.max(1e-6, wP + wL)).z
      c = presa > 0 ? { x: centro.x * naoEspelhado, y: yBola + SOBE * presa, z: zMao * (1 - dupla) } : centro
    } else if (presa > 0) {
      c = { x: 0.3 * presa, y: yBola + SOBE * presa, z: centro.z }
    }
    const R = MEDIDAS.raioBola - 0.012
    if (dupla > 0) {
      alvoMao.P = mistura(alvoMao.P, { x: c.x - 0.01, y: c.y, z: c.z + R }, dupla)
      alvoMao.L = mistura(alvoMao.L, { x: c.x - 0.01, y: c.y, z: c.z - R }, dupla)
    }
    bolas.push({ centro: c, livre: centro, giro: b.giro, amasso: b.amasso, presa })
  }

  // --- Pernas: quadril fixo, pé onde a coreografia pôs, joelho no lado certo ---
  const larg = MEDIDAS.larguraPassada
  const tornozeloF2 = plano(e.tornozeloF, larg, 0)
  const tornozeloT2 = plano(e.tornozeloT, -larg, 0)
  const joelhoPolo = (j: { x: number; y: number }, t: V3, h: V3, lado: number, eF: number): V3 => {
    const p = plano(j, 0, 0)
    const fora = abre(eF)
    if (frente) return { x: Math.max(0.05, fora) + 0.04, y: p.y, z: p.z }
    // De lado, o joelho fica entre o quadril e o pé; encurtada, a coxa aponta para fora do lado dela.
    return { x: p.x, y: p.y, z: (h.z + t.z) / 2 + lado * fora }
  }
  const poloF = joelhoPolo(e.joelhoF, tornozeloF2, quadrilF, 1, pose.eF)
  const poloT = joelhoPolo(e.joelhoT, tornozeloT2, quadrilT, -1, pose.eT)
  const reservaPerna = v3(1, 0, 0)
  const pernaF = doisOssos(quadrilF, tornozeloF2, poloF, MEDIDAS.coxa, MEDIDAS.canela, reservaPerna)
  const pernaT = doisOssos(quadrilT, tornozeloT2, poloT, MEDIDAS.coxa, MEDIDAS.canela, reservaPerna)

  // --- Braços: ombro fixo, mão no alvo, cotovelo para fora e para trás ---
  const poloBraco = (c: { x: number; y: number }, lado: 'P' | 'L'): V3 => {
    const p = plano(c, 0, 0, LARGURA_OMBRO_FRENTE)
    return frente ? { x: -0.1, y: p.y, z: p.z + (lado === 'P' ? 0.12 : -0.12) } : { x: p.x, y: p.y, z: ladoMao[lado] * 1.35 }
  }
  // Cintura escapular: com o braço para cima, a escápula sobe e o ombro encolhe um pouco (o ombro não é um ponto fixo).
  const eleva = (o: V3, alvo: V3, lado: 1 | -1): V3 => {
    const k = suave(0.2, 0.95, normalizar(sub(alvo, o), v3(0, -1, 0)).y)
    return { x: o.x, y: o.y + 0.04 * k, z: o.z - lado * 0.022 * k }
  }
  ombroP = eleva(ombroP, alvoMao.P, 1)
  ombroL = eleva(ombroL, alvoMao.L, -1)
  const bracoP = doisOssos(ombroP, alvoMao.P, poloBraco(e.cotoveloP, 'P'), MEDIDAS.braco, MEDIDAS.antebraco, v3(-1, 0, 0.3))
  const bracoL = doisOssos(ombroL, alvoMao.L, poloBraco(e.cotoveloL, 'L'), MEDIDAS.braco, MEDIDAS.antebraco, v3(-1, 0, -0.3))

  // --- Pés: apontam para a frente (um pouco abertos); o calcanhar sobe e a ponta fica no chão ---
  const pePara = (t: V3, lado: number): Pe => {
    const abertura = 8 * DEG * lado
    const frenteDoPe = v3(Math.cos(abertura), 0, Math.sin(abertura))
    const piso = ctx.solo * ESCALA
    const alto = t.y - piso - SOBE
    const x = (alto - MEDIDAS.alturaTornozelo) / 0.2
    const inclinacao = -Math.min(Math.asin(limitar(x, 0, 1)), 55 * DEG)
    const c = Math.cos(inclinacao)
    const s = Math.sin(inclinacao)
    const calcanhar = soma(t, v3(-frenteDoPe.x * 0.07 * c, -0.088 - frenteDoPe.x * 0.07 * -s, -frenteDoPe.z * 0.07 * c))
    const ponta = soma(t, v3(frenteDoPe.x * 0.2 * c, frenteDoPe.x * 0.2 * s - 0.04, frenteDoPe.z * 0.2 * c))
    return { tornozelo: t, frente: frenteDoPe, inclinacao, calcanhar, ponta }
  }
  const peF = pePara(pernaF.ponta, 1)
  const peT = pePara(pernaT.ponta, -1)

  // --- Eixos (para orientar pelve, tórax e cabeça) ---
  const eixos = (cima: V3, ladoRef: V3): Eixos => {
    const c = normalizar(cima, v3(0, 1, 0))
    const lado = normalizar(sub(ladoRef, mul(c, dot(ladoRef, c))), v3(0, 0, 1))
    const f = normalizar(cruz(c, lado), v3(1, 0, 0))
    return { frente: f, cima: c, lado }
  }
  const toraxEixos = eixos(sub(pescoco, pelve), sub(ombroP, ombroL))
  const pelviaEixos = eixos(v3(Math.sin(pose.t * 0.25 * DEG), 1, 0), sub(quadrilF, quadrilT))
  const olhar = sub(cabeca, pescoco)
  const cabecaEixos = eixos(olhar, sub(ombroP, ombroL))

  // --- Ângulos para mostrar ---
  const flexao = (a: V3, b: V3, c: V3) => {
    const u = normalizar(sub(a, b))
    const w = normalizar(sub(c, b))
    return 180 - Math.acos(limitar(dot(u, w), -1, 1)) / DEG
  }
  const angulos: Angulos = {
    joelhoF: flexao(quadrilF, pernaF.meio, pernaF.ponta),
    joelhoT: flexao(quadrilT, pernaT.meio, pernaT.ponta),
    quadrilF: flexao(pescoco, quadrilF, pernaF.meio),
    quadrilT: flexao(pescoco, quadrilT, pernaT.meio),
    cotoveloP: flexao(ombroP, bracoP.meio, bracoP.ponta),
    cotoveloL: flexao(ombroL, bracoL.meio, bracoL.ponta),
    tronco: pose.t,
  }

  const corpo: Corpo3D = {
    pelve,
    pescoco,
    cabeca,
    quadril: { F: quadrilF, T: quadrilT },
    ombro: { P: ombroP, L: ombroL },
    perna: { F: { raiz: quadrilF, ...pernaF }, T: { raiz: quadrilT, ...pernaT } },
    braco: { P: { raiz: ombroP, ...bracoP }, L: { raiz: ombroL, ...bracoL } },
    pe: { F: peF, T: peT },
    pelvia: pelviaEixos,
    torax: toraxEixos,
    cabecaEixos,
    bolas,
    angulos,
    hl: ctx.hl ?? [],
  }
  return corpo
}

/** Posição da pelve no mundo (a cena inteira anda em x; de frente, o lado é o x e a profundidade é z). */
export interface Colocacao {
  origem: V3
  /** Ângulo de virada (rad) em torno do eixo vertical; 0 = olhando para a cesta (direita da tela). */
  virada: number
  frente: boolean
}

function colocarPonto(p: V3, c: Colocacao): V3 {
  if (c.frente) return { x: c.origem.x + p.z, y: p.y, z: c.origem.z + p.x }
  const r = girarY(p, -c.virada)
  return { x: c.origem.x + r.x, y: p.y, z: c.origem.z + r.z }
}
function colocarVetor(v: V3, c: Colocacao): V3 {
  if (c.frente) return { x: v.z, y: v.y, z: v.x }
  return girarY(v, -c.virada)
}

/** Leva o corpo (em eixos locais) para as coordenadas do mundo. */
export function colocarNoMundo(corpo: Corpo3D, c: Colocacao): Corpo3D {
  const P = (p: V3) => colocarPonto(p, c)
  const V = (v: V3) => colocarVetor(v, c)
  const membro = (m: Membro): Membro => ({ raiz: P(m.raiz), meio: P(m.meio), ponta: P(m.ponta) })
  const eixo = (x: Eixos): Eixos => ({ frente: V(x.frente), cima: V(x.cima), lado: V(x.lado) })
  const pe = (p: Pe): Pe => ({ ...p, tornozelo: P(p.tornozelo), frente: V(p.frente), calcanhar: P(p.calcanhar), ponta: P(p.ponta) })
  return {
    ...corpo,
    pelve: P(corpo.pelve),
    pescoco: P(corpo.pescoco),
    cabeca: P(corpo.cabeca),
    quadril: { F: P(corpo.quadril.F), T: P(corpo.quadril.T) },
    ombro: { P: P(corpo.ombro.P), L: P(corpo.ombro.L) },
    perna: { F: membro(corpo.perna.F), T: membro(corpo.perna.T) },
    braco: { P: membro(corpo.braco.P), L: membro(corpo.braco.L) },
    pe: { F: pe(corpo.pe.F), T: pe(corpo.pe.T) },
    pelvia: eixo(corpo.pelvia),
    torax: eixo(corpo.torax),
    cabecaEixos: eixo(corpo.cabecaEixos),
    bolas: corpo.bolas.map((b) => {
      const presa = P(b.centro)
      const livre: V3 = c.frente ? { x: c.origem.x + b.livre.z, y: b.livre.y, z: c.origem.z + 0.15 } : { x: c.origem.x + b.livre.x, y: b.livre.y, z: c.origem.z + b.livre.z }
      const centro = b.presa > 0 ? mistura(livre, presa, b.presa) : livre
      return { ...b, centro }
    }),
  }
}

/** Eixos de um objeto que olha para `f`, com o "para cima" o mais perto possível de `cimaRef`. */
function eixosDeFrente(f: V3, cimaRef: V3): Eixos {
  const frente = normalizar(f, v3(1, 0, 0))
  const cima = normalizar(sub(cimaRef, mul(frente, dot(frente, cimaRef))), v3(0, 1, 0))
  return { frente, cima, lado: normalizar(cruz(frente, cima), v3(0, 0, 1)) }
}

/** A cesta no mundo, se a cena tem uma. */
export function posicaoDaCesta(cena: Cena | undefined): V3 | null {
  if (!cena?.cesta) return null
  return cena.cesta === 'lado' ? v3(ARO.lado.x * ESCALA, 3.05, 0) : v3(ARO.frente.x * ESCALA, 3.05, 3.4)
}

/**
 * Para onde o atleta olha: para a cesta enquanto a bola está no alto (arremesso), para a bola quando ela voa,
 * e, no resto do tempo, para a frente. A cabeça gira até 70° e inclina até 40°; o resto o corpo faz sozinho.
 */
function olharDoAtleta(corpo: Corpo3D, cesta: V3 | null): Eixos {
  const t = corpo.torax
  const neutro = soma(corpo.cabeca, mul(t.frente, 6))
  let alvo = neutro
  const bola = corpo.bolas[0]
  if (bola) {
    const alto = suave(-0.25, 0.1, bola.centro.y - corpo.pescoco.y)
    const solta = 1 - bola.presa
    const perto = 1 - suave(5, 8, distancia(bola.centro, corpo.cabeca))
    if (cesta) alvo = mistura(alvo, cesta, alto)
    alvo = mistura(alvo, bola.centro, solta * perto * (1 - (cesta ? alto : 0)) * 0.9)
  }
  const d = normalizar(sub(alvo, corpo.cabeca), t.frente)
  const fx = dot(d, t.frente)
  const fy = dot(d, t.cima)
  const fz = dot(d, t.lado)
  const giro = limitar(Math.atan2(fz, fx), -70 * DEG, 70 * DEG)
  const sobe = limitar(Math.asin(limitar(fy, -1, 1)), -40 * DEG, 40 * DEG)
  const f = soma(soma(mul(t.frente, Math.cos(sobe) * Math.cos(giro)), mul(t.lado, Math.cos(sobe) * Math.sin(giro))), mul(t.cima, Math.sin(sobe)))
  return eixosDeFrente(f, t.cima)
}

/** O corpo da cena num instante: do esqueleto do motor ao corpo 3D já no mundo. */
export function corpoNoInstante(inst: Instante, frente: boolean, cena?: Cena): Corpo3D {
  const corpo = construirCorpo3D(inst.e, {
    frente,
    giro: inst.giro,
    prof: inst.prof,
    pose: inst.pose,
    solo: inst.solo,
    hl: inst.hl,
    bolas: [inst.bola, inst.bola2],
  })
  const virada = frente ? 0 : Math.acos(limitar(inst.giro, -1, 1))
  const col: Colocacao = {
    origem: { x: inst.e.quadril.x * ESCALA, y: 0, z: frente ? 0 : inst.prof * 0.9 },
    virada,
    frente,
  }
  const mundo = colocarNoMundo(corpo, col)
  mundo.cabecaEixos = olharDoAtleta(mundo, posicaoDaCesta(cena))
  return mundo
}

/** O parceiro (defensor, passador…) vem de uma pose parada, sem bola. */
export function corpoDoParceiro(pose: Partial<Pose>, dir: 1 | -1, x: number): Corpo3D {
  const completa: Pose = { ...POSE_NEUTRA, ...pose }
  const e = espelhar(esqueleto(completa, x, alturaQuadril(completa, 0, 0, false), false), dir)
  const corpo = construirCorpo3D(e, { frente: false, giro: dir, prof: 0, pose: completa, solo: 0 })
  return colocarNoMundo(corpo, { origem: v3(x * ESCALA, 0, 0), virada: dir === 1 ? 0 : Math.PI, frente: false })
}

