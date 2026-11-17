// Movimento real (captura de movimento da CMU) no corpo 3D.
// Cada clipe traz a posição das articulações de um jogador de verdade; aqui elas viram o nosso Corpo3D: pés e mãos
// vão aonde o jogador pôs, a pelve, os ombros e a cabeça também, e os ossos continuam com o comprimento do nosso
// atleta (cinemática inversa). A bola não vem da gravação: é deduzida da mão que quica (quando a mão chega ao
// ponto mais alto, a bola está nela; entre dois toques, cai, quica no chão e volta).
import { distancia, doisOssos, MEDIDAS, v3, type Corpo3D, type Eixos, type Pe, type V3 } from './corpo3d'

export interface Clipe {
  fps: number
  juntas: string[]
  quadros: number
  /** milímetros: [quadro][junta][x, y, z], tudo achatado. */
  dados: number[]
}

export interface Colocacao3D {
  /** Para onde o jogador olha no começo do clipe, e onde a pelve começa (m). */
  yaw: number
  origem: V3
}

const DEG = Math.PI / 180
const R = MEDIDAS.raioBola
const lim = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const suave = (a: number, b: number, x: number) => {
  const u = lim((x - a) / (b - a), 0, 1)
  return u * u * (3 - 2 * u)
}
const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z)
const soma = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z)
const mul = (a: V3, k: number): V3 => v3(a.x * k, a.y * k, a.z * k)
const mix = (a: V3, b: V3, k: number): V3 => v3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k)
const norma = (a: V3) => Math.hypot(a.x, a.y, a.z)
const unit = (a: V3, reserva = v3(1, 0, 0)): V3 => (norma(a) < 1e-9 ? reserva : mul(a, 1 / norma(a)))
const cruz = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z

export type Pose = Record<string, V3>

/** Posição de cada articulação no quadro (interpolada), em metros, no referencial do clipe. */
export function poseEm(c: Clipe, t: number): Pose {
  const f = lim((t / 1000) * c.fps, 0, c.quadros - 1)
  const i = Math.floor(f)
  const j = Math.min(c.quadros - 1, i + 1)
  const k = f - i
  const n = c.juntas.length
  const pose: Pose = {}
  c.juntas.forEach((nome, idx) => {
    const a = (i * n + idx) * 3
    const b = (j * n + idx) * 3
    pose[nome] = v3(
      (c.dados[a] + (c.dados[b] - c.dados[a]) * k) / 1000,
      (c.dados[a + 1] + (c.dados[b + 1] - c.dados[a + 1]) * k) / 1000,
      (c.dados[a + 2] + (c.dados[b + 2] - c.dados[a + 2]) * k) / 1000,
    )
  })
  return pose
}

export const duracao = (c: Clipe) => ((c.quadros - 1) / c.fps) * 1000

/** Para onde o jogador olha (horizontal) numa pose: perpendicular à linha dos quadris. */
function frenteDe(p: Pose): V3 {
  const direita = sub(p.RightUpLeg, p.LeftUpLeg)
  return unit(cruz(v3(0, 1, 0), v3(direita.x, 0, direita.z)))
}

/** O giro (rad) que faz o jogador olhar para +x a partir do quadro dado. */
export function yawParaOlharAMais(c: Clipe, t: number): number {
  const f = frenteDe(poseEm(c, t))
  return Math.atan2(f.z, f.x)
}

// ---------------------------------------------------------------------------------------------------------------
// Bola

export interface EventoBola {
  t: number
  mao: 'P' | 'L'
}

