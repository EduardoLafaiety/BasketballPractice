import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const jogoApi = (extra: object = {}) => ({
  id: 1,
  playedOn: '2026-11-08',
  opponent: 'Vila Nova',
  teamScore: 68,
  oppScore: 61,
  minutes: 28,
  points: 17,
  rebounds: 6,
  assists: 4,
  steals: 1,
  blocks: 0,
  turnovers: 2,
  fgMade: 6,
  fgAtt: 14,
  threeMade: 2,
  threeAtt: 6,
  ftMade: 3,
  ftAtt: 4,
  notes: null,
  ...extra,
})

const tiro = (game: number | null, practice: number | null) => ({ game, practice, gameAttempts: 10, practiceAttempts: 50 })
const comparacao = {
  games: 2,
  averages: { points: 12.5, rebounds: 4, assists: 5 },
  shooting: { overall: tiro(37.5, 56), three: tiro(25, 40), freeThrow: tiro(83.3, 80) },
}

function abrir(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /games': [jogoApi()],
    'GET /games/comparison': comparacao,
    ...rotas,
  })
  abrirApp('/jogos')
  return api
}

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('Diário de jogos', () => {
  it('lista os jogos com o resultado e compara o aproveitamento do treino e do jogo', async () => {
    abrir()
    const jogo = (await screen.findByText(/contra Vila Nova/)).closest('li')!
    expect(within(jogo).getByText('Vitória 68 a 61')).toBeInTheDocument()
    expect(within(jogo).getByText(/Arremessos 6\/14 \(43%\) · de três 2\/6 \(33%\) · lances livres 3\/4 \(75%\)/)).toBeInTheDocument()

    const tabela = await screen.findByRole('table')
    const linhas = within(tabela).getAllByRole('row')
    expect(within(linhas[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['56%', '37,5%', '−19 pontos'])
    expect(within(linhas[3]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['80%', '83,3%', '+3 pontos'])
    expect(screen.getByText(/2 jogos, com média de 12,5 pontos, 4 rebotes e 5 assistências/)).toBeInTheDocument()
  })

  it('registra um jogo somando os pontos pelos arremessos', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir({
      'GET /games': [],
      'GET /games/comparison': { ...comparacao, games: 0 },
      'POST /games': (corpo: unknown) => new Resposta(201, jogoApi(corpo as object)),
    })
    expect(await screen.findByText(/Nenhum jogo anotado ainda/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()

    await user.click(screen.getByRole('button', { name: '+ Registrar jogo' }))
    await user.type(screen.getByLabelText('Adversário'), 'Centro')
    await user.type(screen.getByLabelText('Cestas de quadra'), '5')
    await user.type(screen.getByLabelText('Tentativas de quadra'), '11')
    await user.type(screen.getByLabelText('Cestas de três'), '1')
    await user.type(screen.getByLabelText('Tentativas de três'), '4')
    await user.type(screen.getByLabelText('Lances livres certos'), '2')
    await user.type(screen.getByLabelText('Lances livres tentados'), '2')
    expect(screen.getByText('Pontos:').parentElement).toHaveTextContent('Pontos: 13')
    await user.clear(screen.getByLabelText('Rebotes'))
    await user.type(screen.getByLabelText('Rebotes'), '7')
    await user.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    expect(ultima('POST', '/games')?.corpo).toMatchObject({ opponent: 'Centro', points: 13, fgMade: 5, fgAtt: 11, threeMade: 1, threeAtt: 4, ftMade: 2, ftAtt: 2, rebounds: 7 })
    expect(screen.queryByRole('button', { name: 'Salvar jogo' })).toBeNull()
  })

  it('mostra o erro do servidor e permite editar e apagar', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir({
      'PUT /games/1': new Resposta(400, { error: 'Dados inválidos' }),
      'DELETE /games/1': new Resposta(204),
    })
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    expect(screen.getByLabelText('Adversário')).toHaveValue('Vila Nova')
    await user.click(screen.getByRole('button', { name: 'Salvar jogo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Dados inválidos')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('button', { name: 'Apagar' }))
    expect(ultima('DELETE', '/games/1')).toBeDefined()
  })
})
