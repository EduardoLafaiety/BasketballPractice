import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const perfil = { nickname: 'marina_23', public: true, inviteCode: 'abc123def456', friends: 1 }
const linha = (position: number, nickname: string, value: number, extra: object = {}) => ({ position, nickname, value, me: false, friend: false, ...extra })
const ranking = {
  metric: 'lances_livres',
  period: 'semana',
  scope: 'todos',
  hasProfile: true,
  entries: [linha(1, 'ana', 80), linha(2, 'bia', 64, { friend: true }), linha(3, 'caio', 50), linha(4, 'duda', 31)],
  me: linha(57, 'marina_23', 4, { me: true }),
  total: 57,
}
const desafio = (extra: object = {}) => ({
  id: 7,
  metric: 'lances_livres',
  weekStart: '2026-11-09',
  weekEnd: '2026-11-15',
  status: 'pendente',
  role: 'desafiado',
  friend: { id: 2, nickname: 'bia' },
  score: null,
  result: null,
  ...extra,
})

function abrir(caminho: string, rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /social/profile': perfil,
    'GET /social/ranking': ranking,
    'GET /social/friends': [{ id: 2, nickname: 'bia' }],
    'GET /social/challenges': [desafio()],
    ...rotas,
  })
  abrirApp(caminho)
  return api
}

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('Ranking', () => {
  it('mostra o pódio, a lista e a sua posição quando você está fora dela', async () => {
    abrir('/ranking')
    const podio = await screen.findByRole('list', { name: 'Pódio' })
    expect(within(podio).getAllByRole('listitem').map((li) => li.querySelector('.podio-apelido')?.textContent)).toEqual(['ana', 'bia', 'caio'])
    const lista = screen.getByRole('list', { name: 'Classificação' })
    expect(within(lista).getByText('duda')).toBeInTheDocument()
    const eu = screen.getByRole('list', { name: 'Sua posição' })
    expect(eu).toHaveTextContent('57º')
    expect(eu).toHaveTextContent('você')
    expect(screen.getByText(/57 atletas pontuaram/)).toBeInTheDocument()
  })

  it('troca de lista, período e escopo pela API', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/ranking')
    await screen.findByRole('list', { name: 'Pódio' })
    await user.click(screen.getByRole('button', { name: 'Quiz' }))
    await user.click(screen.getByRole('button', { name: 'Geral' }))
    await user.click(screen.getByRole('button', { name: 'Amigos' }))
    const params = ultima('GET', '/social/ranking')!.url.searchParams
    expect([params.get('metric'), params.get('period'), params.get('scope')]).toEqual(['quiz', 'geral', 'amigos'])
    expect(screen.getByRole('button', { name: 'Amigos' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sem perfil, explica o que fica público e cria o perfil', async () => {
    const user = userEvent.setup()
    let criado = false
    const { ultima } = abrir('/ranking', {
      'GET /social/profile': () => (criado ? perfil : null),
      'GET /social/ranking': { ...ranking, hasProfile: false, me: null },
      'PUT /social/profile': () => {
        criado = true
        return perfil
      },
    })
    expect(await screen.findByRole('heading', { name: 'Entre no ranking' })).toBeInTheDocument()
    expect(screen.getByText(/aparecem só o apelido e os números/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Desafios entre amigos' })).toBeNull()

    await user.type(screen.getByLabelText('Apelido'), 'marina_23')
    await user.click(screen.getByLabelText(/Aparecer no ranking aberto/))
    await user.click(screen.getByRole('button', { name: 'Criar perfil' }))
    expect(ultima('PUT', '/social/profile')?.corpo).toEqual({ nickname: 'marina_23', public: false })
    expect(await screen.findByRole('heading', { name: 'Desafios entre amigos' })).toBeInTheDocument()
    expect(screen.getByText(/convite\/abc123def456$/)).toBeInTheDocument()
  })

  it('aceita um desafio e mostra o placar; cria um desafio novo', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/ranking', {
      'POST /social/challenges/7/accept': desafio({ status: 'aceito', score: { me: 12, friend: 20 } }),
      'POST /social/challenges': (corpo: unknown) => new Resposta(201, desafio({ id: 8, role: 'desafiante', metric: (corpo as { metric: string }).metric })),
    })
    const item = (await screen.findByText(/bia desafiou você/)).closest('li')!
    await user.click(within(item).getByRole('button', { name: 'Aceitar' }))
    expect(ultima('POST', '/social/challenges/7/accept')).toBeDefined()

    await user.selectOptions(screen.getByLabelText('Desafio'), 'Quem treina mais minutos')
    await user.click(screen.getByRole('button', { name: /Desafiar/ }))
    expect(ultima('POST', '/social/challenges')?.corpo).toEqual({ opponentId: 2, metric: 'minutos' })
  })

  it('placar de desafio valendo aparece com os dois números', async () => {
    abrir('/ranking', { 'GET /social/challenges': [desafio({ status: 'encerrado', score: { me: 20, friend: 12 }, result: 'vitoria' })] })
    expect(await screen.findByLabelText('Placar: você 20, bia 12 cestas')).toBeInTheDocument()
    expect(screen.getByText(/Encerrado · você venceu/)).toBeInTheDocument()
  })

  it('sair do ranking apaga o perfil', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/ranking', { 'DELETE /social/profile': new Resposta(204) })
    await user.click(await screen.findByRole('button', { name: 'Sair do ranking' }))
    expect(ultima('DELETE', '/social/profile')).toBeDefined()
  })
})

describe('Convite', () => {
  it('quem tem perfil aceita o convite e vai para o ranking de amigos', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/convite/xyz987654321', {
      'GET /social/invites/xyz987654321': { nickname: 'leo', self: false, alreadyFriends: false },
      'POST /social/friends': new Resposta(201, { id: 9, nickname: 'leo' }),
    })
    expect(await screen.findByRole('heading', { name: 'leo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aceitar e virar amigo' }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/ranking'))
    expect(ultima('POST', '/social/friends')?.corpo).toEqual({ code: 'xyz987654321' })
  })

  it('sem perfil, pede o apelido antes de aceitar; convite inválido explica', async () => {
    abrir('/convite/abc', {
      'GET /social/profile': null,
      'GET /social/invites/abc': new Resposta(404, { error: 'Convite não encontrado' }),
    })
    expect(await screen.findByText('Este convite não existe mais. Peça um link novo.')).toBeInTheDocument()
  })

  it('sem perfil, mostra o formulário de perfil junto do convite', async () => {
    abrir('/convite/xyz987654321', {
      'GET /social/profile': null,
      'GET /social/invites/xyz987654321': { nickname: 'leo', self: false, alreadyFriends: false },
    })
    expect(await screen.findByText('Para aceitar, crie antes o seu perfil do ranking:')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entre no ranking' })).toBeInTheDocument()
  })
})
