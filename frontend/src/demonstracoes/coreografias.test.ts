import { describe, expect, it } from 'vitest'
import { catalog } from '../../../backend/src/db/seed'
import { coreografiaDe, COREOGRAFIAS } from './coreografias'
import { CHAO, esqueletoDa, faseEm, instante, pegadas, preparar } from './motor'

const nomes = Object.keys(COREOGRAFIAS)

describe('Coreografias', () => {
  it('existe uma para cada exercício do catálogo padrão, e nenhuma sobrando', () => {
    expect(nomes.sort()).toEqual(catalog.map(([nome]) => nome).sort())
  })

  it('cada figura é um movimento próprio, sem quadros repetidos de outra', () => {
    const repetidas = nomes.filter((n, i) => nomes.findIndex((m) => JSON.stringify(COREOGRAFIAS[m].quadros) === JSON.stringify(COREOGRAFIAS[n].quadros)) !== i)
    expect(repetidas).toEqual([])
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

describe('Movimento contínuo, como num vídeo', () => {
  it('na corrida o quadril atravessa cada passada sem frear', () => {
    const anim = preparar(COREOGRAFIAS['Suicídio'])
    const quadril = (t: number) => instante(anim, t).e.quadril.x
    const passadas = anim.chaves.filter((k, i) => i > 1 && k.fase === 0 && i < anim.chaves.length - 1 && anim.chaves[i + 1].fase === 0)
    expect(passadas.length).toBeGreaterThan(3)
    for (const k of passadas) expect(quadril(k.tempo + 8) - quadril(k.tempo - 8), `em ${k.tempo}ms`).toBeGreaterThan(1)
  })

  it('entre duas passadas há uma pose de passagem, que não deixa pegada nem mexe na bola', () => {
    const anim = preparar(COREOGRAFIAS['Bandeja com a mão fraca'])
    const passagens = anim.chaves.filter((k) => k.entre)
    expect(passagens.length).toBe(5)
    const tempos = new Set(passagens.map((k) => k.tempo))
    expect(pegadas(anim).some((m) => tempos.has(m.tempo))).toBe(false)
  })

  it('o pé de apoio não escorrega enquanto o corpo se mexe em cima dele', () => {
    const anim = preparar(COREOGRAFIAS['Saltos na caixa'])
    const [a, b] = anim.chaves
    const pe = (t: number) => instante(anim, t).e.tornozeloF.x
    const quadril = (t: number) => instante(anim, t).e.quadril.x
    expect(Math.abs(quadril(b.tempo) - quadril(a.tempo))).toBeGreaterThan(5)
    // Agachando, o pé vai direto de uma posição à outra (quase parado), sem ir e voltar.
    const xs = Array.from({ length: 21 }, (_, i) => pe(a.tempo + ((b.tempo - a.tempo) * i) / 20))
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(Math.abs(xs[20] - xs[0]), 5)
    expect(Math.abs(xs[20] - xs[0])).toBeLessThan(Math.abs(quadril(b.tempo) - quadril(a.tempo)))
  })

  it('a bola faz a parábola num ritmo só, passa pelo aro e quica até parar', () => {
    const anim = preparar(COREOGRAFIAS['Lance livre'])
    const xs: number[] = []
    for (let t = 2500; t <= 3100; t += 50) xs.push(instante(anim, t).bola!.x)
    const passos = xs.slice(1).map((x, i) => x - xs[i])
    for (const p of passos) expect(p).toBeCloseTo(passos[0], 0)
    const alturas: number[] = []
    for (let t = 3300; t <= anim.total; t += 10) alturas.push(instante(anim, t).bola!.y)
    const chao = CHAO - 7
    const toques = alturas.filter((y, i) => y > chao - 1 && (alturas[i - 1] ?? 0) <= chao - 1).length
    expect(toques).toBeGreaterThan(1)
    expect(alturas.at(-1)).toBeCloseTo(chao, 0)
  })

  it('no quique, a bola acelera ao descer e chega achatada no chão', () => {
    const anim = preparar(COREOGRAFIAS['Drible estacionário'])
    const [ini, fim] = [anim.chaves[0].tempo, anim.chaves[1].tempo]
    const y = (f: number) => instante(anim, ini + (fim - ini) * f).bola!.y
    expect(y(1) - y(0.75)).toBeGreaterThan(y(0.25) - y(0))
    expect(instante(anim, fim).bola!.amasso).toBeLessThan(1)
    expect(instante(anim, ini).bola!.amasso).toBe(1)
  })

  it('ao virar, o corpo afina no meio do giro em vez de espelhar de repente', () => {
    const anim = preparar(COREOGRAFIAS['Suicídio'])
    const i = anim.chaves.findIndex((k, j) => j > 0 && k.dir !== anim.chaves[j - 1].dir)
    const meio = (anim.chaves[i - 1].tempo + anim.chaves[i].tempo) / 2
    const largura = (t: number) => {
      const { e } = instante(anim, t)
      return Math.abs(e.cabeca.x - e.quadril.x) + Math.abs(e.maoP.x - e.quadril.x)
    }
    expect(largura(meio)).toBeLessThan(largura(anim.chaves[i].tempo) * 0.7)
  })
})
