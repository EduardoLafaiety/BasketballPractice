// Do esqueleto para o desenho. Há dois corpos: a silhueta (cápsulas, para o rastro e o parceiro) e o
// atleta completo (pele, camiseta, short, meias, tênis, cabelo e rosto), que é o que se move na cena.
import { CHAO, RAIO_BOLA, TORNOZELO, type Animacao, type Esqueleto, type Instante, type Musculo, type Ponto } from './motor'

const f = (v: number) => v.toFixed(1)
const P = (p: Ponto) => `${f(p.x)} ${f(p.y)}`
const soma = (o: Ponto, ...termos: [Ponto, number][]) => termos.reduce((r, [v, k]) => ({ x: r.x + v.x * k, y: r.y + v.y * k }), o)
const unit = (a: Ponto, b: Ponto) => {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }
}
const meio = (a: Ponto, b: Ponto, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })

/** Cápsula de a até b, com raio r1 numa ponta e r2 na outra. */
export function capsula(a: Ponto, b: Ponto, r1: number, r2: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l = Math.hypot(dx, dy) || 1
  const nx = -dy / l
  const ny = dx / l
  return (
    `M${f(a.x + nx * r1)} ${f(a.y + ny * r1)}L${f(b.x + nx * r2)} ${f(b.y + ny * r2)}` +
    `A${r2} ${r2} 0 0 0 ${f(b.x - nx * r2)} ${f(b.y - ny * r2)}L${f(a.x - nx * r1)} ${f(a.y - ny * r1)}` +
    `A${r1} ${r1} 0 0 0 ${f(a.x + nx * r1)} ${f(a.y + ny * r1)}Z`
  )
}

function elipse(c: Ponto, rx: number, ry: number) {
  return `M${f(c.x - rx)} ${f(c.y)}A${rx} ${ry} 0 1 0 ${f(c.x + rx)} ${f(c.y)}A${rx} ${ry} 0 1 0 ${f(c.x - rx)} ${f(c.y)}Z`
}

export type Lado = 'perto' | 'longe'
export interface Parte {
  id: string
  lado: Lado
  musculo?: Musculo
}

/** Silhueta, na ordem de desenho: o lado longe primeiro, para ficar atrás do corpo. */
export const PARTES: Parte[] = [
  { id: 'bracoL', lado: 'longe', musculo: 'bL' },
  { id: 'antebracoL', lado: 'longe', musculo: 'bL' },
  { id: 'coxaT', lado: 'longe', musculo: 'pT' },
  { id: 'canelaT', lado: 'longe', musculo: 'pT' },
  { id: 'peT', lado: 'longe' },
  { id: 'tronco', lado: 'perto' },
  { id: 'bacia', lado: 'perto' },
  { id: 'cabeca', lado: 'perto' },
  { id: 'coxaF', lado: 'perto', musculo: 'pF' },
  { id: 'canelaF', lado: 'perto', musculo: 'pF' },
  { id: 'peF', lado: 'perto' },
  { id: 'bracoP', lado: 'perto', musculo: 'bP' },
  { id: 'antebracoP', lado: 'perto', musculo: 'bP' },
]

/** Caminho SVG de cada parte da silhueta. */
export function caminhos(e: Esqueleto, dir: number, frente: boolean): Record<string, string> {
  const pe = (t: Ponto, lado: number) => (frente ? { x: t.x + lado * 4, y: t.y + 1 } : { x: t.x + dir * 9, y: t.y + 1 })
  return {
    bracoL: capsula(e.ombroL, e.cotoveloL, 4.7, 4),
    antebracoL: capsula(e.cotoveloL, e.maoL, 4, 3.4),
    coxaT: capsula(e.quadrilT, e.joelhoT, 7.5, 5.8),
    canelaT: capsula(e.joelhoT, e.tornozeloT, 5.6, 3.8),
    peT: capsula(e.tornozeloT, pe(e.tornozeloT, -1), 3.4, 2.8),
    tronco: capsula(e.quadril, e.pescoco, frente ? 11 : 9, frente ? 14 : 11.5),
    bacia: elipse(e.quadril, frente ? 13 : 10, 8.5),
    cabeca: elipse(e.cabeca, 8.5, 10),
    coxaF: capsula(e.quadrilF, e.joelhoF, 7.5, 5.8),
    canelaF: capsula(e.joelhoF, e.tornozeloF, 5.6, 3.8),
    peF: capsula(e.tornozeloF, pe(e.tornozeloF, 1), 3.4, 2.8),
    bracoP: capsula(e.ombroP, e.cotoveloP, 4.7, 4),
    antebracoP: capsula(e.cotoveloP, e.maoP, 4, 3.4),
  }
}

