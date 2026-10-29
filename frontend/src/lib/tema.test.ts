import { afterEach, describe, expect, it } from 'vitest'
import { aplicarTema, temaSalvo } from './tema'

afterEach(() => {
  delete document.documentElement.dataset.theme
})

describe('tema', () => {
  it('aplica claro e escuro no <html> e guarda a escolha', () => {
    aplicarTema('escuro')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(temaSalvo()).toBe('escuro')

    aplicarTema('claro')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(temaSalvo()).toBe('claro')
  })

  it('"sistema" tira o atributo para valer o prefers-color-scheme', () => {
    aplicarTema('escuro')
    aplicarTema('sistema')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(temaSalvo()).toBe('sistema')
  })

  it('ignora um valor salvo inválido', () => {
    localStorage.setItem('bp.tema', 'roxo')
    expect(temaSalvo()).toBe('sistema')
  })
})
