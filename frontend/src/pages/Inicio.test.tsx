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
  })

  it('mostra “—” no aproveitamento quando não houve arremesso', async () => {
    abrirInicio({ 'GET /stats/summary': resumo(1, 20, 0, 0) })
    expect(await screen.findByText('20')).toBeInTheDocument()
    expect(numero('aproveitamento nos arremessos')).toHaveTextContent('—')
  })

  it('a abertura fica só com o título: sem o cartão de convite, sequência ou meta', async () => {
    abrirInicio({ 'GET /goals': [meta({ id: 2, title: '100 cestas', kind: 'cestas_total', target: 100, current: 42 })] })
    expect(await screen.findByText('95')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bora pra quadra.')
    expect(screen.queryByText(/dias? seguidos?/)).toBeNull()
    expect(screen.queryByRole('link', { name: /Meta:/ })).toBeNull()
    expect(screen.queryByText(/Que tal 15 minutos/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Gerar treino rápido' })).toBeNull()
  })

  it('a página mostra os níveis com a contagem real, a rotina da semana e todos os jogadores', async () => {
    const estilo = (id: string, name: string) => ({ id, name, group: 'guard', archetype: 'Estilo', moveCount: 3, minutes: 40, mix: { arremesso: 100 } })
    const doNivel = (id: number, level: string, warmup = false) => ({ id, name: `Exercício ${id}`, category: 'drible', metric: 'tempo', description: null, custom: false, level, warmup })
    abrirInicio({
      'GET /exercises': [doNivel(1, 'iniciante'), doNivel(2, 'iniciante'), doNivel(3, 'iniciante', true), doNivel(4, 'avancado'), ...catalogo],
      'GET /styles': [estilo('luka-doncic', 'Luka Dončić'), estilo('stephen-curry', 'Stephen Curry')],
      ...rotinaDe({ 1: [1] }),
    })

    const iniciante = (await screen.findByRole('heading', { name: 'Iniciante' })).closest('a') as HTMLElement
    expect(iniciante).toHaveAttribute('href', '/treinos?nivel=iniciante')
    // O aquecimento não conta como exercício do nível.
    await within(iniciante).findByText('2 exercícios')
    expect(within(screen.getByRole('heading', { name: 'Avançado' }).closest('a') as HTMLElement).getByText('1 exercícios')).toBeInTheDocument()

    // Os dois jogadores têm link; os nomes que correm são decoração e não repetem o link.
    expect(await screen.findByRole('link', { name: /Luka Dončić/ })).toHaveAttribute('href', '/jogue-como/luka-doncic')
    expect(screen.getAllByRole('link', { name: /Dončić|Curry/ })).toHaveLength(2)
    const nomes = document.querySelector('.nomes-linha') as HTMLElement
    expect(nomes).toHaveTextContent('Luka Dončić')
    expect(nomes).toHaveAttribute('aria-hidden', 'true')
    expect(nomes.querySelector('a')).toBeNull()

    const segunda = (await screen.findByRole('heading', { name: 'Seg' })).closest('article') as HTMLElement
    await within(segunda).findByText('Exercício 1')
    expect(screen.getByRole('heading', { name: 'Ter' }).closest('article')).toHaveTextContent('Descanso')
  })

  it('chama para os artigos com as categorias e alguns em destaque', async () => {
    abrirInicio()
    const secao = (await screen.findByRole('heading', { name: 'Entenda o jogo' })).closest('section') as HTMLElement
    expect(within(secao).getByRole('link', { name: 'Ver todos os artigos' })).toHaveAttribute('href', '/artigos')
    expect(within(secao).getByRole('link', { name: 'Sono' })).toHaveAttribute('href', '/artigos?categoria=sono')
    expect(within(secao).getByRole('link', { name: /Dormir mais acerta mais arremessos/ })).toHaveAttribute('href', '/artigos/sono-e-arremesso')
    expect(within(secao).getByRole('link', { name: /Massagem, compressão, gelo/ })).toHaveAttribute('href', '/artigos/qual-recuperacao-funciona')
    expect(within(secao).getAllByRole('link', { name: /min de leitura/ })).toHaveLength(5)
  })

  it('sem resposta dos jogadores, o resto da página continua', async () => {
    abrirInicio({ 'GET /styles': new Resposta(500) })
    expect(await screen.findByRole('heading', { name: 'Treino de hoje' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Jogue como' })).toBeNull()
  })

  it('lista o treino da rotina de hoje e leva à sessão do dia', async () => {
    abrirInicio(rotinaDe({ 3: [3, 1], 4: [2] }))

    const hoje = (await screen.findByRole('heading', { name: 'Treino de hoje' })).closest('section') as HTMLElement
    const cartoes = await within(hoje).findAllByRole('link', { name: /Crossover|Lance livre|Suicídio/ })
    expect(cartoes.map((c) => c.querySelector('h3')?.textContent)).toEqual(['Crossover', 'Lance livre'])
    expect(cartoes[1]).toHaveAttribute('href', '/treinos/1')
    expect(within(hoje).getByRole('link', { name: 'Começar treino de hoje' })).toHaveAttribute('href', '/sessao?hoje')
  })

  it('sem treino planejado para hoje, sugere a rotina', async () => {
    abrirInicio(rotinaDe({ 4: [2] }))

    expect(await screen.findByText(/Nenhum treino planejado para quarta\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Adicione à rotina' })).toHaveAttribute('href', '/rotina')
    expect(screen.queryByRole('link', { name: /Começar treino de hoje/ })).toBeNull()
  })

  it('avisa quando os números não carregam, sem mostrar zeros falsos', async () => {
    abrirInicio({ 'GET /stats/summary': new Resposta(500, { error: 'Banco fora do ar' }) })

    expect(await screen.findByText('Não foi possível carregar seus números: Banco fora do ar')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Não foi possível carregar o resumo: Banco fora do ar')).toHaveAttribute('role', 'alert')
    for (const rotulo of ['sessões nos últimos 7 dias', 'minutos treinados', 'aproveitamento nos arremessos'])
      expect(numero(rotulo)).toHaveTextContent('!')
  })
})

const semana = (weekStart: string, sessions: number, minutes: number, makes: number, attempts: number) => ({ weekStart, sessions, minutes, makes, attempts })
const desafioHoje = (result: object | null = null) => ({
  day: '2026-10-28',
  challenge: { id: 'tres-25', title: '25 bolas de três', description: 'Cinco de cada posição.', exercise: 'Arremesso de três', mode: 'tentativas', attempts: 25, goal: 10, maxAttempts: 25 },
  result,
})

describe('Início: desafio do dia e resumo da semana', () => {
  it('chama para o desafio do dia e mostra quando ele já foi feito', async () => {
    abrirInicio({ 'GET /challenges/today': desafioHoje() })
    const secao = (await screen.findByRole('heading', { name: '25 bolas de três' })).closest('section')!
    expect(within(secao).getByText('cestas em 25 arremessos')).toBeInTheDocument()
    expect(within(secao).getByRole('link', { name: /Aceitar desafio/ })).toHaveAttribute('href', '/desafio')
  })

  it('o desafio já feito mostra o placar do dia', async () => {
    abrirInicio({ 'GET /challenges/today': desafioHoje({ day: '2026-10-28', challengeId: 'tres-25', title: '25 bolas de três', makes: 12, attempts: 25, goal: 10, completed: true }) })
    const secao = (await screen.findByRole('heading', { name: '25 bolas de três' })).closest('section')!
    expect(within(secao).getByText('12/25')).toBeInTheDocument()
    expect(within(secao).getByText('Cumprido hoje')).toBeInTheDocument()
  })

  it('no meio da semana, compara a semana até agora com a anterior', async () => {
    const { chamadas } = abrirInicio({
      'GET /stats/summary': { ...resumo(4, 95, 30, 40), byWeek: [semana('2026-10-19', 2, 60, 10, 20), semana('2026-10-26', 3, 90, 15, 20)] },
    })
    const secao = (await screen.findByRole('heading', { name: 'Resumo da semana' })).closest('section')!
    expect(secao).not.toHaveClass('destaque')
    expect(await within(secao).findByText('+1 em relação à semana anterior')).toBeInTheDocument()
    expect(within(secao).getByText('+30 min em relação à semana anterior')).toBeInTheDocument()
    expect(within(secao).getByText('75%')).toBeInTheDocument()
    expect(within(secao).getByText('+25 pontos em relação à semana anterior')).toHaveClass('sobe')
    // Desde a segunda da semana anterior (19/10, 00h em São Paulo).
    expect(chamadas.some((c) => c.caminho === '/stats/summary' && c.url.searchParams.get('from') === '2026-10-19T03:00:00.000Z')).toBe(true)
  })

  it('na segunda-feira, o balanço da semana passada vem em destaque no alto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-26T09:00:00-03:00'))
    definirToken('tk')
    apiFalsa({
      'GET /auth/me': usuarioFalso(),
      'GET /settings': configFalsa,
      'GET /exercises': catalogo,
      'GET /stats/summary': { ...resumo(1, 30, 0, 0), byWeek: [semana('2026-10-12', 4, 120, 30, 40), semana('2026-10-19', 2, 60, 10, 20)] },
      'GET /challenges/today': desafioHoje(),
      ...rotinaDe({}),
    })
    abrirApp('/')

    const secao = (await screen.findByRole('heading', { name: 'Resumo da semana passada' })).closest('section')!
    expect(secao).toHaveClass('destaque')
    expect(within(secao).getByText('Segunda é dia de balanço')).toBeInTheDocument()
    expect(await within(secao).findByText('−2 em relação à semana anterior')).toHaveClass('desce')
    expect(within(secao).getByText('−25 pontos em relação à semana anterior')).toBeInTheDocument()
    // Vem antes do desafio do dia.
    const desafio = screen.getByRole('heading', { name: '25 bolas de três' })
    expect(secao.compareDocumentPosition(desafio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
