// Do esqueleto para o desenho: cada parte do manequim vira um caminho SVG com volume (cápsula afinando).
import type { Esqueleto, Musculo, Ponto } from './motor'

const f = (v: number) => v.toFixed(1)

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

/** Ordem de desenho: o lado longe primeiro, para ficar atrás do corpo. */
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

/** Caminho SVG de cada parte do corpo. */
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
