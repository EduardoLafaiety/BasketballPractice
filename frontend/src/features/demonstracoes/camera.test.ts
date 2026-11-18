import { describe, expect, it } from 'vitest'
import { janela, mirar, QUADRO, seguir } from './camera'
import { COREOGRAFIAS } from './coreografias'
import { CHAO, instante, preparar, type Ponto } from './motor'

const dentro = (p: Ponto, j: ReturnType<typeof janela>) => p.x >= j.x && p.x <= j.x + j.w && p.y >= j.y && p.y <= j.y + j.h

describe('Câmera', () => {
  it('fecha no atleta driblando parado, com corpo e bola dentro do quadro', () => {
    const anim = preparar(COREOGRAFIAS['Drible estacionário'])
    for (let t = 0; t <= anim.total; t += 100) {
      const agora = instante(anim, t)
      const j = janela(mirar(agora))
      expect(j.z).toBeGreaterThan(1.5)
      for (const p of [...Object.values(agora.e), agora.bola!]) expect(dentro(p, j), `em ${t}ms`).toBe(true)
    }
  })

  it('abre o plano quando a bola sobe para o aro, sem perdê-la de vista', () => {
    const anim = preparar(COREOGRAFIAS['Lance livre'])
    const driblando = mirar(instante(anim, 200)).z
    let menor = Infinity
    for (let t = anim.inicioFase[3]; t <= anim.total; t += 25) {
      const agora = instante(anim, t)
      const j = janela(mirar(agora))
      menor = Math.min(menor, j.z)
      expect(dentro(agora.bola!, j), `em ${t}ms`).toBe(true)
    }
    expect(menor).toBeLessThan(driblando - 0.4)
  })

  it('o chão fica sempre embaixo e o quadro nunca sai da cena', () => {
    for (const nome of Object.keys(COREOGRAFIAS)) {
      const anim = preparar(COREOGRAFIAS[nome])
      for (let t = 0; t <= anim.total; t += 200) {
        const j = janela(mirar(instante(anim, t)))
        expect(j.z).toBeGreaterThanOrEqual(1)
        expect(j.x).toBeGreaterThanOrEqual(0)
        expect(j.x + j.w).toBeLessThanOrEqual(QUADRO.w + 1e-9)
        expect(j.y + j.h).toBeCloseTo(QUADRO.h, 6)
        expect(CHAO).toBeGreaterThan(j.y)
      }
    }
  })

  it('acompanha aos poucos, sem pular junto com o lance', () => {
    const de = { cx: 200, z: 1.8 }
    const para = { cx: 500, z: 1 }
    const um = seguir(de, para, 16)
    expect(um.cx).toBeGreaterThan(200)
    expect(um.cx).toBeLessThan(250)
    let m = de
    for (let i = 0; i < 120; i++) m = seguir(m, para, 16)
    expect(m.cx).toBeCloseTo(500, 0)
    expect(m.z).toBeCloseTo(1, 2)
  })
})
