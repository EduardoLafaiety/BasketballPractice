import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirAnimacoes } from '../lib/movimento'
import { NomesMosaico } from './rolagem'

const NOMES = ['Stephen Curry', 'LeBron James', 'Nikola Jokić']

function mosaico() {
  return document.querySelector('.nomes-mosaico') as HTMLElement
}

describe('NomesMosaico', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('espera fora da tela e derruba os nomes uma vez só, quando a seção aparece', () => {
    // O jsdom não tem IntersectionObserver: este finge a seção entrando e saindo da tela.
    let avisar: (visivel: boolean) => void = () => {}
    const desligar = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(chamar: (itens: { isIntersecting: boolean }[]) => void) {
          avisar = (visivel) => chamar([{ isIntersecting: visivel }])
        }
        observe() {}
        disconnect = desligar
      },
    )
    render(<NomesMosaico nomes={NOMES} titulo={<h1>Jogue como</h1>} />)

    expect(screen.getByRole('heading', { name: 'Jogue como' })).toBeInTheDocument()
    expect(mosaico()).toHaveClass('esperando')
    expect(mosaico()).toHaveAttribute('aria-hidden', 'true')
    expect(mosaico().querySelectorAll('span')).toHaveLength(3)

    act(() => avisar(false))
    expect(mosaico()).toHaveClass('esperando')
    act(() => avisar(true))
    expect(mosaico()).toHaveClass('caiu')
    expect(mosaico()).not.toHaveClass('esperando')
    expect(desligar).toHaveBeenCalled()
  })

  it('com as animações desligadas, os nomes já aparecem no lugar', () => {
    definirAnimacoes('desligadas')
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
    render(<NomesMosaico nomes={NOMES} titulo={<h1>Jogue como</h1>} />)
    expect(mosaico()).not.toHaveClass('esperando')
    expect(mosaico()).not.toHaveClass('caiu')
    expect(mosaico()).toHaveTextContent('Nikola Jokić')
  })
})
