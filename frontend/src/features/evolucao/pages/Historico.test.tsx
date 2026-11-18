import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { apiFalsa } from '../../../test/api-falsa'
import Historico from './Historico'

it('pagina vinte sessões por vez, usa um registro sentinela e permite voltar', async () => {
  const sessoes = Array.from({ length: 22 }, (_, i) => ({ id: i + 1, performedAt: '2026-11-01T12:00:00Z',
    durationMinutes: 10, workoutName: `Treino ${i + 1}`, entries: [], notes: null, rating: null }))
  const { chamadas } = apiFalsa({ 'GET /sessions': (_, url) => sessoes.slice(Number(url.searchParams.get('offset')), Number(url.searchParams.get('offset')) + 21) })
  render(<Historico />)
  const user = userEvent.setup()
  expect(await screen.findByText(/Treino 20 ·/)).toBeInTheDocument()
  expect(screen.queryByText(/Treino 21 ·/)).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(await screen.findByText(/Treino 21 ·/)).toBeInTheDocument()
  expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled())
  await user.click(screen.getByRole('button', { name: 'Anterior' }))
  expect(await screen.findByText(/Treino 1 ·/)).toBeInTheDocument()
  expect(chamadas.every((c) => c.url.searchParams.get('limit') === '21')).toBe(true)
  expect(chamadas.some((c) => c.url.searchParams.get('offset') === '20')).toBe(true)
})
