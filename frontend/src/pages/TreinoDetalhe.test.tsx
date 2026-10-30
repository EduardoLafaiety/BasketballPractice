import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

const exercicio = (id: number, name: string, metric: string, custom = false) => ({
  id,
  name,
  category: metric === 'acertos' ? 'arremesso' : 'condicionamento',
  metric,
  description: null,
  custom,
})
const catalogo = [
  exercicio(1, 'Lance livre', 'acertos'),
  exercicio(2, 'Saltos na caixa', 'repeticoes'),
  exercicio(3, 'Prancha', 'tempo'),
  exercicio(4, 'Meu floater', 'acertos', true),
]
const sessaoSalva = { id: 1, performedAt: '2026-10-28T12:00:00.000Z', durationMinutes: 1, rating: 3, notes: null, entries: [] }

function abrirTreino(id: number, rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': catalogo,
    'POST /sessions': sessaoSalva,
    ...rotas,
  })
  abrirApp(`/treinos/${id}`)
  return api
}

const salvar = () => screen.getByRole('button', { name: 'Salvar sessão' })

describe('Registrar sessão de um exercício', () => {
  it('usa os números do contador ao vivo quando os campos ficam vazios', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirTreino(1)
    await screen.findByRole('heading', { name: 'Lance livre' })

    for (const botao of [/acertou/i, /acertou/i, /errou/i, /acertou/i]) await user.click(screen.getByRole('button', { name: botao }))
    await user.type(screen.getByLabelText('Duração (min)'), '15')
    await user.type(screen.getByLabelText('Notas'), '  boa mecânica ')
    await user.click(salvar())

    expect(await screen.findByTestId('caminho')).toHaveTextContent('/desempenho')
    expect(ultima('POST', '/sessions')?.corpo).toMatchObject({
      durationMinutes: 15,
      notes: 'boa mecânica',
      entries: [{ exerciseId: 1, makes: 3, attempts: 4, bestStreak: 2 }],
    })
  })

  it('números digitados valem mais que o contador e não levam a sequência dele', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirTreino(1)
    await screen.findByRole('heading', { name: 'Lance livre' })
    await user.click(screen.getByRole('button', { name: /acertou/i }))

    await user.type(screen.getByLabelText('Acertos'), '30')
    await user.type(screen.getByLabelText('Tentativas'), '50')
    await user.type(screen.getByLabelText('Duração (min)'), '20')
    await user.click(salvar())

    await screen.findByText('/desempenho')
    expect(ultima('POST', '/sessions')?.corpo).toMatchObject({ entries: [{ makes: 30, attempts: 50, bestStreak: null }] })
  })

  it('não deixa salvar com mais acertos que tentativas nem sem duração', async () => {
    const user = userEvent.setup()
    const { chamadas } = abrirTreino(1)
    await screen.findByRole('heading', { name: 'Lance livre' })

    expect(salvar()).toBeDisabled()
    await user.type(screen.getByLabelText('Duração (min)'), '10')
    expect(salvar()).toBeEnabled()

    await user.type(screen.getByLabelText('Acertos'), '8')
    await user.type(screen.getByLabelText('Tentativas'), '5')
    expect(screen.getByText('Acertos não podem passar das tentativas.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
  })

  it('usa o cronômetro como duração e como tempo do exercício', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { ultima } = abrirTreino(3)
    await screen.findByRole('heading', { name: 'Prancha' })

    await user.click(screen.getByRole('button', { name: 'Iniciar' }))
    await act(() => vi.advanceTimersByTimeAsync(95_000))
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByText('01:35')).toBeInTheDocument()
    expect(screen.getByLabelText('Duração (min)')).toHaveAttribute('placeholder', '2 (cronômetro)')

    await user.click(salvar())
    await screen.findByText('/desempenho')
    expect(ultima('POST', '/sessions')?.corpo).toMatchObject({ durationMinutes: 2, entries: [{ exerciseId: 3, seconds: 95 }] })
  })

  it('grava as repetições digitadas', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirTreino(2)
    await screen.findByRole('heading', { name: 'Saltos na caixa' })
    await user.type(screen.getByLabelText('Repetições'), '40')
    await user.type(screen.getByLabelText('Duração (min)'), '10')
    await user.click(salvar())

    await screen.findByText('/desempenho')
    expect(ultima('POST', '/sessions')?.corpo).toMatchObject({ entries: [{ exerciseId: 2, reps: 40, makes: null, attempts: null }] })
  })

  it('mostra o erro e deixa tentar de novo quando o servidor falha', async () => {
    const user = userEvent.setup()
    abrirTreino(2, { 'POST /sessions': new Resposta(400, { error: 'Dados inválidos' }) })
    await screen.findByRole('heading', { name: 'Saltos na caixa' })
    await user.type(screen.getByLabelText('Duração (min)'), '10')
    await user.click(salvar())

    expect(await screen.findByRole('alert')).toHaveTextContent('Dados inválidos')
    expect(salvar()).toBeEnabled()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/treinos/2')
  })
})

describe('Exercício', () => {
  it('avisa quando o exercício não existe', async () => {
    abrirTreino(999)
    expect(await screen.findByText(/Treino não encontrado/)).toBeInTheDocument()
  })

  it('mostra a demonstração passo a passo dos exercícios do catálogo', async () => {
    const user = userEvent.setup()
    abrirTreino(2)
    await screen.findByRole('heading', { name: 'Saltos na caixa' })
    const demo = screen.getByRole('region', { name: 'Demonstração: Saltos na caixa' })
    const passos = within(demo).getAllByRole('listitem')
    expect(passos.map((p) => p.querySelector('strong')?.textContent)).toEqual([
      'Carregue.',
      'Salto explosivo.',
      'Aterrisse macio.',
      'Desça com controle.',
    ])

    await user.click(within(passos[2]).getByRole('button'))
    expect(passos[2]).toHaveAttribute('aria-current', 'step')
    expect(within(demo).getByRole('button', { name: /Animar/ })).toBeInTheDocument()

    await user.click(within(demo).getByRole('button', { name: 'Passo anterior' }))
    expect(passos[1]).toHaveAttribute('aria-current', 'step')
  })

  it('exercício criado pelo atleta não tem demonstração', async () => {
    abrirTreino(4)
    await screen.findByRole('heading', { name: 'Meu floater' })
    expect(screen.queryByRole('heading', { name: 'Como fazer' })).toBeNull()
    expect(screen.queryByRole('region', { name: /Demonstração/ })).toBeNull()
  })

  it('só deixa editar e excluir exercícios criados pelo atleta', async () => {
    abrirTreino(1)
    await screen.findByRole('heading', { name: 'Lance livre' })
    expect(screen.queryByRole('button', { name: 'Editar exercício' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
  })

  it('exclui o próprio exercício depois de confirmar e mostra o erro se ele estiver em uso', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {})
    let emUso = true
    const { chamadas } = abrirTreino(4, {
      'DELETE /exercises/4': () => (emUso ? new Resposta(409, { error: 'Exercício está em uso por treinos ou registros' }) : new Resposta(204)),
    })
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)

    confirmar.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    await vi.waitFor(() => expect(alerta).toHaveBeenCalledWith('Exercício está em uso por treinos ou registros'))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/treinos/4')

    emUso = false
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('/treinos')).toBeInTheDocument()
  })
})