// O atleta completo. "material" decide a cor (pele, camiseta…); o lado longe fica mais escuro.
export type Material = 'pele' | 'camisa' | 'short' | 'meia' | 'tenis' | 'sola' | 'cabelo' | 'rosto' | 'friso'
export interface Peca {
  id: string
  material: Material
  lado: Lado
  musculo?: Musculo
}

const membro = (s: 'P' | 'L', lado: Lado, m: Musculo): Peca[] => [
  { id: `braco${s}`, material: 'pele', lado, musculo: m },
  { id: `antebraco${s}`, material: 'pele', lado, musculo: m },
  { id: `mao${s}`, material: 'pele', lado },
]
const perna = (s: 'F' | 'T', lado: Lado, m: Musculo): Peca[] => [
  { id: `coxa${s}`, material: 'pele', lado, musculo: m },
  { id: `canela${s}`, material: 'pele', lado, musculo: m },
  { id: `meia${s}`, material: 'meia', lado },
  { id: `tenis${s}`, material: 'tenis', lado },
  { id: `sola${s}`, material: 'sola', lado },
  { id: `short${s}`, material: 'short', lado, musculo: m },
]

/** Peças do atleta, de trás para a frente. */
export const PECAS: Peca[] = [
  ...membro('L', 'longe', 'bL'),
  ...perna('T', 'longe', 'pT'),
  { id: 'pescoco', material: 'pele', lado: 'perto' },
  { id: 'camisa', material: 'camisa', lado: 'perto' },
  { id: 'gola', material: 'friso', lado: 'perto' },
  { id: 'cintura', material: 'short', lado: 'perto' },
  { id: 'cabeca', material: 'pele', lado: 'perto' },
  { id: 'orelha', material: 'pele', lado: 'perto' },
  { id: 'cabelo', material: 'cabelo', lado: 'perto' },
  { id: 'rosto', material: 'rosto', lado: 'perto' },
  ...perna('F', 'perto', 'pF'),
  { id: 'cava', material: 'friso', lado: 'perto' },
  ...membro('P', 'perto', 'bP'),
]

/** Na vista de lado, "para a frente" é perpendicular ao tronco, no sentido em que o atleta olha. */
const frenteDe = (u: Ponto, dir: number) => (dir === 1 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x })

/** Tênis visto de lado: deitado no chão; no ar, segue a canela com a ponta um pouco para baixo. */
function tenis(joelho: Ponto, t: Ponto, dir: number, chao: number) {
  const canela = unit(joelho, t)
  const noAr = Math.max(0, Math.min(1, (chao - t.y) / 10))
  const perp = frenteDe({ x: -canela.x, y: -canela.y }, dir)
  const solto = unit({ x: 0, y: 0 }, soma(perp, [canela, 0.45]))
  const fv = unit({ x: 0, y: 0 }, { x: dir * (1 - noAr) + solto.x * noAr, y: solto.y * noAr })
  const n = dir === 1 ? { x: fv.y, y: -fv.x } : { x: -fv.y, y: fv.x } // para cima, perpendicular à sola
  const q = (a: number, b: number) => soma(t, [fv, a], [n, b])
  return {
    tenis:
      `M${P(q(-4, 3.5))}L${P(q(-5.5, -1.5))}Q${P(q(-6, -3.6))} ${P(q(-3.5, -3.6))}L${P(q(10, -3.6))}` +
      `Q${P(q(13.5, -3.6))} ${P(q(12.5, -0.8))}Q${P(q(10.5, 1.8))} ${P(q(4.5, 2.6))}L${P(q(-1, 4.2))}Z`,
    sola: capsula(q(-5, -3.4), q(12, -3.4), 1.1, 1.1),
  }
}

