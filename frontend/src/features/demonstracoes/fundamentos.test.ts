import { describe, expect, it } from 'vitest'
import { COREOGRAFIAS } from './coreografias'
import { corpoNoTempo } from './corpo3d'
import { preparar } from './motor'

describe('coordenação dos fundamentos', () => {
  it.each(['Quiques leves parado', 'Drible parado com a mão direita', 'Drible parado com a mão esquerda'])('%s: recebe a bola por cima e mantém a mão de apoio livre', (nome) => {
    const c = COREOGRAFIAS[nome]
    const anim = preparar(c)
    let contatos = 0
    for (let t = 0; t < anim.total; t += 16) {
      const corpo = corpoNoTempo(anim, t, c.cena)
      for (const bola of corpo.bolas) {
        if (!bola.quique || bola.quique.d > 0.015 || bola.presa < 0.95) continue
        const mao = corpo.braco[bola.quique.lado].ponta
        expect(mao.y - bola.centro.y).toBeGreaterThan(0.11)
        expect(Math.hypot(mao.x - bola.centro.x, mao.z - bola.centro.z)).toBeLessThan(0.035)
        contatos++
      }
    }
    expect(contatos).toBeGreaterThan(3)
  })

  it('polichinelo sai do chão com os dois pés e volta a apoiar', () => {
    const c = COREOGRAFIAS['Polichinelo leve']
    const anim = preparar(c)
    const poses = anim.chaves.map(k => corpoNoTempo(anim, k.tempo, c.cena))
    expect(poses.some(p => p.pe.F.tornozelo.y > 0.17 && p.pe.T.tornozelo.y > 0.17)).toBe(true)
    expect(poses.some(p => p.pe.F.tornozelo.y < 0.11 && p.pe.T.tornozelo.y < 0.11)).toBe(true)
  })

  it('deslizamento defensivo conserva a base e não cruza os pés', () => {
    const c = COREOGRAFIAS['Deslizamento defensivo']
    const anim = preparar(c)
    const alturas: number[] = []
    for (let t = 0; t <= anim.total; t += 30) {
      const corpo = corpoNoTempo(anim, t, c.cena)
      expect(corpo.pe.F.tornozelo.x - corpo.pe.T.tornozelo.x).toBeGreaterThan(0.1)
      alturas.push(corpo.pelve.y)
    }
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeLessThan(0.12)
  })
  it('mantém a visão à frente durante os quiques baixos', () => {
    const c = COREOGRAFIAS['Drible estacionário']
    const anim = preparar(c)
    let amostras = 0
    for (let t = 0; t < anim.total; t += 40) {
      const corpo = corpoNoTempo(anim, t, c.cena)
      if (!corpo.bolas.some((b) => b.centro.y < corpo.pelve.y)) continue
      expect(corpo.cabecaEixos.frente.y).toBeGreaterThanOrEqual(corpo.torax.frente.y - 0.05)
      amostras++
    }
    expect(amostras).toBeGreaterThan(10)
  })

  it('não oscila cabeça nem tronco com a bola no drible parado', () => {
    const c = COREOGRAFIAS['Quiques leves parado']
    const anim = preparar(c)
    const estados = []
    for (let t = 0; t < 2500; t += 40) estados.push(corpoNoTempo(anim, t, c.cena))
    const alturas = estados.map(p => p.cabeca.y)
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeLessThan(0.005)
    estados.forEach(p => expect(Math.abs(p.cabecaEixos.frente.y)).toBeLessThan(0.001))
  })

  it('finaliza a bandeja fraca com a mão correspondente ao joelho elevado', () => {
    const c = COREOGRAFIAS['Bandeja com a mão fraca']
    const anim = preparar(c)
    const subida = anim.chaves.find((k) => k.ar === 38)!
    const corpo = corpoNoTempo(anim, subida.tempo, c.cena)
    expect(corpo.braco.L.ponta.y).toBeGreaterThan(corpo.braco.P.ponta.y + 0.15)
    expect(corpo.perna.T.meio.y).toBeGreaterThan(corpo.perna.F.meio.y + 0.15)
    expect(corpo.bolas[0].centro.y).toBeGreaterThan(corpo.cabeca.y)
  })
})
