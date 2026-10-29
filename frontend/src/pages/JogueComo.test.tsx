import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

const lista = [
  { id: 'luka-doncic', name: 'Luka Dončić', group: 'guard', archetype: 'Maestro do pick-and-roll', moveCount: 2, minutes: 34, mix: { arremesso: 53, passe: 47 } },
  { id: 'nikola-jokic', name: 'Nikola Jokić', group: 'center', archetype: 'Pivô que joga de armador', moveCount: 1, minutes: 20, mix: { passe: 100 } },
]

const exercicio = (exerciseId: number, name: string, category: string, metric: string) => ({ exerciseId, name, category, metric })

const luka = {
  ...lista[0],
  heightCm: 198,
  pace: 'Lento e controlado',
  summary: 'Joga no próprio ritmo.',
  mindset: 'Quem dita a velocidade é você.',
  moves: [
    { name: 'Leitura do corta-luz', description: 'Usa o bloqueio.', tip: 'Uma cadeira faz o papel do pivô.', dose: '3 × 8', minutes: 12, exercise: exercicio(15, 'Corta-luz com cadeira', 'passe', 'repeticoes') },
    { name: 'Step-back de três', description: 'Recua e arremessa.', tip: 'O espaço vem do empurrão.', dose: '5 por posição', minutes: 12, exercise: exercicio(16, 'Step-back de três', 'arremesso', 'acertos') },
  ],
  session: [
    { ...exercicio(15, 'Corta-luz com cadeira', 'passe', 'repeticoes'), minutes: 12, dose: '3 × 8' },
    { ...exercicio(16, 'Step-back de três', 'arremesso', 'acertos'), minutes: 12, dose: '5 por posição' },
    { ...exercicio(1, 'Lance livre', 'arremesso', 'acertos'), minutes: 10, dose: '20 arremessos' },
  ],
}

function abrir(caminho: string) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': [],
    'GET /workouts': [],
    'GET /styles': lista,
    'GET /styles/luka-doncic': luka,
    'GET /styles/:id': new Resposta(404, { error: 'Estilo não encontrado' }),
  })
  abrirApp(caminho)
  return api
}

describe('Jogue como', () => {
  it('lista os jogadores com foto e filtra por posição', async () => {
    abrir('/jogue-como')
    const cartao = (await screen.findByRole('heading', { name: 'Luka Dončić' })).closest('a') as HTMLElement
    expect(cartao).toHaveAttribute('href', '/jogue-como/luka-doncic')
    expect(within(cartao).getByRole('img', { name: /Luka Dončić em quadra/ })).toBeInTheDocument()
    expect(within(cartao).getByText('Armador')).toBeInTheDocument()
    expect(within(cartao).getByText(/2 movimentos · 34 min/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Pivôs' }))
    expect(screen.queryByRole('heading', { name: 'Luka Dončić' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nikola Jokić' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pivôs' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('o perfil mostra os movimentos, a divisão do treino e o crédito da foto', async () => {
    abrir('/jogue-como/luka-doncic')
    expect(await screen.findByRole('heading', { name: 'Luka Dončić', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('1,98 m')).toBeInTheDocument()
    expect(screen.getByText('53%')).toBeInTheDocument()
    expect(screen.getByText(/Foto: Erik Drost/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', expect.stringContaining('commons.wikimedia.org'))

    const movimento = screen.getByRole('heading', { name: 'Leitura do corta-luz' }).closest('article') as HTMLElement
    expect(within(movimento).getByText('Uma cadeira faz o papel do pivô.')).toBeInTheDocument()
    expect(within(movimento).getByRole('link', { name: /Corta-luz com cadeira/ })).toHaveAttribute('href', '/treinos/15')
  })

  it('"Começar este treino" abre a sessão guiada com os exercícios do estilo', async () => {
    abrir('/jogue-como/luka-doncic')
    await userEvent.click(await screen.findByRole('button', { name: 'Começar este treino' }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/sessao'))
    expect(screen.getByRole('heading', { name: 'Jogue como Luka Dončić' })).toBeInTheDocument()
    expect(screen.getByText(/3 exercícios · 34 min/)).toBeInTheDocument()
  })

  it('jogador inexistente mostra o aviso e o caminho de volta', async () => {
    abrir('/jogue-como/michael-jordan')
    expect(await screen.findByText(/Jogador não encontrado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todos os jogadores' })).toHaveAttribute('href', '/jogue-como')
  })

  it('aparece no menu principal', async () => {
    abrir('/')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Jogue como' })).toHaveAttribute('href', '/jogue-como')
  })
})
