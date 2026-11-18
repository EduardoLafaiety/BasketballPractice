import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { api, ApiError, definirToken } from '../../../shared/api/backend'
import { enfileirar, pendentes } from '../model/treino-local'
import type { NovaSessao } from '../../../shared/types'
import SessoesPendentes from './SessoesPendentes'

vi.mock('../../autenticacao/model/auth', () => ({ useAuth: () => ({ usuario: { id: 1 } }) }))

it('avisa sobre dados desconhecidos sem enviá-los e permite descarte explícito isolado', async () => {
  definirToken('tk')
  localStorage.setItem('bp.treino.v1.1.rascunho', '{incompleto')
  enfileirar('2', { clientId: 'outra', data: '2026-11-18T12:00:00Z', duracaoMin: 1, entradas: [] })
  const enviar = vi.spyOn(api, 'registrarSessao')
  const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const user = userEvent.setup()
  render(<MemoryRouter><SessoesPendentes /></MemoryRouter>)
  expect(screen.getByRole('alert')).toHaveTextContent('precisam de revisão')
  expect(screen.getByRole('button', { name: 'Exportar dados para recuperação' })).toBeInTheDocument()
  expect(enviar).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Descartar registros inválidos' }))
  expect(localStorage.getItem('bp.treino.v1.1.rascunho')).toBe('{incompleto')
  confirmar.mockReturnValue(true)
  await user.click(screen.getByRole('button', { name: 'Descartar registros inválidos' }))
  expect(localStorage.getItem('bp.treino.v1.1.rascunho')).toBeNull()
  expect(pendentes('2')).toHaveLength(1)
})

it('associa cada erro à sessão e permite repetir uma rejeitada sem reenviar as outras', async () => {
  definirToken('tk')
  const user = userEvent.setup()
  for (const id of ['a', 'b', 'c']) enfileirar('1', {
    clientId: id, data: '2026-11-18T12:00:00Z', duracaoMin: 1, entradas: [], notas: `Treino ${id}`,
    programa: { id: 'programa', dia: 1 },
  })
  const enviar = vi.spyOn(api, 'registrarSessao').mockImplementation(async (s: NovaSessao) => {
    if (s.clientId === 'a') throw new ApiError(409, 'Dia indisponível')
    if (s.clientId === 'b') throw new ApiError(400, 'Notas rejeitadas')
    return { id: 'salva', data: s.data, duracaoMin: s.duracaoMin, entradas: s.entradas, zonas: [] }
  })
  render(<MemoryRouter><SessoesPendentes /></MemoryRouter>)
  await user.click(screen.getByText('Revisar sessões pendentes'))
  await screen.findByText('Dia indisponível')
  const primeira = within(screen.getByText('0 exercícios · Treino a').closest('li')!)
  const segunda = within(screen.getByText('0 exercícios · Treino b').closest('li')!)
  expect(primeira.getByRole('alert')).toHaveTextContent('Dia indisponível')
  expect(segunda.getByRole('alert')).toHaveTextContent('Notas rejeitadas')
  expect(primeira.getByRole('button', { name: 'Salvar treino fora do programa' })).toBeInTheDocument()
  expect(segunda.queryByRole('button', { name: 'Salvar treino fora do programa' })).not.toBeInTheDocument()
  await waitFor(() => expect(pendentes('1')).toHaveLength(2))
  enviar.mockImplementation(async (s) => ({ id: 'salva', data: s.data, duracaoMin: s.duracaoMin, entradas: s.entradas, zonas: [] }))
  await user.click(primeira.getByRole('button', { name: 'Tentar esta sessão novamente' }))
  await waitFor(() => expect(pendentes('1').map((s) => s.clientId)).toEqual(['b']))
  expect(enviar.mock.calls.map(([s]) => s.clientId)).toEqual(['a', 'b', 'c', 'a'])
  expect(screen.getByRole('alert')).toHaveTextContent('Notas rejeitadas')
})
