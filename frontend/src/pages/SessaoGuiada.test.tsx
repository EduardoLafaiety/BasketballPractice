import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'
import type { BlocoPlano } from '../types'
import type { PlanoGuiado } from './SessaoGuiada'

// Sem Web Audio no jsdom: o som e a vibração viram espiões.
vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))
const { bipe } = await import('../lib/audio')

const bloco = (extra: Partial<BlocoPlano>): BlocoPlano => ({
  drillId: '1',
  nome: 'Lance livre',
  categoria: 'Arremesso',
  metrica: 'acertos',
  minutos: 5,
  ...extra,
})

const planoGerado: PlanoGuiado = {
  titulo: 'Treino gerado',
  workoutId: 7,
  blocos: [
    bloco({}),
    bloco({ drillId: '9', nome: 'Saltos na caixa', categoria: 'Condicionamento', metrica: 'repeticoes', minutos: 3 }),
    bloco({ drillId: '4', nome: 'Suicídio', categoria: 'Condicionamento', metrica: 'tempo', minutos: 2 }),
  ],
}

const sessaoSalva = { id: 99, performedAt: '2026-10-28T12:00:00.000Z', durationMinutes: 1, rating: 3, notes: null, entries: [] }

function abrirSessao(rotas: Parameters<typeof apiFalsa>[0] = {}, rota: Parameters<typeof abrirApp>[0] = { pathname: '/sessao', state: planoGerado }) {
  definirToken('tk')
  const api = apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, ...rotas })
  abrirApp(rota)
  return api
}

const clicar = (user: ReturnType<typeof userEvent.setup>, nome: string | RegExp) => user.click(screen.getByRole('button', { name: nome }))

