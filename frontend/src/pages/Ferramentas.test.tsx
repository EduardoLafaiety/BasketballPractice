import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

// Sem Web Audio no jsdom: o som vira espião e o metrônomo, um dublê que guarda quem bate o ritmo.
const metronomo = { iniciar: vi.fn(), parar: vi.fn(), definir: vi.fn() }
let bater: (batida: number) => void = () => {}
vi.mock('../lib/audio', () => ({
  bipe: vi.fn(),
  vibrar: vi.fn(),
  criarMetronomo: (aoBater: (batida: number) => void) => ((bater = aoBater), metronomo),
}))

const catalogo = [
  { id: 1, name: 'Arremesso de média', category: 'arremesso', metric: 'acertos', description: null, custom: false },
  { id: 2, name: 'Crossover', category: 'drible', metric: 'repeticoes', description: null, custom: false },
  { id: 3, name: 'Lance livre', category: 'arremesso', metric: 'acertos', description: null, custom: false },
]

const sessaoSalva = { id: 99, performedAt: '2026-10-28T13:00:00.000Z', durationMinutes: 1, rating: null, notes: null, entries: [] }

function abrirFerramentas(aba: string | null, rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': catalogo,
    'POST /sessions': sessaoSalva,
    // Destino depois de salvar: o Desempenho, sem nada para mostrar.
    'GET /sessions': [],
    ...rotas,
  })
  abrirApp(aba ? `/ferramentas?aba=${aba}` : '/ferramentas')
  return api
}

const aba = (nome: RegExp) => screen.getByRole('tab', { name: nome })
const bpm = () => document.querySelector('.timer-relogio')?.textContent
const clicar = (user: ReturnType<typeof userEvent.setup>, nome: string | RegExp) => user.click(screen.getByRole('button', { name: nome }))

