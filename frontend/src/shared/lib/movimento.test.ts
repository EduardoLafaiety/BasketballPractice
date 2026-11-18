import { afterEach, describe, expect, it, vi } from 'vitest'
import { aplicarMovimento, definirAnimacoes, menosMovimento } from './movimento'

const sistemaPedeMenosMovimento = (sim: boolean) => vi.stubGlobal('matchMedia', () => ({ matches: sim }))

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('Animações e efeitos', () => {
  it('ficam ligados por padrão, mesmo com o sistema pedindo menos movimento', () => {
    sistemaPedeMenosMovimento(true)
    expect(menosMovimento()).toBe(false)
    aplicarMovimento()
    expect(document.documentElement.dataset.movimento).toBe('normal')
  })

  it('"Seguir o sistema" obedece ao menos movimento do aparelho', () => {
    definirAnimacoes('sistema')
    sistemaPedeMenosMovimento(true)
    expect(menosMovimento()).toBe(true)
    sistemaPedeMenosMovimento(false)
    expect(menosMovimento()).toBe(false)
  })

  it('"Desligadas" tira o movimento e avisa o CSS pelo <html>', () => {
    sistemaPedeMenosMovimento(false)
    definirAnimacoes('desligadas')
    expect(menosMovimento()).toBe(true)
    expect(document.documentElement.dataset.movimento).toBe('reduzido')
    definirAnimacoes('ligadas')
    expect(document.documentElement.dataset.movimento).toBe('normal')
  })
})