/** Caminho SVG de cada peça do atleta. `chao` é a altura do tornozelo quando o pé está no chão. */
export function caminhosAtleta(e: Esqueleto, dir: number, frente: boolean, chao = TORNOZELO): Record<string, string> {
  const c: Record<string, string> = {}
  const u = unit(e.quadril, e.pescoco)
  const uc = unit(e.pescoco, e.cabeca)

  for (const s of ['P', 'L'] as const) {
    const ombro = s === 'P' ? e.ombroP : e.ombroL
    const cotovelo = s === 'P' ? e.cotoveloP : e.cotoveloL
    const mao = s === 'P' ? e.maoP : e.maoL
    c[`braco${s}`] = capsula(ombro, cotovelo, 4.9, 4)
    c[`antebraco${s}`] = capsula(cotovelo, mao, 4, 3.1)
    c[`mao${s}`] = elipse(soma(mao, [unit(cotovelo, mao), 1.2]), 3.7, 3.7)
  }

  for (const s of ['F', 'T'] as const) {
    const quadril = s === 'F' ? e.quadrilF : e.quadrilT
    const joelho = s === 'F' ? e.joelhoF : e.joelhoT
    const t = s === 'F' ? e.tornozeloF : e.tornozeloT
    c[`coxa${s}`] = capsula(quadril, joelho, 7.6, 5.6)
    c[`canela${s}`] = capsula(joelho, t, 5.5, 3.5)
    c[`meia${s}`] = capsula(meio(joelho, t, 0.62), t, 4.3, 3.9)
    // Short largo, com a barra reta um pouco acima do joelho.
    const v = unit(quadril, joelho)
    const n = { x: -v.y, y: v.x }
    const barra = meio(quadril, joelho, 0.68)
    if (frente) {
      // De frente, cada perna do short sobe até a cintura e as duas se cruzam no meio.
      const lat = unit(e.ombroL, e.ombroP)
      const up = unit(e.quadril, e.pescoco)
      const cintura = (k: number) => soma(quadril, [lat, k], [up, 1])
      c[`short${s}`] =
        `M${P(cintura(-9.5))}L${P(cintura(9.5))}L${P(soma(barra, [n, -8.4]))}Q${P(soma(barra, [v, 1.5]))} ${P(soma(barra, [n, 8.4]))}Z`
    } else {
      const topo = soma(quadril, [v, -3])
      c[`short${s}`] =
        `M${P(soma(topo, [n, 9.2]))}L${P(soma(barra, [n, 8.4]))}Q${P(soma(barra, [v, 1.5]))} ${P(soma(barra, [n, -8.4]))}` +
        `L${P(soma(topo, [n, -9.2]))}Q${P(soma(topo, [v, -6]))} ${P(soma(topo, [n, 9.2]))}Z`
    }
    if (frente) {
      const lado = s === 'F' ? 1 : -1
      const pe = { x: t.x + lado * 1.5, y: t.y + 1.5 }
      c[`tenis${s}`] = elipse(pe, 6, 4)
      c[`sola${s}`] = capsula({ x: pe.x - 5.5, y: pe.y + 3 }, { x: pe.x + 5.5, y: pe.y + 3 }, 1.1, 1.1)
    } else {
      const { tenis: forma, sola } = tenis(joelho, t, dir, chao)
      c[`tenis${s}`] = forma
      c[`sola${s}`] = sola
    }
  }

  c.pescoco = capsula(soma(e.pescoco, [u, -6]), soma(e.pescoco, [uc, 5]), 4.3, 4)

  if (frente) {
    const lat = unit(e.ombroL, e.ombroP)
    const g = (k: number, j: number) => soma(e.quadril, [lat, k], [u, j])
    c.camisa =
      `M${P(g(-7, 47))}Q${P(g(0, 39))} ${P(g(7, 47))}L${P(g(14, 44))}Q${P(g(9, 36))} ${P(g(11, 28))}` +
      `Q${P(g(12, 12))} ${P(g(11, 1))}L${P(g(-11, 1))}Q${P(g(-12, 12))} ${P(g(-11, 28))}Q${P(g(-9, 36))} ${P(g(-14, 44))}Z`
    c.gola = `M${P(g(-7, 47))}Q${P(g(0, 39))} ${P(g(7, 47))}L${P(g(5.5, 47.5))}Q${P(g(0, 41.5))} ${P(g(-5.5, 47.5))}Z`
    c.cava = ''
    c.cintura = ''
    const ladoC = { x: uc.y * -1, y: uc.x } // perpendicular à cabeça
    c.cabeca = elipse(e.cabeca, 8.3, 10)
    c.orelha = `${elipse(soma(e.cabeca, [ladoC, 8.4]), 1.8, 2.8)}${elipse(soma(e.cabeca, [ladoC, -8.4]), 1.8, 2.8)}`
    const h = (k: number, j: number) => soma(e.cabeca, [ladoC, k], [uc, j])
    c.cabelo = `M${P(h(-8.6, 1))}Q${P(h(-9.5, 11.5))} ${P(h(0, 11))}Q${P(h(9.5, 11.5))} ${P(h(8.6, 1))}Q${P(h(5, 6.5))} ${P(h(0, 6.5))}Q${P(h(-5, 6.5))} ${P(h(-8.6, 1))}Z`
    c.rosto = `${elipse(h(-3.2, 1), 1, 1.2)}${elipse(h(3.2, 1), 1, 1.2)}`
  } else {
    const fr = frenteDe(u, dir)
    const g = (k: number, j: number) => soma(e.quadril, [fr, k], [u, j])
    c.camisa =
      `M${P(g(-7.5, 1))}C${P(g(-9, 16))} ${P(g(-10, 32))} ${P(g(-8.5, 42))}Q${P(g(-7, 48))} ${P(g(-2, 48.5))}` +
      `L${P(g(3, 48))}Q${P(g(9.5, 45))} ${P(g(10.5, 36))}C${P(g(11, 26))} ${P(g(8.5, 12))} ${P(g(8, 1))}Z`
    c.gola = capsula(g(-2, 48.2), g(3, 47.8), 1.2, 1.2)
    c.cava = ''
    c.cintura = `M${P(g(-8.5, 4))}L${P(g(8.6, 4))}Q${P(g(10, -4))} ${P(g(7, -8))}L${P(g(-7, -8))}Q${P(g(-10, -4))} ${P(g(-8.5, 4))}Z`
    const fc = frenteDe(uc, dir)
    const h = (k: number, j: number) => soma(e.cabeca, [fc, k], [uc, j])
    c.cabeca =
      `M${P(h(-8.5, 0))}Q${P(h(-8.5, 10))} ${P(h(0, 10))}Q${P(h(8.5, 10))} ${P(h(8.5, 1))}L${P(h(10, -2))}L${P(h(8.2, -3))}` +
      `Q${P(h(8, -9))} ${P(h(2, -10))}Q${P(h(-7, -10))} ${P(h(-8.5, 0))}Z`
    c.orelha = elipse(h(-1.5, -0.5), 2, 2.8)
    c.cabelo = `M${P(h(6.5, 6.5))}Q${P(h(1, 11.5))} ${P(h(-5, 9.5))}Q${P(h(-9.5, 6))} ${P(h(-8.6, -2))}Q${P(h(-6, 0))} ${P(h(-4, 4))}Q${P(h(1, 6.5))} ${P(h(6.5, 6.5))}Z`
    c.rosto = elipse(h(5, 2), 1, 1.2)
  }
  return c
}