describe('Sessão guiada', () => {
  it('mostra o plano antes de começar', async () => {
    abrirSessao()
    expect(await screen.findByRole('heading', { name: 'Treino gerado' })).toBeInTheDocument()
    expect(screen.getByText(/3 exercícios · 10 min/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Lance livre'),
      expect.stringContaining('Saltos na caixa'),
      expect.stringContaining('Suicídio'),
    ])
  })

  it('mostra a demonstração junto do cronômetro, sem precisar abrir, e a troca com o exercício', async () => {
    const user = userEvent.setup()
    const exercicio = (id: number, name: string, custom = false) => ({ id, name, category: 'arremesso', metric: 'acertos', description: null, custom })
    abrirSessao({ 'GET /exercises': [exercicio(1, 'Lance livre'), exercicio(9, 'Saltos na caixa'), exercicio(4, 'Suicídio', true)] })
    await user.click(await screen.findByRole('button', { name: 'Começar' }))

    expect(await screen.findByRole('region', { name: 'Demonstração: Lance livre' })).toBeInTheDocument()
    expect(screen.queryByText('Ver como fazer')).toBeNull()
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument()

    await clicar(user, 'Próximo exercício →')
    expect(await screen.findByRole('region', { name: 'Demonstração: Saltos na caixa' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Demonstração: Lance livre' })).toBeNull()

    // Exercício criado pelo atleta não tem demonstração: fica só o cronômetro.
    await clicar(user, 'Próximo exercício →')
    expect(await screen.findByRole('heading', { name: 'Suicídio' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Demonstração/ })).toBeNull()
  })

  it('registra arremessos e repetições de cada bloco e salva a sessão com o diário', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirSessao({ 'POST /sessions': sessaoSalva })
    await user.click(await screen.findByRole('button', { name: 'Começar' }))

    expect(screen.getByText('Exercício 1 de 3')).toBeInTheDocument()
    for (const botao of [/acertou/i, /acertou/i, /acertou/i, /errou/i]) await clicar(user, botao)
    await clicar(user, 'Próximo exercício →')

    expect(screen.getByRole('heading', { name: 'Saltos na caixa' })).toBeInTheDocument()
    await clicar(user, '+5')
    await clicar(user, '+1')
    await clicar(user, '−1')
    await clicar(user, '+1')
    await clicar(user, 'Próximo exercício →')

    // O último bloco é pulado: não entra no registro.
    expect(screen.getByRole('button', { name: 'Concluir treino' })).toBeInTheDocument()
    await clicar(user, 'Pular')

    expect(screen.getByRole('heading', { name: /Treino concluído/ })).toBeInTheDocument()
    const placar = screen.getByText('exercícios feitos').closest('.stat') as HTMLElement
    expect(within(placar).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Notas'), '  Joelho tranquilo  ')
    await clicar(user, 'Salvar sessão')

    expect(await screen.findByTestId('caminho')).toHaveTextContent('/desempenho')
    expect(ultima('POST', '/sessions')?.corpo).toMatchObject({
      workoutId: 7,
      durationMinutes: 1,
      rating: 3,
      fatigue: 3,
      notes: 'Treino gerado — Joelho tranquilo',
      entries: [
        { exerciseId: 1, makes: 3, attempts: 4, reps: null, seconds: null, bestStreak: 3 },
        { exerciseId: 9, makes: null, attempts: null, reps: 6, seconds: null, bestStreak: null },
      ],
      shots: [],
    })
  })

  it('não registra o bloco de arremessos sem nenhum arremesso marcado', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirSessao(
      { 'POST /sessions': sessaoSalva },
      { pathname: '/sessao', state: { titulo: 'Só lances', blocos: [bloco({})] } },
    )
    await user.click(await screen.findByRole('button', { name: 'Começar' }))
    await clicar(user, 'Concluir treino')
    await clicar(user, 'Salvar sessão')

    await screen.findByText('/desempenho')
    expect(ultima('POST', '/sessions')?.corpo).toMatchObject({
      workoutId: null,
      entries: [{ exerciseId: 1, makes: null, attempts: null }],
    })
  })

  it('mantém o treino na tela quando o salvamento falha e deixa tentar de novo', async () => {
    const user = userEvent.setup()
    let falhar = true
    const { chamadas } = abrirSessao({
      'POST /sessions': () => (falhar ? new Resposta(500, { error: 'Banco fora do ar' }) : sessaoSalva),
    })
    await user.click(await screen.findByRole('button', { name: 'Começar' }))
    await clicar(user, /acertou/i)
    await clicar(user, 'Próximo exercício →')
    await clicar(user, 'Pular')
    await clicar(user, 'Pular')
    await clicar(user, 'Salvar sessão')

    expect(await screen.findByRole('alert')).toHaveTextContent('Banco fora do ar')
    expect(screen.getByTestId('caminho')).toHaveTextContent('/sessao')
    expect(screen.getByText('100%')).toBeInTheDocument()

    falhar = false
    await clicar(user, 'Salvar sessão')
    expect(await screen.findByText('/desempenho')).toBeInTheDocument()
    const envios = chamadas.filter((c) => c.metodo === 'POST' && c.caminho === '/sessions')
    expect(envios).toHaveLength(2)
    expect(envios[1].corpo).toEqual(envios[0].corpo)
  })

  it('apita nos 3 últimos segundos, avisa quando o tempo acaba e grava o tempo do bloco', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { ultima } = abrirSessao(
      { 'POST /sessions': sessaoSalva },
      { pathname: '/sessao', state: { titulo: 'Prancha', blocos: [bloco({ drillId: '4', metrica: 'tempo', minutos: 1 })] } },
    )
    await user.click(await screen.findByRole('button', { name: 'Começar' }))

    await act(() => vi.advanceTimersByTimeAsync(56_000))
    expect(bipe).not.toHaveBeenCalledWith(660, 120)
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(bipe).toHaveBeenCalledWith(660, 120)
    expect(screen.queryByRole('status')).toBeNull()

    await act(() => vi.advanceTimersByTimeAsync(3_000))
    expect(bipe).toHaveBeenCalledWith(990, 500, 0.4)
    expect(screen.getByRole('status')).toHaveTextContent('Tempo!')

    // Pausado, o relógio não anda.
    await clicar(user, 'Pausar')
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    await clicar(user, 'Concluir treino')
    await clicar(user, 'Salvar sessão')

    await screen.findByText('/desempenho')
    expect(ultima('POST', '/sessions')?.corpo).toMatchObject({ entries: [{ exerciseId: 4, seconds: 60 }] })
  })

  describe('com ?hoje', () => {
    const quarta = new Date('2026-10-28T10:00:00-03:00')
    const catalogo = [{ id: 1, name: 'Lance livre', category: 'arremesso', metric: 'acertos', description: null, custom: false }]

    it('monta o treino a partir da rotina do dia', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(quarta)
      abrirSessao(
        {
          'GET /exercises': catalogo,
          'GET /workouts': [
            { id: 30, name: 'Rotina de quarta', description: 'bp-rotina:3' },
            { id: 31, name: 'Rotina de quinta', description: 'bp-rotina:4' },
          ],
          'GET /workouts/30': { id: 30, name: 'Rotina de quarta', description: 'bp-rotina:3', exercises: [{ exerciseId: 1 }] },
          'GET /workouts/31': { id: 31, name: 'Rotina de quinta', description: 'bp-rotina:4', exercises: [] },
        },
        '/sessao?hoje',
      )
      expect(await screen.findByRole('heading', { name: 'Treino de quarta' })).toBeInTheDocument()
      expect(screen.getByText(/1 exercícios · 10 min/)).toBeInTheDocument()
    })

    it('avisa quando o dia é de descanso', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(quarta)
      abrirSessao({ 'GET /exercises': catalogo, 'GET /workouts': [] }, '/sessao?hoje')
      expect(await screen.findByText(/Nenhum treino na rotina de hoje/)).toBeInTheDocument()
    })
  })
})
