import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

// O download do CSV vira um espião; a montagem do arquivo continua a de verdade.
vi.mock('../lib/arquivo', async (original) => ({ ...(await original<typeof import('../lib/arquivo')>()), baixarArquivo: vi.fn() }))
const { baixarArquivo } = await import('../lib/arquivo')

// Quarta-feira, 28/10/2026, 10h em São Paulo (o fuso dos testes).
const AGORA = new Date('2026-10-28T10:00:00-03:00')

type Num = number | null
const resumo = (sessions: number, minutes: number, makes: number, attempts: number, extra: object = {}) => ({
  totals: { sessions, minutes, averageRating: null as Num, averageFatigue: null as Num },
  shooting: { makes, attempts, percentage: null },
  byWeek: [] as object[],
  ...extra,
})

const entrada = (extra: object = {}) => ({
  exerciseId: 1,
  exerciseName: 'Lance livre',
  makes: null,
  attempts: null,
  reps: null,
  seconds: null,
  bestStreak: null,
  ...extra,
})

const sessao = (id: number, performedAt: string, extra: object = {}) => ({
  id,
  workoutName: null,
  performedAt,
  durationMinutes: 30,
  rating: null,
  fatigue: null,
  notes: null,
  entries: [entrada()],
  shots: [],
  ...extra,
})

// Instantes (UTC) que a tela pede ao backend, a partir de quarta 28/10 em São Paulo.
const SEGUNDA = '2026-10-26T03:00:00.000Z'
const SEGUNDA_PASSADA = '2026-10-19T03:00:00.000Z'
const DIA_1 = '2026-10-01T03:00:00.000Z'
const DIA_1_SETEMBRO = '2026-09-01T03:00:00.000Z'
const DOZE_SEMANAS = '2026-08-10T03:00:00.000Z'
const antes = (iso: string) => new Date(new Date(iso).getTime() - 1).toISOString()

/**
 * /stats/summary responde conforme o período pedido ("from" e "to"); um período que a tela
 * não deveria pedir responde 400, e a tela fica em "Carregando…".
 */
function resumos(porPeriodo: Record<string, unknown>) {
  return (_c: unknown, url: URL) => {
    const chave = `${url.searchParams.get('from') ?? 'tudo'}|${url.searchParams.get('to') ?? ''}`
    return porPeriodo[chave] ?? new Resposta(400, { error: `Período inesperado ${chave}` })
  }
}

const periodosPadrao = {
  'tudo|': resumo(12, 340, 60, 100),
  [`${SEGUNDA}|`]: resumo(3, 90, 30, 50),
  [`${SEGUNDA_PASSADA}|${antes(SEGUNDA)}`]: resumo(2, 100, 20, 40),
  [`${DIA_1}|`]: resumo(8, 200, 40, 80),
  [`${DIA_1_SETEMBRO}|${antes(DIA_1)}`]: resumo(8, 150, 45, 90),
  [`${DOZE_SEMANAS}|`]: resumo(0, 0, 0, 0),
}

function abrirDesempenho(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AGORA)
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /sessions': [sessao(1, '2026-10-28T12:00:00.000Z')],
    'GET /stats/summary': resumos(periodosPadrao),
    'GET /stats/zones': [],
    ...rotas,
  })
  abrirApp('/desempenho')
  return api
}

const numero = (rotulo: string | RegExp) => (screen.getByText(rotulo).closest('.stat') as HTMLElement).querySelector('strong')
const cartao = (titulo: string) => screen.getByRole('heading', { name: titulo }).closest('.card') as HTMLElement
/** Linhas da tabela de comparação: rótulo, atual, anterior e diferença. */
const linhas = (titulo: string) =>
  within(cartao(titulo))
    .getAllByRole('row')
    .map((tr) => [...tr.children].map((c) => c.textContent))

