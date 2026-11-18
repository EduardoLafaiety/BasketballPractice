import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'
import './Evolucao'

it('compara registros e filtra um exercício sem inventar minutos individuais', async () => {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /sessions': [{
    id: 1, performedAt: new Date().toISOString(), durationMinutes: 20, notes: null,
    entries: [{ exerciseId: 1, exerciseName: 'Lance livre', makes: 3, attempts: 4 }],
  }] })
  abrirApp('/evolucao')
  const user = userEvent.setup()
  expect(await screen.findByRole('table')).toBeInTheDocument()
  expect(within(screen.getByRole('row', { name: /Aproveitamento/ })).getByText('75%')).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Minutos/ })).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Exercício'), '1')
  expect(screen.queryByRole('row', { name: /Minutos/ })).toBeNull()
  await user.selectOptions(screen.getByLabelText('Período'), '30')
  expect(screen.getByText(/Atual: últimos 30 dias/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Planejar na rotina' })).toHaveAttribute('href', '/rotina')
})