/** Toques da mão na bola: os pontos mais altos da mão que quica (com um mínimo de subida antes). */
export function toques(c: Clipe): EventoBola[] {
  const dt = 1000 / c.fps
  const eventos: (EventoBola & { proeminencia: number })[] = []
  // Quando as mãos passam de 1,5 m (subindo para o arremesso), acabou o drible.
  let fimDoDrible = Infinity
  for (let q = 0; q < c.quadros; q++) {
    const pq = poseEm(c, q * dt)
    if ((pq.RightHand.y + pq.LeftHand.y) / 2 > 1.5) {
      fimDoDrible = q * dt - 250
      break
    }
  }
  for (const mao of ['P', 'L'] as const) {
    const nome = mao === 'P' ? 'RightHand' : 'LeftHand'
    const ys: number[] = []
    for (let q = 0; q < c.quadros; q++) ys.push(poseEm(c, q * dt)[nome].y)
    const janela = Math.round(0.3 * c.fps)
    for (let q = 1; q < c.quadros - 1; q++) {
      if (!(ys[q] >= ys[q - 1] && ys[q] > ys[q + 1])) continue
      let minimo = ys[q]
      for (let d = -janela; d <= janela; d++) minimo = Math.min(minimo, ys[lim(q + d, 0, c.quadros - 1)])
      if (q * dt > fimDoDrible) continue
      if (ys[q] > 1.3) continue // mão no alto não é quique: é arremesso ou passe
      const pq = poseEm(c, q * dt)
      if (distancia(pq.RightHand, pq.LeftHand) < 0.45) continue // duas mãos juntas: preparo de arremesso, não quique
      const proeminencia = ys[q] - minimo
      if (proeminencia > 0.07) eventos.push({ t: q * dt, mao, proeminencia })
    }
  }
  eventos.sort((a, b) => a.t - b.t)
  // Toques muito próximos são o mesmo: fica o de maior subida.
  const final: typeof eventos = []
  for (const e of eventos) {
    const ult = final[final.length - 1]
    if (ult && e.t - ult.t < 280) {
      if (e.proeminencia > ult.proeminencia) final[final.length - 1] = e
    } else final.push(e)
  }
  return final.map(({ t, mao }) => ({ t, mao }))
}

/** Instante (ms) em que as duas mãos soltam a bola no alto, depois do último toque; null se não há arremesso. */
export function momentoDaSoltura(c: Clipe, ev = toques(c)): number | null {
  if (!ev.length) return null
  const dt = 1000 / c.fps
  let melhor: { t: number; y: number } | null = null
  for (let t = ev[ev.length - 1].t + 300; t <= duracao(c); t += dt) {
    const p = poseEm(c, t)
    const y = (p.RightHand.y + p.LeftHand.y) / 2
    if (distancia(p.RightHand, p.LeftHand) < 0.5 && (!melhor || y > melhor.y)) melhor = { t, y }
  }
  return melhor && melhor.y > 1.55 ? melhor.t : null
}

export interface BolaMocap {
  centro: V3
  presa: number
  /** Em que mão está (ou as duas, no arremesso). */
  maos: { P: number; L: number }
}

const NOME_MAO = { P: 'RightHand', L: 'LeftHand' } as const

/** Onde fica a bola presa a uma mão que a empurra para baixo: logo abaixo da palma. */
function abaixoDaMao(p: Pose, mao: 'P' | 'L'): V3 {
  return v3(p[NOME_MAO[mao]].x, p[NOME_MAO[mao]].y - 0.14, p[NOME_MAO[mao]].z)
}

