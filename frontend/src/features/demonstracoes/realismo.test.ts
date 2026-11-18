import { describe, expect, it } from 'vitest'
import { COREOGRAFIAS } from './coreografias'
import { corpoNoTempo } from './corpo3d'
import { instante, preparar } from './motor'
import { medir } from './realismo'

// Limites do que um olho atento não estranha (medidos a 60 quadros por segundo em todas as coreografias).
const LIMITES = {
  bolaNoTronco: 0.02,
  bolaNasPernas: 0.07,
  maoNoTronco: 0.03,
  maoLongeDaBola: 0.12,
  joelhoParaTras: 0.02,
  trancoPelve: 450,
  trancoMao: 1200,
  bolaNoChao: 0.02,
} as const

describe('realismo em 3D de todas as coreografias', () => {
  const medidas = Object.entries(COREOGRAFIAS).map(([nome, c]) => [nome, medir(c)] as const)

  for (const [chave, limite] of Object.entries(LIMITES) as [keyof typeof LIMITES, number][]) {
    it(`${chave} fica abaixo de ${limite}`, () => {
      const piores = medidas.filter(([, m]) => m[chave] > limite).map(([nome, m]) => `${nome}: ${m[chave].toFixed(3)}`)
      expect(piores).toEqual([])
    })
  }
})

describe('manejo de bola em 3D', () => {
  const caminho = (nome: string) => {
    const c = COREOGRAFIAS[nome]
    const anim = preparar(c)
    const pontos: { t: number; bola: { x: number; y: number; z: number }; pelve: { x: number; z: number }; joelhoF: number; joelhoT: number; presa: number }[] = []
    for (let t = 0; t <= anim.total; t += 1000 / 60) {
      const k = corpoNoTempo(anim, t, c.cena)
      const b = k.bolas[0]
      if (!b) continue
      pontos.push({ t, bola: b.centro, pelve: { x: k.pelve.x, z: k.pelve.z }, joelhoF: k.perna.F.meio.x, joelhoT: k.perna.T.meio.x, presa: b.presa })
    }
    return { pontos, anim, inst: (t: number) => instante(anim, t) }
  }

  it('bola ao redor da cintura passa de verdade por trás das costas (cena de frente: atrás é z negativo)', () => {
    const { pontos } = caminho('Bola ao redor da cintura')
    const atras = Math.min(...pontos.map((p) => p.bola.z - p.pelve.z))
    const frente = Math.max(...pontos.map((p) => p.bola.z - p.pelve.z))
    expect(atras).toBeLessThan(-0.25)
    expect(frente).toBeGreaterThan(0.25)
  })

  it('a volta é contínua: a bola não para nem dá trancos entre os pontos', () => {
    const { pontos } = caminho('Bola ao redor da cintura')
    let maiorTranco = 0
    for (let i = 2; i < pontos.length; i++) {
      const [a, b, c] = [pontos[i - 2].bola, pontos[i - 1].bola, pontos[i].bola]
      maiorTranco = Math.max(maiorTranco, Math.hypot(a.x - 2 * b.x + c.x, a.y - 2 * b.y + c.y, a.z - 2 * b.z + c.z) * 3600)
    }
    // aceleração máxima (m/s²) de uma volta rápida em torno da cintura, sem paradas bruscas
    expect(maiorTranco).toBeLessThan(120)
  })

  it('no oito, a bola passa entre os joelhos e contorna cada perna pela frente e por trás', () => {
    const { pontos } = caminho('Oito entre as pernas')
    const entre = pontos.filter((p) => p.bola.x > Math.min(p.joelhoF, p.joelhoT) + 0.05 && p.bola.x < Math.max(p.joelhoF, p.joelhoT) - 0.05)
    expect(entre.length).toBeGreaterThan(10)
    const foraDireita = pontos.filter((p) => p.bola.x > Math.max(p.joelhoF, p.joelhoT))
    expect(Math.min(...foraDireita.map((p) => p.bola.z))).toBeLessThan(-0.05)
    expect(Math.max(...foraDireita.map((p) => p.bola.z))).toBeGreaterThan(0.15)
  })

  it('por trás das costas em movimento: a bola passa atrás do quadril, de um lado do corpo para o outro', () => {
    const { pontos } = caminho('Por trás das costas em movimento')
    const atras = pontos.filter((p) => p.bola.x < p.pelve.x - 0.12 && p.bola.y < 0.9)
    expect(atras.length).toBeGreaterThan(3)
    const zs = atras.map((p) => p.bola.z - p.pelve.z)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(0.08)
  })

  it('num giro (vira e volta), o corpo dá a volta inteira, sem "desvirar"', () => {
    const c = COREOGRAFIAS['Giro e bandeja']
    const anim = preparar(c)
    let anterior = instante(anim, 0).angulo
    let recuou = 0
    for (let t = 0; t <= anim.total; t += 10) {
      const a = instante(anim, t).angulo
      if (a < anterior - 1e-6) recuou++
      anterior = a
    }
    expect(recuou).toBe(0)
    expect(anterior).toBeGreaterThanOrEqual(Math.PI * 2 - 1e-6)
  })
})