describe('Ferramentas: vídeo do arremesso', () => {
  it('avisa que ainda não está disponível e não oferece câmera nem envio de vídeo', async () => {
    abrirFerramentas('video')

    const titulo = await screen.findByRole('heading', { name: 'Ainda não disponível' })
    expect(titulo.closest('[role="status"]')).toHaveTextContent('ainda não pode ser usado')
    expect(screen.queryByRole('button', { name: /Abrir câmera/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Escolher vídeo/i })).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})

describe('Ferramentas: abas', () => {
  it('abre no timer e troca de ferramenta pelas abas', async () => {
    const user = userEvent.setup()
    abrirFerramentas(null)

    expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
    expect(aba(/Timer de intervalos/)).toHaveAttribute('aria-selected', 'true')

    await user.click(aba(/Calculadoras/))
    expect(aba(/Calculadoras/)).toHaveAttribute('aria-selected', 'true')
    expect(aba(/Timer de intervalos/)).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('heading', { name: 'Aproveitamento' })).toBeInTheDocument()
    expect(screen.getByText(/FG%, eFG%, TS%/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar' })).toBeNull()
  })

  it('abre direto na aba do endereço, e uma aba desconhecida cai no timer', async () => {
    abrirFerramentas('metronomo')
    expect(await screen.findByRole('button', { name: 'Tocar' })).toBeInTheDocument()
    expect(aba(/Metrônomo/)).toHaveAttribute('aria-selected', 'true')
  })

  it('cada aba resume a ferramenta, e só as que não têm painel próprio ficam num cartão', async () => {
    const user = userEvent.setup()
    abrirFerramentas(null)
    await screen.findByRole('button', { name: 'Iniciar' })
    expect(aba(/Vídeo do arremesso/)).toHaveTextContent('Em breve')
    expect(screen.getByRole('tabpanel')).not.toHaveClass('card')

    await user.click(aba(/Contador de arremessos/))
    expect(screen.getByRole('tabpanel')).toHaveClass('card')
    await user.click(aba(/Metrônomo/))
    expect(screen.getByRole('tabpanel')).not.toHaveClass('card')
    await user.click(aba(/Vídeo do arremesso/))
    expect(screen.getByRole('tabpanel')).toHaveClass('card')
    await user.click(aba(/Calculadoras/))
    expect(screen.getByRole('tabpanel')).not.toHaveClass('card')
  })

  it('aba desconhecida mostra o timer', async () => {
    abrirFerramentas('nada')
    expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
    expect(aba(/Timer de intervalos/)).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Metrônomo de drible', () => {
  it('começa no ritmo salvo nas configurações e toca, acende as luzes e para', async () => {
    const user = userEvent.setup()
    abrirFerramentas('metronomo', { 'GET /settings': { ...configFalsa, metronomeBpm: 120 } })

    await waitFor(() => expect(bpm()).toBe('120'))
    expect(screen.getByText(/batidas por minuto/)).toHaveTextContent('2 dribles por segundo')
    expect(metronomo.definir).toHaveBeenLastCalledWith(120, 4)

    await clicar(user, 'Tocar')
    expect(metronomo.iniciar).toHaveBeenCalledTimes(1)
    const luzes = () => [...document.querySelectorAll('.metronomo-luzes span')].map((l) => l.className)
    expect(luzes()).toEqual(['', '', '', ''])
    act(() => bater(4))
    expect(luzes()).toEqual(['acento', '', '', ''])
    act(() => bater(6))
    expect(luzes()).toEqual(['', '', 'ativa', ''])

    await user.selectOptions(screen.getByRole('combobox'), '3 batidas')
    expect(metronomo.definir).toHaveBeenLastCalledWith(120, 3)
    act(() => bater(7))
    expect(luzes()).toEqual(['', 'ativa', ''])

    await clicar(user, 'Parar')
    expect(metronomo.parar).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Tocar' })).toBeInTheDocument()
    expect(luzes()).toEqual(['', '', ''])
  })

  it('ajusta de 5 em 5 sem sair da faixa de 30 a 240 bpm', async () => {
    const user = userEvent.setup()
    abrirFerramentas('metronomo')
    await waitFor(() => expect(bpm()).toBe('90'))

    await clicar(user, '+5')
    expect(bpm()).toBe('95')
    expect(metronomo.definir).toHaveBeenLastCalledWith(95, 4)

    fireEvent.change(screen.getByRole('slider', { name: 'Batidas por minuto' }), { target: { value: '33' } })
    await clicar(user, '−5')
    expect(bpm()).toBe('30')
    await clicar(user, '−5')
    expect(bpm()).toBe('30')

    fireEvent.change(screen.getByRole('slider', { name: 'Batidas por minuto' }), { target: { value: '238' } })
    await clicar(user, '+5')
    expect(bpm()).toBe('240')
  })

  it('tap tempo usa a média dos intervalos entre os toques', async () => {
    const user = userEvent.setup()
    abrirFerramentas('metronomo')
    await waitFor(() => expect(bpm()).toBe('90'))
    const agora = vi.spyOn(performance, 'now')

    for (const ms of [10_000, 10_400, 10_900, 11_500]) {
      agora.mockReturnValue(ms)
      await clicar(user, 'Tap tempo')
    }
    // Intervalos de 400, 500 e 600 ms: média 500 ms = 120 bpm.
    expect(bpm()).toBe('120')

    // Um toque 3 s depois recomeça a conta (sobra um toque só, e o ritmo fica).
    agora.mockReturnValue(15_000)
    await clicar(user, 'Tap tempo')
    expect(bpm()).toBe('120')
    // Toques rápidos demais (200 ms = 300 bpm) param no máximo de 240.
    agora.mockReturnValue(15_200)
    await clicar(user, 'Tap tempo')
    expect(bpm()).toBe('240')
  })

  it('salva o ritmo como padrão nas configurações', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirFerramentas('metronomo', { 'PUT /settings': (corpo) => corpo })
    await waitFor(() => expect(bpm()).toBe('90'))
    expect(screen.getByRole('button', { name: 'Salvar 90 como padrão' })).toBeDisabled()

    await clicar(user, '+5')
    await clicar(user, 'Salvar 95 como padrão')

    await waitFor(() => expect(ultima('PUT', '/settings')).toBeDefined())
    expect(ultima('PUT', '/settings')?.corpo).toEqual({ ...configFalsa, metronomeBpm: 95 })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar 95 como padrão' })).toBeDisabled())
  })

  it('avisa quando o servidor recusa o novo padrão', async () => {
    const user = userEvent.setup()
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {})
    abrirFerramentas('metronomo', { 'PUT /settings': new Resposta(400, { error: 'Ritmo inválido' }) })
    await waitFor(() => expect(bpm()).toBe('90'))

    await clicar(user, '+5')
    await clicar(user, 'Salvar 95 como padrão')
    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Ritmo inválido'))
    expect(screen.getByRole('button', { name: 'Salvar 95 como padrão' })).toBeEnabled()
  })
})

describe('Contador de arremessos', () => {
  it('só oferece exercícios de arremesso, começando pelo lance livre', async () => {
    abrirFerramentas('arremessos')
    const exercicio = await screen.findByRole('combobox', { name: 'Exercício' })
    await waitFor(() => expect(exercicio).toHaveDisplayValue('Lance livre'))
    expect([...(exercicio as HTMLSelectElement).options].map((o) => o.text)).toEqual(['Arremesso de média', 'Lance livre'])
    expect(screen.getByRole('button', { name: 'Salvar como sessão' })).toBeDisabled()
  })

  it('salva os arremessos como sessão do exercício escolhido, com a duração desde o primeiro arremesso', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-28T10:00:00-03:00'))
    const user = userEvent.setup()
    const { ultima } = abrirFerramentas('arremessos')
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Exercício' }), 'Arremesso de média')

    for (const botao of [/acertou/i, /acertou/i, /errou/i, /acertou/i]) {
      await clicar(user, botao)
      vi.setSystemTime(Date.now() + 60_000)
    }
    await clicar(user, 'Salvar como sessão')

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/desempenho'))
    expect(ultima('POST', '/sessions')?.corpo).toEqual({
      workoutId: null,
      performedAt: '2026-10-28T13:00:00.000Z',
      durationMinutes: 4,
      rating: null,
      fatigue: null,
      notes: null,
      entries: [{ exerciseId: 1, makes: 3, attempts: 4, reps: null, seconds: null, bestStreak: 2 }],
      shots: [],
    })
  })

  it('mostra o erro e deixa tentar de novo quando o servidor recusa', async () => {
    const user = userEvent.setup()
    const { chamadas } = abrirFerramentas('arremessos', { 'POST /sessions': new Resposta(500, { error: 'Banco fora do ar' }) })
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Exercício' })).toHaveDisplayValue('Lance livre'))

    await clicar(user, /errou/i)
    await clicar(user, 'Salvar como sessão')

    expect(await screen.findByRole('alert')).toHaveTextContent('Banco fora do ar')
    expect(screen.getByRole('button', { name: 'Salvar como sessão' })).toBeEnabled()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/ferramentas')
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toMatchObject({
      durationMinutes: 1,
      entries: [{ exerciseId: 3, makes: 0, attempts: 1, bestStreak: null }],
    })
  })
})
