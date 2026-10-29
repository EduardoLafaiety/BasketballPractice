import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const catalogo = [
  { id: 1, name: 'Lance livre', category: 'arremesso', metric: 'acertos', description: 'Da linha', custom: false },
  { id: 2, name: 'Suicídio', category: 'condicionamento', metric: 'tempo', description: null, custom: false },
  { id: 3, name: 'Crossover', category: 'drible', metric: 'repeticoes', description: null, custom: false },
]

const resumo = (sessions: number, minutes: number, makes: number, attempts: number) => ({
  totals: { sessions, minutes, averageRating: null },
  shooting: { makes, attempts, percentage: null },
  byWeek: [],
})

const meta = (extra: object) => ({
  id: 1,
  title: 'Treinar 3x',
  kind: 'sessoes_semana',
  target: 3,
  current: 1,
  achieved: false,
  exerciseId: null,
  exerciseName: null,
  deadline: null,
  ...extra,
})

/** Rotina com um treino "bp-rotina:<dia>" por dia informado. */
function rotinaDe(dias: Record<number, number[]>) {
  const treinos = Object.entries(dias).map(([dia, ids]) => ({
    id: 10 + Number(dia),
    name: `Rotina ${dia}`,
    description: `bp-rotina:${dia}`,
    exercises: ids.map((exerciseId) => ({ exerciseId })),
  }))
  return {
    'GET /workouts': treinos.map(({ exercises: _, ...resumo }) => resumo),
    'GET /workouts/:id': (_c: unknown, _u: URL, { id }: Record<string, string>) =>
      treinos.find((t) => t.id === Number(id)) ?? new Resposta(404),
  }
}

// Quarta-feira, 28/10/2026, 10h em São Paulo (o fuso dos testes).
const QUARTA = new Date('2026-10-28T10:00:00-03:00')

function abrirInicio(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(QUARTA)
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': catalogo,
    'GET /stats/summary': resumo(4, 95, 30, 40),
    'GET /stats/progress': { streak: { current: 3, best: 5 }, achievements: [] },
    'GET /goals': [],
    ...rotinaDe({}),
    ...rotas,
  })
  abrirApp('/')
  return api
}

/** Valor em destaque do cartão de número com esse rótulo. */
const numero = (rotulo: string) => (screen.getByText(rotulo).closest('.stat') as HTMLElement).querySelector('strong')

describe('Início', () => {
  it('mostra os números dos últimos 7 dias, contados desde a meia-noite de 6 dias atrás', async () => {
    const { ultima } = abrirInicio()

    expect(await screen.findByText('75%')).toBeInTheDocument()
    expect(numero('sessões nos últimos 7 dias')).toHaveTextContent('4')
    expect(numero('minutos treinados')).toHaveTextContent('95')
    expect(numero('aproveitamento nos arremessos')).toHaveTextContent('75%')
    // Quinta, 22/10, 00h em São Paulo = 03h UTC.
    expect(ultima('GET', '/stats/summary')?.url.searchParams.get('from')).toBe('2026-10-22T03:00:00.000Z')
    expect(screen.getByText('Quarta')).toBeInTheDocument()
  })

  it('mostra “—” no aproveitamento quando não houve arremesso', async () => {
    abrirInicio({ 'GET /stats/summary': resumo(1, 20, 0, 0) })
    expect(await screen.findByText('20')).toBeInTheDocument()
    expect(numero('aproveitamento nos arremessos')).toHaveTextContent('—')
  })

  it('mostra a sequência de dias e a próxima meta não concluída', async () => {
    abrirInicio({
      'GET /goals': [
        meta({ id: 1, title: 'Já foi', current: 3, achieved: true }),
        meta({ id: 2, title: '100 cestas', kind: 'cestas_total', target: 100, current: 42 }),
      ],
    })
    const sequencia = await screen.findByRole('link', { name: /dias seguidos/ })
    expect(sequencia).toHaveTextContent('3 dias seguidos · meta: 100 cestas (42/100)')
    expect(sequencia).toHaveAttribute('href', '/metas')
  })

  it('usa o singular com 1 dia seguido', async () => {
    abrirInicio({ 'GET /stats/progress': { streak: { current: 1, best: 5 }, achievements: [] } })
    expect(await screen.findByRole('link', { name: /dia seguido/ })).toHaveTextContent(/^1 dia seguido$/)
  })

  it('sem sequência, não mostra “0 dias seguidos” e mantém só a próxima meta', async () => {
    abrirInicio({
      'GET /stats/progress': { streak: { current: 0, best: 5 }, achievements: [] },
      'GET /goals': [meta({ id: 2, title: '100 cestas', kind: 'cestas_total', target: 100, current: 42 })],
    })
    const link = await screen.findByRole('link', { name: /Meta: 100 cestas/ })
    expect(link).toHaveTextContent(/^Meta: 100 cestas \(42\/100\)$/)
    expect(link).toHaveAttribute('href', '/metas')
    expect(screen.queryByText(/dias? seguidos?/)).toBeNull()
  })

  it('sem sequência e sem meta pendente, não mostra nada', async () => {
    abrirInicio({ 'GET /stats/progress': { streak: { current: 0, best: 5 }, achievements: [] } })
    expect(await screen.findByText('95')).toBeInTheDocument()
    expect(screen.queryByText(/dias? seguidos?/)).toBeNull()
    expect(screen.queryByRole('link', { name: /Meta:/ })).toBeNull()
  })

  it('lista o treino da rotina de hoje e leva à sessão do dia', async () => {
    abrirInicio(rotinaDe({ 3: [3, 1], 4: [2] }))

    const hoje = (await screen.findByRole('heading', { name: 'Treino de hoje' })).closest('section') as HTMLElement
    const cartoes = await within(hoje).findAllByRole('link', { name: /Crossover|Lance livre|Suicídio/ })
    expect(cartoes.map((c) => c.querySelector('h3')?.textContent)).toEqual(['Crossover', 'Lance livre'])
    expect(cartoes[1]).toHaveAttribute('href', '/treinos/1')
    expect(screen.getByRole('link', { name: 'Começar treino de hoje' })).toHaveAttribute('href', '/sessao?hoje')
    expect(screen.queryByRole('link', { name: 'Gerar um treino' })).toBeNull()
  })

  it('com um só exercício hoje, já oferece começar o treino', async () => {
    abrirInicio(rotinaDe({ 3: [2] }))
    expect(await screen.findByRole('link', { name: 'Começar treino de hoje' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gerar um treino' })).toBeNull()
  })

  it('sem treino planejado para hoje, sugere a rotina e o gerador', async () => {
    abrirInicio(rotinaDe({ 4: [2] }))

    expect(await screen.findByText(/Nenhum treino planejado para quarta\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Adicione à rotina' })).toHaveAttribute('href', '/rotina')
    expect(screen.getByRole('link', { name: 'Gerar um treino' })).toHaveAttribute('href', '/gerador')
    expect(screen.queryByRole('link', { name: /Começar treino de hoje/ })).toBeNull()
  })

  it('avisa quando os números não carregam, sem mostrar zeros falsos', async () => {
    abrirInicio({ 'GET /stats/summary': new Resposta(500, { error: 'Banco fora do ar' }) })

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar seus números: Banco fora do ar')
    for (const rotulo of ['sessões nos últimos 7 dias', 'minutos treinados', 'aproveitamento nos arremessos'])
      expect(numero(rotulo)).toHaveTextContent('!')
  })
})
