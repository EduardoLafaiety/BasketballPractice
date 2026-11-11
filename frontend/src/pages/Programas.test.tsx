import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

const status = (extra: object = {}) => ({ started: false, total: 28, done: 0, ...extra })
const resumo = (extra: object = {}) => ({
  id: 'mao-fraca-4',
  name: 'Mão fraca em 4 semanas',
  summary: 'Do drible parado à bandeja.',
  level: 'iniciante',
  focus: 'Drible',
  totalDays: 28,
  minutesPerDay: 22,
  status: status(),
  ...extra,
})
const bloco = { exerciseId: 7, name: 'Drible parado com a mão esquerda', category: 'drible', metric: 'tempo', minutes: 10 }
const dias = (estados: string[]) => estados.map((state, i) => ({ day: i + 1, title: 'Controle parado', state, doneOn: state === 'done' ? '2026-11-09' : null, blocks: [bloco] }))

function abrir(caminho: string, rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': [],
    'GET /workouts': [],
    ...rotas,
  })
  abrirApp(caminho)
  return api
}

describe('Programas', () => {
  it('lista os programas com o progresso de quem já começou', async () => {
    abrir('/programas', {
      'GET /programs': [resumo(), resumo({ id: 'arremesso-30', name: '30 dias de arremesso', totalDays: 30, status: status({ started: true, total: 30, done: 12, nextDay: 13, availableToday: false }) })],
    })
    const arremesso = (await screen.findByRole('heading', { name: '30 dias de arremesso' })).closest('a')!
    expect(arremesso).toHaveAttribute('href', '/programas/arremesso-30')
    expect(within(arremesso).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12')
    expect(within(arremesso).getByText('12 de 30 dias · próximo dia amanhã')).toBeInTheDocument()
    const mao = screen.getByRole('heading', { name: 'Mão fraca em 4 semanas' }).closest('a')!
    expect(within(mao).getByText('28 dias · cerca de 22 min por dia')).toBeInTheDocument()
  })

  it('começa um programa e mostra o dia liberado', async () => {
    const user = userEvent.setup()
    let comecado = false
    const { ultima } = abrir('/programas/mao-fraca-4', {
      'GET /programs/mao-fraca-4': () =>
        comecado
          ? { ...resumo({ status: status({ started: true, done: 0, nextDay: 1, availableToday: true }) }), days: dias(['available', 'locked']) }
          : { ...resumo(), days: dias(['locked', 'locked']) },
      'POST /programs/mao-fraca-4/start': () => {
        comecado = true
        return new Resposta(201, status({ started: true }))
      },
    })

    await user.click(await screen.findByRole('button', { name: /Começar programa/ }))
    expect(await screen.findByRole('button', { name: /Treinar o dia 1/ })).toBeInTheDocument()
    expect(ultima('POST', '/programs/mao-fraca-4/start')?.url.searchParams.get('tzOffset')).not.toBeNull()
    const itens = screen.getAllByRole('listitem').filter((li) => li.classList.contains('programa-dia'))
    expect(within(itens[0]).getByText('Liberado hoje')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Bloqueado')).toBeInTheDocument()
  })

  it('"já treinei" marca o dia; o próximo fica para amanhã', async () => {
    const user = userEvent.setup()
    let feito = false
    abrir('/programas/mao-fraca-4', {
      'GET /programs/mao-fraca-4': () =>
        feito
          ? { ...resumo({ status: status({ started: true, done: 1, nextDay: 2, availableToday: false }) }), days: dias(['done', 'tomorrow']) }
          : { ...resumo({ status: status({ started: true, done: 0, nextDay: 1, availableToday: true }) }), days: dias(['available', 'locked']) },
      'POST /programs/mao-fraca-4/days/1/complete': () => {
        feito = true
        return new Resposta(201, status({ started: true, done: 1 }))
      },
    })
    await user.click(await screen.findByRole('button', { name: 'Já treinei, marcar como feito' }))
    expect(await screen.findByText('Libera amanhã')).toBeInTheDocument()
    expect(screen.getByText('1 de 28 dias · próximo dia amanhã')).toBeInTheDocument()
  })

  it('treinar agora abre a sessão guiada, e salvar a sessão conclui o dia do programa', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/programas/mao-fraca-4', {
      'GET /programs/mao-fraca-4': { ...resumo({ status: status({ started: true, done: 0, nextDay: 1, availableToday: true }) }), days: dias(['available', 'locked']) },
      'POST /sessions': new Resposta(201, { id: 55, performedAt: '2026-11-10T12:00:00Z', durationMinutes: 1, rating: null, notes: null, entries: [] }),
      'POST /programs/mao-fraca-4/days/1/complete': new Resposta(201, status({ started: true, done: 1 })),
    })

    await user.click(await screen.findByRole('button', { name: 'Treinar agora' }))
    expect(await screen.findByText(/Mão fraca em 4 semanas: dia 1/)).toBeInTheDocument()
    // Pula direto para o fim da sessão.
    await user.click(screen.getByRole('button', { name: /Começar/ }))
    await user.click(screen.getByRole('button', { name: 'Concluir treino' }))
    await user.click(await screen.findByRole('button', { name: 'Salvar sessão' }))

    expect(await screen.findByRole('heading', { name: 'Mão fraca em 4 semanas' })).toBeInTheDocument()
    expect(ultima('POST', '/programs/mao-fraca-4/days/1/complete')?.corpo).toEqual({ sessionId: 55 })
    expect(screen.getByTestId('caminho')).toHaveTextContent('/programas/mao-fraca-4')
  })
})
