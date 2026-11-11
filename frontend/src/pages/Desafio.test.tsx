import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

const porTentativas = {
  id: 'lances-20',
  title: '20 lances livres',
  description: 'Vinte lances livres seguidos.',
  exercise: 'Lance livre',
  mode: 'tentativas',
  attempts: 3,
  goal: 2,
  maxAttempts: 3,
}

const porTempo = {
  id: 'mikan-1min',
  title: 'Um minuto de Mikan',
  description: 'Bandejas alternando os lados.',
  exercise: 'Mikan drill',
  mode: 'tempo',
  seconds: 60,
  goal: 20,
  maxAttempts: 45,
}

const resultado = (extra: object = {}) => ({
  day: '2026-10-28',
  challengeId: 'lances-20',
  title: '20 lances livres',
  makes: 2,
  attempts: 3,
  goal: 2,
  completed: true,
  ...extra,
})

function abrirDesafio(challenge: object, rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /challenges/today': { day: '2026-10-28', challenge, result: null },
    'GET /challenges/history': [],
    'POST /challenges/today': (corpo: unknown) => new Resposta(201, resultado(corpo as object)),
    ...rotas,
  })
  abrirApp('/desafio')
  return api
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Desafio do dia', () => {
  it('conta as tentativas, termina sozinho no último arremesso e salva o resultado', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirDesafio(porTentativas)

    expect(await screen.findByRole('heading', { name: '20 lances livres' })).toBeInTheDocument()
    expect(screen.getByText('3 arremessos · meta: 2 cestas')).toBeInTheDocument()
    expect(ultima('GET', '/challenges/today')?.url.searchParams.get('tzOffset')).toBe(String(new Date().getTimezoneOffset()))

    await user.click(screen.getByRole('button', { name: /Começar desafio/ }))
    expect(screen.getByText('0/3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Acertou/ }))
    await user.click(screen.getByRole('button', { name: /Errou/ }))
    await user.click(screen.getByRole('button', { name: /Acertou/ }))

    expect(screen.queryByRole('button', { name: /Acertou/ })).toBeNull()
    expect(screen.getByText(/meta batida/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar resultado' }))

    expect(await screen.findByText('Desafio cumprido · 67% de aproveitamento')).toBeInTheDocument()
    const corpo = ultima('POST', '/challenges/today')?.corpo as Record<string, number>
    expect(corpo).toMatchObject({ makes: 2, attempts: 3, bestStreak: 1 })
    expect(corpo.seconds).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: /Começar desafio/ })).toBeNull()
  })

  it('no modo tempo, o relógio corre e o desafio acaba quando o tempo zera', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    abrirDesafio(porTempo)

    fireEvent.click(await screen.findByRole('button', { name: /Começar desafio/ }))
    expect(screen.getByText('01:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Acertou/ }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(screen.getByText('00:30')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(30_000))

    expect(screen.queryByRole('button', { name: /Acertou/ })).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('1 de 1 · meta: 20')
    expect(screen.getByRole('button', { name: 'Salvar resultado' })).toBeEnabled()
  })

  it('encerrar antes da hora sem arremessos não deixa salvar', async () => {
    const user = userEvent.setup()
    abrirDesafio(porTempo)
    await user.click(await screen.findByRole('button', { name: /Começar desafio/ }))
    await user.click(screen.getByRole('button', { name: 'Encerrar agora' }))
    expect(screen.getByRole('button', { name: 'Salvar resultado' })).toBeDisabled()
    expect(screen.getByText(/Nenhum arremesso registrado/)).toBeInTheDocument()
  })

  it('quem já fez o desafio vê o resultado e o histórico, sem botão para começar de novo', async () => {
    abrirDesafio(porTentativas, {
      'GET /challenges/today': { day: '2026-10-28', challenge: porTentativas, result: resultado({ makes: 1, completed: false }) },
      'GET /challenges/history': [resultado({ makes: 1, completed: false }), resultado({ day: '2026-10-27', makes: 3 })],
    })

    expect(await screen.findByText('1/3')).toBeInTheDocument()
    expect(screen.getByText(/Desafio feito/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Começar desafio/ })).toBeNull()
    const historico = (await screen.findByRole('heading', { name: 'Seus desafios' })).closest('section')!
    expect(within(historico).getByText('1 de 2 cumpridos nos últimos desafios.')).toBeInTheDocument()
  })

  it('mostra o erro do servidor e deixa tentar salvar de novo', async () => {
    const user = userEvent.setup()
    abrirDesafio(porTentativas, {
      'POST /challenges/today': new Resposta(409, { error: 'Você já fez o desafio de hoje. Volte amanhã!' }),
    })
    await user.click(await screen.findByRole('button', { name: /Começar desafio/ }))
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /Errou/ }))
    await user.click(screen.getByRole('button', { name: 'Salvar resultado' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Você já fez o desafio de hoje')
    expect(screen.getByRole('button', { name: 'Salvar resultado' })).toBeEnabled()
  })
})
