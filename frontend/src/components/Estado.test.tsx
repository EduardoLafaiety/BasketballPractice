import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BarraProgresso from './BarraProgresso'
import { AvisoDesatualizado, Carregando, ErroCarga } from './Estado'

describe('BarraProgresso', () => {
  it('mostra o progresso e trava em 100% quando passa do alvo', () => {
    const { rerender } = render(<BarraProgresso valor={3} alvo={4} rotulo="Treinar 4x" />)
    const barra = screen.getByRole('progressbar', { name: 'Treinar 4x' })
    expect(barra).toHaveAttribute('aria-valuenow', '3')
    expect(barra.firstElementChild).toHaveStyle({ width: '75%' })
    expect(barra).not.toHaveClass('completa')

    rerender(<BarraProgresso valor={9} alvo={4} rotulo="Treinar 4x" />)
    expect(barra).toHaveAttribute('aria-valuenow', '4')
    expect(barra.firstElementChild).toHaveStyle({ width: '100%' })
    expect(barra).toHaveClass('completa')
  })
})

describe('estados de carregamento', () => {
  it('Carregando anuncia o texto para leitores de tela', () => {
    render(<Carregando texto="Carregando metas…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando metas…')
  })

  it('ErroCarga mostra a mensagem e o botão de tentar de novo', async () => {
    const tentar = vi.fn()
    render(<ErroCarga erro={new Error('Servidor fora do ar')} tentarDeNovo={tentar} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Servidor fora do ar')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(tentar).toHaveBeenCalledOnce()
  })

  it('AvisoDesatualizado só aparece quando há erro', () => {
    const { rerender } = render(<AvisoDesatualizado erro={null} tentarDeNovo={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(<AvisoDesatualizado erro={new Error('sem rede')} tentarDeNovo={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar: sem rede')
  })
})
