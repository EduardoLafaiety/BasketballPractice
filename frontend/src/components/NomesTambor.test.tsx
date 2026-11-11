import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { definirAnimacoes } from '../lib/movimento'
import type { EstiloResumo } from '../types'
import { NomesTambor } from './NomesTambor'

const estilo = (id: string, nome: string, posicao: EstiloResumo['posicao']): EstiloResumo => ({
  id,
  nome,
  posicao,
  arquetipo: `Arquétipo de ${nome}`,
  totalMovimentos: 3,
  minutos: 20,
  divisao: [],
})
const ESTILOS = [estilo('stephen-curry', 'Stephen Curry', 'Armador'), estilo('lebron-james', 'LeBron James', 'Ala'), estilo('nikola-jokic', 'Nikola Jokić', 'Pivô')]

function itens() {
  return [...document.querySelectorAll('.tb-item')] as HTMLElement[]
}

describe('NomesTambor', () => {
  afterEach(() => localStorage.clear())

  it('põe um nome por jogador no tambor, decorativo, com a posição e o arquétipo do da frente', () => {
    render(<NomesTambor estilos={ESTILOS} titulo={<h1>Jogue como</h1>} />)

    expect(screen.getByRole('heading', { name: 'Jogue como' })).toBeInTheDocument()
    expect(document.querySelector('.nomes-tambor')).toHaveAttribute('aria-hidden', 'true')
    expect(itens()).toHaveLength(3)
    // Cada nome tem a camada em preto e branco e a camada colorida que desliza para dentro.
    expect(itens()[1].querySelectorAll('.tb-nome')).toHaveLength(2)
    expect(itens()[0]).toHaveClass('ativo')
    expect(document.querySelector('.tb-info')).toHaveTextContent('Armador · Arquétipo de Stephen Curry')
  })

  it('clicar num nome traz o nome para a frente', () => {
    render(<NomesTambor estilos={ESTILOS} titulo={<h1>Jogue como</h1>} />)

    fireEvent.click(itens()[2])
    expect(itens()[2]).toHaveClass('ativo')
    expect(itens()[0]).not.toHaveClass('ativo')
    expect(document.querySelector('.tb-info')).toHaveTextContent('Pivô · Arquétipo de Nikola Jokić')

    fireEvent.click(itens()[1])
    expect(itens()[1]).toHaveClass('ativo')
  })

  it('jogador sem foto usa o nome em cor sólida', () => {
    render(<NomesTambor estilos={[estilo('sem-foto-nenhuma', 'Fulano', 'Ala'), ...ESTILOS]} titulo={<h1>x</h1>} />)
    expect(itens()[0]).toHaveClass('sem-foto')
    expect(itens()[1]).not.toHaveClass('sem-foto')
  })

  it('com as animações desligadas, mostra os nomes em lista, sem tambor', () => {
    definirAnimacoes('desligadas')
    render(<NomesTambor estilos={ESTILOS} titulo={<h1>Jogue como</h1>} />)
    expect(document.querySelector('.nomes-tambor')).toBeNull()
    expect(document.querySelector('.nomes-tambor-lista')).toHaveTextContent('Nikola Jokić')
  })
})
