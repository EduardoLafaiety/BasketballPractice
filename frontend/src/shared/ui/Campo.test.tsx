import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import Campo from './Campo'
import Botao from './Botao'

it('associa rótulo, ajuda e erro mantendo uma descrição já existente', () => {
  render(<><span id="origem">Orientação anterior</span><Campo rotulo="Nome" ajuda="Use um nome descritivo" erro="Nome curto"><input aria-describedby="origem" /></Campo></>)
  const input = screen.getByRole('textbox', { name: 'Nome' })
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription('Orientação anterior Use um nome descritivo Nome curto')
})

it('botão ocupado impede outra ativação e mantém o tipo seguro fora de envio', () => {
  render(<form><Botao ocupado>Salvando</Botao></form>)
  expect(screen.getByRole('button')).toBeDisabled()
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
})