describe('Desempenho', () => {
  it('sem sessões, convida a escolher um treino', async () => {
    abrirDesempenho({ 'GET /sessions': [] })
    expect(await screen.findByText(/Você ainda não registrou nenhuma sessão/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escolha um treino para começar' })).toHaveAttribute('href', '/treinos')
  })

  it('mostra os totais de todo o histórico, com cansaço e esforço médios', async () => {
    abrirDesempenho({
      'GET /stats/summary': resumos({
        ...periodosPadrao,
        'tudo|': resumo(12, 340, 60, 100, { totals: { sessions: 12, minutes: 340, averageRating: 4.2, averageFatigue: 3.5 } }),
      }),
    })

    expect(await screen.findByText('60%')).toBeInTheDocument()
    expect(numero('sessões no total')).toHaveTextContent('12')
    expect(numero('minutos treinados')).toHaveTextContent('340')
    expect(numero(/aproveitamento \(60\/100\)/)).toHaveTextContent('60%')
    expect(numero(/cansaço médio/)).toHaveTextContent('3,5')
    expect(screen.getByText(/cansaço médio/)).toHaveTextContent('cansaço médio (1–5) · esforço 4,2')
  })

  it('esconde o cansaço médio quando nenhuma sessão o registrou', async () => {
    abrirDesempenho()
    expect(await screen.findByText('sessões no total')).toBeInTheDocument()
    await waitFor(() => expect(numero('sessões no total')).toHaveTextContent('12'))
    expect(screen.queryByText(/cansaço médio/)).toBeNull()
  })

  it('compara esta semana com a passada e este mês com o anterior', async () => {
    abrirDesempenho()

    await waitFor(() => expect(within(cartao('Esta semana × semana passada')).queryByText('Carregando…')).toBeNull())
    expect(linhas('Esta semana × semana passada')).toEqual([
      ['Sessões', '3', 'antes 2', '▲ 1'],
      ['Minutos', '90', 'antes 100', '▼ 10'],
      ['Aproveitamento', '60%', 'antes 50%', '▲ 10%'],
    ])
    await waitFor(() => expect(within(cartao('Este mês × mês passado')).queryByText('Carregando…')).toBeNull())
    expect(linhas('Este mês × mês passado')).toEqual([
      ['Sessões', '8', 'antes 8', '='],
      ['Minutos', '200', 'antes 150', '▲ 50'],
      ['Aproveitamento', '50%', 'antes 50%', '='],
    ])
    const igual = within(cartao('Este mês × mês passado')).getAllByText('=')[0]
    expect(igual).toHaveClass('meta')
    expect(within(cartao('Esta semana × semana passada')).getByText('▲ 1')).toHaveClass('positivo')
    expect(within(cartao('Esta semana × semana passada')).getByText('▼ 10')).toHaveClass('negativo')
  })

  it('na comparação, período sem arremessos mostra “—” e não calcula diferença', async () => {
    abrirDesempenho({
      'GET /stats/summary': resumos({ ...periodosPadrao, [`${SEGUNDA_PASSADA}|${antes(SEGUNDA)}`]: resumo(1, 20, 0, 0) }),
    })
    await waitFor(() => expect(within(cartao('Esta semana × semana passada')).queryByText('Carregando…')).toBeNull())
    expect(linhas('Esta semana × semana passada')[2]).toEqual(['Aproveitamento', '60%', 'antes —', ''])
  })

  it('soma os minutos de cada um dos últimos 7 dias no gráfico de barras', async () => {
    abrirDesempenho({
      'GET /sessions': [
        sessao(1, '2026-10-28T12:00:00.000Z', { durationMinutes: 10 }),
        sessao(2, '2026-10-28T02:30:00.000Z', { durationMinutes: 15 }), // 27/10, 23h30 em São Paulo
        sessao(3, '2026-10-26T20:00:00.000Z', { durationMinutes: 20 }),
        sessao(4, '2026-10-21T20:00:00.000Z', { durationMinutes: 60 }), // há 7 dias: fora do gráfico
      ],
    })

    const grafico = await screen.findByRole('img', { name: 'Minutos treinados por dia nos últimos 7 dias' })
    const colunas = [...grafico.querySelectorAll('.barra-col')]
    expect(colunas.map((c) => c.querySelector('.barra-rotulo')?.textContent)).toEqual(['qui', 'sex', 'sáb', 'dom', 'seg', 'ter', 'qua'])
    expect(colunas.map((c) => c.querySelector('.barra-valor')?.textContent)).toEqual(['', '', '', '', '20', '15', '10'])
    // A escala vai até 30 min no mínimo.
    expect(colunas.map((c) => (c.querySelector('.barra') as HTMLElement).style.height)).toEqual(['0%', '0%', '0%', '0%', `${(20 / 30) * 100}%`, '50%', `${(10 / 30) * 100}%`])
  })

  it('desenha a evolução semanal das últimas 12 semanas, com buracos nas semanas sem arremesso', async () => {
    const semana = (weekStart: string, minutes: number, makes: number, attempts: number) => ({ weekStart, sessions: 1, minutes, makes, attempts })
    abrirDesempenho({
      'GET /stats/summary': resumos({
        ...periodosPadrao,
        [`${DOZE_SEMANAS}|`]: resumo(3, 100, 25, 50, {
          byWeek: [semana('2026-08-10', 30, 5, 10), semana('2026-10-19', 40, 0, 0), semana('2026-10-26', 30, 20, 40)],
        }),
      }),
    })

    const aproveitamento = await screen.findByRole('img', { name: 'Aproveitamento por semana' })
    const pontos = (svg: Element) => [...svg.querySelectorAll('circle title')].map((t) => t.textContent)
    expect(pontos(aproveitamento)).toEqual(['10/08: 50%', '26/10: 50%'])
    const minutos = screen.getByRole('img', { name: 'Minutos por semana' })
    expect(pontos(minutos)).toHaveLength(12)
    expect(pontos(minutos)[0]).toBe('10/08: 30')
    expect(pontos(minutos).slice(-2)).toEqual(['19/10: 40', '26/10: 30'])
    expect(pontos(minutos)[5]).toBe('14/09: 0')
  })

  it('com menos de 2 semanas de treino, não mostra a evolução', async () => {
    abrirDesempenho({
      'GET /stats/summary': resumos({
        ...periodosPadrao,
        [`${DOZE_SEMANAS}|`]: resumo(1, 30, 5, 10, { byWeek: [{ weekStart: '2026-10-26', sessions: 1, minutes: 30, makes: 5, attempts: 10 }] }),
      }),
    })
    await waitFor(() => expect(within(cartao('Esta semana × semana passada')).queryByText('Carregando…')).toBeNull())
    expect(screen.queryByRole('heading', { name: /Evolução/ })).toBeNull()
  })

  it('o mapa de arremessos troca entre todo o histórico e os últimos 30 dias', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirDesempenho({
      'GET /stats/zones': (_c, url) =>
        url.searchParams.get('from') === '2026-09-29T03:00:00.000Z'
          ? [{ zone: 'garrafao', makes: 2, attempts: 4 }]
          : url.searchParams.has('from')
            ? new Resposta(400, { error: 'Período inesperado' })
            : [{ zone: 'garrafao', makes: 9, attempts: 12 }],
    })

    expect(await screen.findByLabelText('Garrafão: 9/12 (75%)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tudo' })).toHaveClass('ativo')

    await user.click(screen.getByRole('button', { name: '30 dias' }))
    expect(await screen.findByLabelText('Garrafão: 2/4 (50%)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30 dias' })).toHaveClass('ativo')
    expect(ultima('GET', '/stats/zones')?.url.searchParams.get('from')).toBe('2026-09-29T03:00:00.000Z')
  })

  it('sem arremessos por zona, explica como marcar', async () => {
    abrirDesempenho()
    expect(await screen.findByText(/Nenhum arremesso marcado por zona ainda/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Mapa de aproveitamento por zona' })).toBeNull()
  })

  it('lista o histórico com os detalhes de cada sessão', async () => {
    abrirDesempenho({
      'GET /sessions': [
        sessao(1, '2026-10-28T12:00:00.000Z', {
          durationMinutes: 25,
          rating: 4,
          fatigue: 2,
          notes: 'Mão quente hoje',
          entries: [entrada({ makes: 7, attempts: 10, bestStreak: 4 })],
          shots: [{ zone: 'garrafao', makes: 3, attempts: 4 }],
        }),
        sessao(2, '2026-10-27T12:00:00.000Z', {
          workoutName: 'Treino gerado',
          durationMinutes: 0,
          entries: [entrada({ makes: 3, attempts: 5 }), entrada({ exerciseId: 2, exerciseName: 'Prancha', seconds: 60 })],
        }),
      ],
    })

    const itens = await screen.findAllByRole('listitem')
    const historico = itens.filter((li) => li.classList.contains('sessao'))
    expect(historico).toHaveLength(2)
    expect(historico[0]).toHaveTextContent('Lance livre')
    expect(historico[0].querySelector('.meta')).toHaveTextContent(/^28 de out\.? · 25 min · esforço 4\/5 · cansaço 2\/5 · 7\/10 \(70%\) · 4 seguidos · 1 zona$/)
    expect(historico[0]).toHaveTextContent('Mão quente hoje')
    expect(historico[1]).toHaveTextContent('Treino gerado')
    expect(historico[1]).toHaveTextContent('Lance livre · Prancha')
    expect(historico[1]).not.toHaveTextContent('min')
    expect(historico[1]).toHaveTextContent('3/5 (60%)')
  })

  it('só exclui a sessão depois de confirmar, e atualiza os totais', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    let sessoes = [sessao(1, '2026-10-28T12:00:00.000Z'), sessao(2, '2026-10-27T12:00:00.000Z', { workoutName: 'Circuito' })]
    let total = 2
    const { chamadas } = abrirDesempenho({
      'GET /sessions': () => sessoes,
      'DELETE /sessions/:id': (_c, _u, { id }) => {
        sessoes = sessoes.filter((s) => s.id !== Number(id))
        total = sessoes.length
        return new Resposta(204)
      },
      'GET /stats/summary': (c, url) => (url.searchParams.has('from') ? resumos(periodosPadrao)(c, url) : resumo(total, 30 * total, 0, 0)),
    })
    await waitFor(() => expect(numero('sessões no total')).toHaveTextContent('2'))
    const excluir = () => screen.getAllByRole('button', { name: 'Excluir sessão' })[1]

    await user.click(excluir())
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/^Excluir a sessão "Circuito" de 27/))
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)
    expect(screen.getAllByRole('button', { name: 'Excluir sessão' })).toHaveLength(2)

    confirmar.mockReturnValue(true)
    await user.click(excluir())

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Excluir sessão' })).toHaveLength(1))
    expect(chamadas.filter((c) => c.metodo === 'DELETE').map((c) => c.caminho)).toEqual(['/sessions/2'])
    expect(screen.queryByText('Circuito')).toBeNull()
    await waitFor(() => expect(numero('sessões no total')).toHaveTextContent('1'))
  })

  it('devolve a sessão à lista e avisa quando a exclusão falha', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    abrirDesempenho({
      'GET /sessions': [sessao(1, '2026-10-28T12:00:00.000Z', { workoutName: 'Circuito' })],
      'DELETE /sessions/:id': new Resposta(500, { error: 'Banco fora do ar' }),
    })

    await user.click(await screen.findByRole('button', { name: 'Excluir sessão' }))

    expect(await screen.findByText('Não foi possível excluir a sessão: Banco fora do ar')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Circuito')).toBeInTheDocument()
  })

  it('exporta o histórico inteiro em CSV, página por página', async () => {
    const user = userEvent.setup()
    const pagina = (offset: number, n: number) => Array.from({ length: n }, (_, i) => sessao(offset + i + 1, '2026-10-20T12:00:00.000Z'))
    const { chamadas } = abrirDesempenho({
      'GET /sessions': (_c, url) =>
        url.searchParams.get('limit') === '200' ? pagina(Number(url.searchParams.get('offset')), url.searchParams.get('offset') === '0' ? 200 : 3) : [sessao(1, '2026-10-28T12:00:00.000Z')],
    })

    await user.click(await screen.findByRole('button', { name: 'Exportar CSV' }))

    await waitFor(() => expect(baixarArquivo).toHaveBeenCalledTimes(1))
    const [csv, nome, tipo] = vi.mocked(baixarArquivo).mock.calls[0]
    expect(nome).toBe('sessoes-2026-10-28.csv')
    expect(tipo).toBe('text/csv;charset=utf-8')
    expect(String(csv).trim().split('\n')).toHaveLength(1 + 203)
    const offsets = chamadas.filter((c) => c.url.searchParams.get('limit') === '200').map((c) => c.url.searchParams.get('offset'))
    expect(offsets).toEqual(['0', '200'])
  })
})