/** Constrói uma função do tempo para a bola do clipe (quique de uma mão ou das duas, conforme os toques). */
export function construirBola(c: Clipe, ev = toques(c)): (t: number) => BolaMocap {
  const tempoSegurando = 130
  return (t: number) => {
    const p = poseEm(c, t)
    if (ev.length === 0) return { centro: mix(abaixoDaMao(p, 'P'), abaixoDaMao(p, 'L'), 0.5), presa: 1, maos: { P: 0.5, L: 0.5 } }
    // Antes do primeiro toque, a bola está na mão do primeiro; depois do último, continua na do último.
    if (t <= ev[0].t) return { centro: abaixoDaMao(p, ev[0].mao), presa: 1, maos: { P: ev[0].mao === 'P' ? 1 : 0, L: ev[0].mao === 'L' ? 1 : 0 } }
    const ult = ev[ev.length - 1]
    if (t >= ult.t) {
      // Depois do último toque, se as duas mãos se juntam, a bola vai para elas (preparo do arremesso).
      const juntas = 1 - suave(0.35, 0.6, distancia(p.RightHand, p.LeftHand))
      const naMao = abaixoDaMao(p, ult.mao)
      const entreMaos = mix(p.RightHand, p.LeftHand, 0.5)
      const centro = mix(naMao, v3(entreMaos.x, entreMaos.y + 0.02, entreMaos.z), juntas)
      return { centro, presa: 1, maos: { P: ult.mao === 'P' ? 1 - juntas * 0.5 : 0.5 * juntas, L: ult.mao === 'L' ? 1 - juntas * 0.5 : 0.5 * juntas } }
    }
    let k = 0
    while (k < ev.length - 2 && t >= ev[k + 1].t) k++
    const a = ev[k]
    const b = ev[k + 1]
    const seg = Math.min(tempoSegurando, (b.t - a.t) * 0.3)
    const maos = (m: 'P' | 'L') => ({ P: m === 'P' ? 1 : 0, L: m === 'L' ? 1 : 0 })
    if (t <= a.t + seg) return { centro: abaixoDaMao(p, a.mao), presa: 1, maos: maos(a.mao) }
    // Voo: solta da mão a, cai até o chão, quica e sobe até a mão b.
    const pa = poseEm(c, a.t + seg)
    const pb = poseEm(c, b.t)
    const sai = abaixoDaMao(pa, a.mao)
    const chega = abaixoDaMao(pb, b.mao)
    const T = b.t - (a.t + seg)
    const u = (t - (a.t + seg)) / T
    const queda = Math.max(0.01, sai.y - R)
    const subida = Math.max(0.01, chega.y - R)
    const tQueda = Math.sqrt(queda) / (Math.sqrt(queda) + Math.sqrt(subida))
    const horizontal = mix(sai, chega, u)
    let y: number
    if (u < tQueda) y = R + queda * (1 - Math.pow(u / tQueda, 1.7))
    else y = R + subida * (1 - Math.pow(1 - (u - tQueda) / (1 - tQueda), 1.7))
    // Perto da mão que vai pegar, a bola já está sendo recebida.
    const recebendo = suave(0.75, 1, u)
    const presa = recebendo * 0.9
    return { centro: v3(horizontal.x, y, horizontal.z), presa, maos: maos(b.mao) }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Corpo

/** Proporções do jogador gravado (média do clipe) contra as do nosso atleta. */
export function proporcoes(c: Clipe) {
  let tronco = 0
  let braco = 0
  const n = 12
  for (let i = 0; i < n; i++) {
    const p = poseEm(c, (i / n) * duracao(c))
    tronco += distancia(p.Hips, p.Neck)
    for (const l of ['Left', 'Right'] as const) braco += (distancia(p[l + 'Arm'], p[l + 'ForeArm']) + distancia(p[l + 'ForeArm'], p[l + 'Hand'])) / 2
  }
  tronco /= n
  braco /= n
  return { tronco: 0.631 / tronco, braco: (MEDIDAS.braco + MEDIDAS.antebraco) / braco }
}

function eixosDe(cima: V3, ladoRef: V3): Eixos {
  const c = unit(cima, v3(0, 1, 0))
  const lado = unit(sub(ladoRef, mul(c, dot(ladoRef, c))), v3(0, 0, 1))
  return { frente: unit(cruz(c, lado), v3(1, 0, 0)), cima: c, lado }
}

/** Gira em torno do eixo vertical (rad) um ponto relativo à origem. */
function girar(p: V3, a: number): V3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return v3(p.x * c - p.z * s, p.y, p.x * s + p.z * c)
}

/**
 * O corpo do jogador gravado no tempo t (ms) já no mundo. `bola` vem de construirBola (no referencial do clipe).
 * O referencial do clipe é girado por `yaw` em torno da pelve inicial e levado para `origem`.
 */
export interface Arremesso {
  /** Instante da soltura (ms) e posição da cesta no mundo. */
  t: number
  cesta: V3
}

export function corpoMocap(
  c: Clipe,
  t: number,
  col: Colocacao3D,
  bola: ((t: number) => BolaMocap) | null,
  arremesso: Arremesso | null = null,
  prop = proporcoes(c),
): Corpo3D {
  const p0 = poseEm(c, 0)
  const lugar = (v: V3): V3 => {
    const r = girar(v3(v.x - p0.Hips.x, 0, v.z - p0.Hips.z), -col.yaw)
    return v3(col.origem.x + r.x, v.y + SOBE, col.origem.z + r.z)
  }
  const dirMundo = (v: V3): V3 => girar(v, -col.yaw)
  const p = poseEm(c, t)
  const pelve = p.Hips
  // Tronco e braços na escala do nosso atleta, em torno da pelve (as pernas já estão na escala certa).
  const doTronco = (v: V3): V3 => v3(pelve.x + (v.x - pelve.x) * prop.tronco, pelve.y + (v.y - pelve.y) * prop.tronco, pelve.z + (v.z - pelve.z) * prop.tronco)
  // Braço: do ombro (já na escala do tronco) até o ponto, com o vetor ombro→ponto na escala do braço.
  const noBraco = (l: 'Right' | 'Left', v: V3): V3 => {
    const bruto = p[l + 'Arm']
    const ombro = doTronco(bruto)
    return v3(ombro.x + (v.x - bruto.x) * prop.braco, ombro.y + (v.y - bruto.y) * prop.braco, ombro.z + (v.z - bruto.z) * prop.braco)
  }

  const quadrilF = lugar(p.RightUpLeg)
  const quadrilT = lugar(p.LeftUpLeg)
  const perna = (raiz: V3, polo: V3, alvo: V3) => doisOssos(raiz, alvo, polo, MEDIDAS.coxa, MEDIDAS.canela, v3(1, 0, 0))
  const pernaF = perna(quadrilF, lugar(p.RightLeg), lugar(p.RightFoot))
  const pernaT = perna(quadrilT, lugar(p.LeftLeg), lugar(p.LeftFoot))

  const ombroP = lugar(doTronco(p.RightArm))
  const ombroL = lugar(doTronco(p.LeftArm))
  const alvoMao = (l: 'Right' | 'Left') => lugar(noBraco(l, p[l + 'Hand']))
  const maoP = alvoMao('Right')
  const maoL = alvoMao('Left')
  const bracoP = doisOssos(ombroP, maoP, lugar(noBraco('Right', p.RightForeArm)), MEDIDAS.braco, MEDIDAS.antebraco, v3(-1, 0, 0.3))
  const bracoL = doisOssos(ombroL, maoL, lugar(noBraco('Left', p.LeftForeArm)), MEDIDAS.braco, MEDIDAS.antebraco, v3(-1, 0, -0.3))

  const pescoco = lugar(doTronco(p.Neck))
  // A cabeça fica na direção pescoço→cabeça da gravação, a 0,18 m do pescoço (a medida do nosso atleta).
  const cabeca = soma(pescoco, mul(unit(sub(lugar(doTronco(p.Head)), pescoco), v3(0, 1, 0)), 0.18))
  const pelveM = lugar(pelve)
  const cabecaCentro = cabeca

  const pe = (calc: V3, ponta: V3): Pe => {
    const f = unit(v3(ponta.x - calc.x, 0, ponta.z - calc.z), dirMundo(frenteDe(p)))
    const alto = calc.y - MEDIDAS.alturaTornozelo - SOBE
    const inclinacao = -Math.min(Math.asin(lim((alto - 0.0) / 0.2, 0, 1)), 55 * DEG)
    return {
      tornozelo: calc,
      frente: f,
      inclinacao,
      calcanhar: v3(calc.x - f.x * 0.07, calc.y - 0.088, calc.z - f.z * 0.07),
      ponta: lugar(ponta),
    }
  }
  const peF = pe(pernaF.ponta, p.RightToeBase)
  const peT = pe(pernaT.ponta, p.LeftToeBase)
  const peF2 = { ...peF, ponta: lugar(p.RightToeBase) }
  const peT2 = { ...peT, ponta: lugar(p.LeftToeBase) }

  const ladoRef = sub(ombroP, ombroL)
  const torax = eixosDe(sub(pescoco, pelveM), ladoRef)
  const pelvia = eixosDe(v3(0, 1, 0), sub(quadrilF, quadrilT))
  const cabecaEixos = eixosDe(sub(cabecaCentro, pescoco), ladoRef)

  const b = bola ? bola(arremesso ? Math.min(t, arremesso.t) : t) : null
  let bolas = b
    ? [{ centro: lugar(b.centro), livre: lugar(b.centro), giro: (t / 1000) * 360 * 1.2, amasso: b.centro.y < R + 0.01 ? 0.85 : 1, presa: b.presa }]
    : []
  if (b && arremesso && t > arremesso.t) {
    // Depois da soltura, a bola voa até a cesta (parábola) e cai pela rede, sem mais nenhuma mão nela.
    const sai = lugar(bola!(arremesso.t).centro)
    const T = 850
    const u = (t - arremesso.t) / T
    const alvo = arremesso.cesta
    let centro: V3
    if (u <= 1) {
      const pico = 0.9
      centro = v3(sai.x + (alvo.x - sai.x) * u, sai.y + (alvo.y - sai.y) * u + pico * 4 * u * (1 - u), sai.z + (alvo.z - sai.z) * u)
    } else {
      const s = (t - arremesso.t - T) / 1000
      centro = v3(alvo.x, Math.max(R, alvo.y - 4.9 * s * s), alvo.z)
    }
    bolas = [{ centro, livre: centro, giro: -(t / 1000) * 360 * 2, amasso: 1, presa: 0 }]
  }

  const corpo: Corpo3D = {
    pelve: pelveM,
    pescoco,
    cabeca: cabecaCentro,
    quadril: { F: quadrilF, T: quadrilT },
    ombro: { P: ombroP, L: ombroL },
    perna: { F: { raiz: quadrilF, ...pernaF }, T: { raiz: quadrilT, ...pernaT } },
    braco: { P: { raiz: ombroP, ...bracoP }, L: { raiz: ombroL, ...bracoL } },
    pe: { F: peF2, T: peT2 },
    pelvia,
    torax,
    cabecaEixos,
    bolas,
    angulos: { joelhoF: 0, joelhoT: 0, quadrilF: 0, quadrilT: 0, cotoveloP: 0, cotoveloL: 0, tronco: 0 },
    hl: [],
  }
  corpo.angulos = angulosDe(corpo)
  return corpo
}

const SOBE = 0.035

function angulosDe(c: Corpo3D) {
  const flexao = (a: V3, b: V3, d: V3) => 180 - (Math.acos(lim(dot(unit(sub(a, b)), unit(sub(d, b))), -1, 1)) * 180) / Math.PI
  const lean = (Math.asin(lim(dot(c.torax.cima, c.torax.frente), -1, 1)) * 180) / Math.PI
  return {
    joelhoF: flexao(c.quadril.F, c.perna.F.meio, c.perna.F.ponta),
    joelhoT: flexao(c.quadril.T, c.perna.T.meio, c.perna.T.ponta),
    quadrilF: flexao(c.pescoco, c.quadril.F, c.perna.F.meio),
    quadrilT: flexao(c.pescoco, c.quadril.T, c.perna.T.meio),
    cotoveloP: flexao(c.ombro.P, c.braco.P.meio, c.braco.P.ponta),
    cotoveloL: flexao(c.ombro.L, c.braco.L.meio, c.braco.L.ponta),
    tronco: Math.round(lean * 10) / 10,
  }
}
