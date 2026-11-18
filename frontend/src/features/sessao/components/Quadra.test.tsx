import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Quadra, { corAproveitamento, NOME_ZONA } from './Quadra'

describe('Quadra', () => {
  it('desenha as 12 zonas da meia-quadra', () => {
    const { container } = render(<Quadra modo="mapa" dados={{}} />)
    expect(container.querySelectorAll('g.zona')).toHaveLength(12)
    expect(Object.keys(NOME_ZONA)).toHaveLength(12)
  })

  it('no mapa mostra o aproveitamento de cada zona e não é clicável', () => {
    render(<Quadra modo="mapa" dados={{ garrafao: { acertos: 9, tentativas: 12 }, tres_topo: { acertos: 0, tentativas: 0 } }} />)
    expect(screen.getByRole('group', { name: 'Mapa de aproveitamento por zona' })).toBeInTheDocument()
    expect(screen.getByLabelText('Garrafão: 9/12 (75%)')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    // Zona sem tentativas fica sem número e sem cor de calor.
    expect(screen.getByLabelText('Três — topo')).toHaveAttribute('fill', 'var(--superficie-2)')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('no registro escolhe a zona por clique ou teclado', async () => {
    const aoSelecionar = vi.fn()
    render(<Quadra modo="registro" dados={{}} selecionada="lance_livre" aoSelecionar={aoSelecionar} />)

    expect(screen.getAllByRole('button')).toHaveLength(12)
    expect(screen.getByRole('button', { name: 'Lance livre' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Média — canto direito' }))
    expect(aoSelecionar).toHaveBeenLastCalledWith('media_canto_d')

    fireEvent.keyDown(screen.getByRole('button', { name: 'Três — 45° esquerda' }), { key: 'Enter' })
    expect(aoSelecionar).toHaveBeenLastCalledWith('tres_ala_e')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Garrafão' }), { key: 'a' })
    expect(aoSelecionar).toHaveBeenCalledTimes(2)
  })
})

describe('corAproveitamento', () => {
  it('vai do vermelho (até 25%) ao verde (65% ou mais)', () => {
    expect(corAproveitamento(10)).toBe('hsl(0 70% 45%)')
    expect(corAproveitamento(25)).toBe('hsl(0 70% 45%)')
    expect(corAproveitamento(45)).toBe('hsl(60 70% 45%)')
    expect(corAproveitamento(65)).toBe('hsl(120 70% 45%)')
    expect(corAproveitamento(100)).toBe('hsl(120 70% 45%)')
  })
})
