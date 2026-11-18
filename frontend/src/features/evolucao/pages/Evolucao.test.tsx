import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp } from '../../../test/renderizar'
import './Evolucao'

it('compara registros e filtra um exercício sem inventar minutos individuais', async () => {
  definirToken('tk')
  const resumo = { frequencia: 1, diasAtivos: 1, minutos: 20, acertos: 3, tentativas: 4, repeticoes: 0, segundos: 0, aproveitamento: 75 }
  const { chamadas } = apiFalsa({ 'GET /sessions': [], 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa,
    'GET /sessions/comparison': { atual: resumo, anterior: { ...resumo, frequencia: 0, aproveitamento: null }, exercicios: [{ id: '1', nome: 'Lance livre' }] },
  })
  abrirApp('/evolucao')
  const user = userEvent.setup()
  expect(await screen.findByRole('table')).toBeInTheDocument()
  expect(within(screen.getByRole('row', { name: /Aproveitamento/ })).getByText('75%')).toBeInTheDocument()
  expect(screen.getByRole('row', { name: /Minutos/ })).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Exercício'), await screen.findByRole('option', { name: 'Lance livre' }))
  await screen.findByRole('table')
  expect(screen.queryByRole('row', { name: /Minutos/ })).toBeNull()
  await user.selectOptions(screen.getByLabelText('Período'), '30')
  expect(screen.getByText(/Atual: últimos 30 dias/)).toBeInTheDocument()
  expect(await screen.findByRole('link', { name: 'Planejar na rotina' })).toHaveAttribute('href', '/rotina')
  expect(chamadas.filter((c) => c.caminho === '/sessions').every((c) => c.url.searchParams.get('limit') === '21')).toBe(true)
})
