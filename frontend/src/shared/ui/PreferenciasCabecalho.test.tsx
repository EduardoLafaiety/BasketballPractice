import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import PreferenciasCabecalho from './PreferenciasCabecalho'

afterEach(() => { delete document.documentElement.dataset.theme })

it('oferece sistema, claro e escuro, aplica e persiste a escolha da conta', async () => {
  const salvar = vi.fn(async () => {})
  render(<PreferenciasCabecalho temaConta="sistema" salvarTema={salvar} />)
  const user = userEvent.setup()
  await user.click(screen.getByLabelText('Escolher tema'))
  expect(screen.getByRole('button', { name: 'Sistema' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Claro' }))
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(salvar).toHaveBeenCalledWith('claro')
  await user.click(screen.getByLabelText('Escolher tema'))
  await user.click(screen.getByRole('button', { name: 'Escuro' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  await user.click(screen.getByLabelText('Escolher tema'))
  await user.click(screen.getByRole('button', { name: 'Sistema' }))
  expect(document.documentElement.dataset.theme).toBeUndefined()
})

it('restaura o tema anterior quando não consegue salvar e permite fechar pelo teclado', async () => {
  render(<PreferenciasCabecalho temaConta="escuro" salvarTema={async () => { throw new Error('offline') }} />)
  const user = userEvent.setup()
  const abrir = screen.getByLabelText('Escolher tema')
  await user.click(abrir)
  await user.click(screen.getByRole('button', { name: 'Claro' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar o tema'))
  expect(document.documentElement.dataset.theme).toBe('dark')
  await user.click(abrir)
  await user.keyboard('{Escape}')
  expect(abrir.parentElement).not.toHaveAttribute('open')
  expect(abrir).toHaveFocus()
})