/** Atualiza as peças do atleta, a sombra no chão, e marca os músculos em ação. */
export function pintar(
  anim: Animacao,
  agora: Instante,
  els: Record<string, SVGPathElement | null>,
  sombra?: SVGEllipseElement | null,
) {
  const chao = TORNOZELO - agora.solo
  const c = caminhosAtleta(agora.e, agora.dir, anim.frente, chao)
  for (const p of PECAS) {
    const el = els[p.id]
    if (!el) continue
    el.setAttribute('d', c[p.id])
    el.classList.toggle('demo-musculo', !!p.musculo && agora.hl.includes(p.musculo))
  }
  if (sombra) {
    const { e } = agora
    const altura = Math.max(0, chao - Math.max(e.tornozeloF.y, e.tornozeloT.y))
    const pes = (e.tornozeloF.x + e.tornozeloT.x) / 2
    const abertura = Math.abs(e.tornozeloF.x - e.tornozeloT.x)
    sombra.setAttribute('cx', f((pes * 2 + e.quadril.x) / 3))
    sombra.setAttribute('cy', f(CHAO - agora.solo + 1))
    sombra.setAttribute('rx', f(Math.max(10, (16 + abertura / 2) * (1 - Math.min(0.5, altura / 120)))))
    sombra.setAttribute('ry', anim.frente ? '4.5' : '3.5')
    sombra.setAttribute('opacity', f(Math.max(0.12, 0.32 - altura / 300)))
  }
}

export interface ElementosBola {
  bola: SVGGElement | null
  sombra: SVGEllipseElement | null
}

/** Move a bola (ou esconde, quando não há bola), com giro, achatamento no chão e sombra. */
export function posicionar(els: ElementosBola, p: Instante['bola'], solo = 0) {
  const { bola, sombra } = els
  if (bola) {
    bola.setAttribute('visibility', p ? 'visible' : 'hidden')
    if (p) {
      const sx = p.amasso < 1 ? 1 + (1 - p.amasso) * 0.7 : 1
      const dy = (1 - p.amasso) * RAIO_BOLA
      bola.setAttribute('transform', `translate(${f(p.x)} ${f(p.y + dy)}) scale(${sx.toFixed(3)} ${p.amasso.toFixed(3)}) rotate(${f(p.giro % 360)})`)
    }
  }
  if (sombra) {
    sombra.setAttribute('visibility', p ? 'visible' : 'hidden')
    if (p) {
      const chao = CHAO - solo
      const altura = Math.max(0, chao - RAIO_BOLA - p.y)
      sombra.setAttribute('cx', f(p.x))
      sombra.setAttribute('cy', f(chao + 1))
      sombra.setAttribute('rx', f(RAIO_BOLA * (1 - Math.min(0.6, altura / 250))))
      sombra.setAttribute('opacity', f(Math.max(0.06, 0.3 - altura / 500)))
    }
  }
}
