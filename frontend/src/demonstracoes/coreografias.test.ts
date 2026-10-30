import { describe, expect, it } from 'vitest'
import { catalog } from '../../../backend/src/db/seed'
import { coreografiaDe, COREOGRAFIAS } from './coreografias'
import { CHAO, esqueletoDa, faseEm, instante, pegadas, preparar } from './motor'

const nomes = Object.keys(COREOGRAFIAS)

describe('Coreografias', () => {
  it('existe uma para cada exercício do catálogo padrão, e nenhuma sobrando', () => {
    expect(nomes.sort()).toEqual(catalog.map(([nome]) => nome).sort())
  })

  it('exercício criado pelo atleta não tem demonstração, mesmo com nome do catálogo', () => {
    expect(coreografiaDe('Lance livre', false)).toBe(COREOGRAFIAS['Lance livre'])
    expect(coreografiaDe('Lance livre', true)).toBeUndefined()
    expect(coreografiaDe('Meu floater', false)).toBeUndefined()
  })

  it.each(nomes)('%s: fases na ordem da lista, cada uma com quadros e um texto', (nome) => {
    const c = COREOGRAFIAS[nome]
    expect(c.quadros[0].d).toBe(0)
    expect(c.quadros.slice(1).every((q) => q.d > 0)).toBe(true)
    // Exercícios em ciclo repetem fases, mas cada uma aparece pela primeira vez na ordem da lista.
    const fases = c.quadros.map((q) => q.fase)
    const primeiras = [...new Set(fases)]
    expect(primeiras).toEqual(c.fases.map((_, i) => i))
    for (const f of c.fases) expect(f.titulo && f.texto.endsWith('.')).toBeTruthy()
  })

  it.each(nomes)('%s: corpo e bola ficam dentro da cena durante toda a animação', (nome) => {
    const anim = preparar(COREOGRAFIAS[nome])
    for (let t = 0; t <= anim.total; t += 25) {
      const agora = instante(anim, t)
      const pontos = [...Object.values(agora.e), agora.bola, agora.bola2].filter((p) => p !== null)
      for (const p of pontos) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y), `${nome} em ${t}ms`).toBe(true)
        expect(p.x, `${nome} em ${t}ms`).toBeGreaterThan(0)
        expect(p.x, `${nome} em ${t}ms`).toBeLessThan(680)
        expect(p.y, `${nome} em ${t}ms`).toBeGreaterThan(-20)
        expect(p.y, `${nome} em ${t}ms`).toBeLessThan(CHAO + 4)
      }
    }
  })

  it.each(nomes)('%s: em cada pose-chave o pé mais baixo pisa no chão (ou o atleta está no ar)', (nome) => {
    const anim = preparar(COREOGRAFIAS[nome])
    anim.chaves.forEach((k, i) => {
      const e = esqueletoDa(anim, k)
      const pe = Math.max(e.tornozeloF.y, e.tornozeloT.y)
      const ar = COREOGRAFIAS[nome].quadros[i].ar ?? 0
      expect(pe + ar + k.solo).toBeCloseTo(CHAO - 4, 5)
    })
  })
})

describe('Motor da animação', () => {
  const anim = preparar(COREOGRAFIAS['Step-back de três'])

  it('cada fase começa na sua pose-chave e a fase mostrada acompanha o tempo', () => {
    expect(anim.inicioFase).toHaveLength(7)
    expect(anim.inicioFase).toEqual([...anim.inicioFase].sort((a, b) => a - b))
    anim.inicioFase.forEach((t, f) => expect(faseEm(anim, t)).toBe(f))
    expect(faseEm(anim, anim.total)).toBe(6)
  })

  it('a bola sai da mão e termina no chão, embaixo da cesta', () => {
    expect(instante(anim, 0).bola).not.toBeNull()
    const fim = instante(anim, anim.total).bola!
    expect(fim.x).toBeCloseTo(636, 0)
    expect(fim.y).toBeGreaterThan(CHAO - 10)
  })

  it('marca o pé da frente em ação ao frear e empurrar', () => {
    expect(instante(anim, anim.inicioFase[2]).hl).toEqual(['pF'])
    expect(instante(anim, anim.inicioFase[0]).hl).toEqual([])
  })

  it('as pegadas aparecem em ordem e mostram o recuo do step-back', () => {
    const marcas = pegadas(anim)
    expect(marcas.map((m) => m.tempo)).toEqual([...marcas.map((m) => m.tempo)].sort((a, b) => a - b))
    const frente = marcas.filter((m) => m.pe === 'F')
    const plantado = frente.find((m) => m.fase === 1)!
    const recuo = frente.find((m) => m.fase === 4)!
    expect(recuo.x).toBeLessThan(plantado.x - 40)
  })
})
