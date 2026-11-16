import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const catalogo = [
  { id: 1, name: 'Lance livre', category: 'arremesso', metric: 'acertos', description: null, custom: false },
  { id: 2, name: 'Suicídio', category: 'condicionamento', metric: 'tempo', description: null, custom: false },
]

const meta = (extra: Record<string, unknown>) => ({
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

const tiposTeste = [
  { kind: 'impulsao', name: 'Impulsão vertical', unit: 'cm', better: 'higher' },
  { kind: 'sprint', name: 'Sprint de quadra inteira', unit: 's', better: 'lower' },
]

function abrirMetas(rotas: Parameters<typeof apiFalsa>[0] = {}, caminho = '/conquistas') {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': catalogo,
    'GET /stats/progress': { streak: { current: 2, best: 5 }, achievements: [] },
    'GET /goals': [],
    'GET /tests/kinds': tiposTeste,
    'GET /tests': [],
    ...rotas,
  })
  abrirApp(caminho)
  return api
}

/** Devolve a meta criada como o backend faria, ecoando o que a página enviou. */
const ecoarMeta = (corpo: unknown) => {
  const c = corpo as { title: string; kind: string; target: number; exerciseId: number | null; deadline: string | null }
  return meta({ id: 9, title: c.title, kind: c.kind, target: c.target, current: 0, exerciseId: c.exerciseId, deadline: c.deadline })
}

const conquista = (id: string, title: string, target: number, progress: number) => ({
  id,
  title,
  description: `Descrição de ${title}.`,
  target,
  progress,
  unlocked: progress >= target,
})

const progressoCom = (achievements: ReturnType<typeof conquista>[]) => ({ streak: { current: 2, best: 5 }, achievements })

describe('Lista de conquistas (estilo Steam)', () => {
  const catalogoDeConquistas = [
    conquista('100-sessoes', 'Centenário', 100, 40),
    conquista('primeira-sessao', 'Primeiro treino', 1, 1),
    conquista('10-sessoes', 'Constância', 10, 9),
    conquista('3-dias', 'Embalado', 3, 3),
  ]

  it('a aba se chama Conquistas e o endereço antigo (/metas) leva até ela', async () => {
    abrirMetas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) }, '/metas')
    expect(await screen.findByRole('heading', { name: 'Conquistas', level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('caminho').textContent).toBe('/conquistas')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: /Conquistas/ })).toHaveAttribute('href', '/conquistas')
  })

  it('mostra quantas foram desbloqueadas, com a porcentagem e a barra', async () => {
    abrirMetas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    expect(await screen.findByText(/Descrição|desbloqueadas/, { selector: '.conquistas-resumo p' })).toHaveTextContent('2 de 4 desbloqueadas (50%)')
    const barra = screen.getByRole('progressbar', { name: 'Conquistas desbloqueadas' })
    expect(barra).toHaveAttribute('aria-valuenow', '2')
    expect(barra).toHaveAttribute('aria-valuemax', '4')
  })

  it('lista as desbloqueadas primeiro e, depois, as bloqueadas da mais perto para a mais longe', async () => {
    abrirMetas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    await screen.findByText('Primeiro treino')
    const titulos = [...document.querySelectorAll('.conquista .conquista-texto strong')].map((e) => e.textContent)
    expect(titulos).toEqual(['Primeiro treino', 'Embalado', 'Constância', 'Centenário'])
    expect(document.querySelectorAll('.conquista.desbloqueada')).toHaveLength(2)
  })

  it('cada conquista tem ícone; a bloqueada mostra o progresso e a desbloqueada, o selo', async () => {
    abrirMetas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    await screen.findByText('Centenário')
    const bloqueada = screen.getByText('Centenário').closest('li')!
    expect(bloqueada).not.toHaveClass('desbloqueada')
    expect(bloqueada.querySelector('.conquista-icone svg')).not.toBeNull()
    expect(within(bloqueada).getByText('40/100')).toBeInTheDocument()
    expect(within(bloqueada).getByRole('progressbar', { name: 'Progresso: Centenário' })).toHaveAttribute('aria-valuenow', '40')

    const feita = screen.getByText('Primeiro treino').closest('li')!
    expect(feita).toHaveClass('desbloqueada')
    expect(within(feita).getByText('Desbloqueada')).toBeInTheDocument()
    expect(within(feita).queryByRole('progressbar')).toBeNull()
  })

  it('filtra por desbloqueadas e bloqueadas', async () => {
    const user = userEvent.setup()
    abrirMetas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    await screen.findByText('Primeiro treino')
    expect(screen.getByRole('button', { name: 'Todas (4)' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Bloqueadas (2)' }))
    expect([...document.querySelectorAll('.conquista .conquista-texto strong')].map((e) => e.textContent)).toEqual(['Constância', 'Centenário'])

    await user.click(screen.getByRole('button', { name: 'Desbloqueadas (2)' }))
    expect([...document.querySelectorAll('.conquista .conquista-texto strong')].map((e) => e.textContent)).toEqual(['Primeiro treino', 'Embalado'])
  })

  it('toda conquista do catálogo do servidor tem um ícone próprio', async () => {
    const { ICONE_CONQUISTA } = await import('./ListaConquistas')
    const ids = ['primeira-sessao', '10-sessoes', '50-sessoes', '100-sessoes', '3-dias', '7-dias', '30-dias', '10-horas', '100-num-dia', '1000-cestas', 'sequencia-10', 'sequencia-25', 'teste-fisico']
    for (const id of ids) expect(ICONE_CONQUISTA[id], id).toBeDefined()
    expect(new Set(ids.map((id) => ICONE_CONQUISTA[id])).size).toBe(ids.length)
  })
})

describe('Conquistas', () => {
  it('cria meta de aproveitamento de um exercício com título automático', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirMetas({ 'POST /goals': ecoarMeta })
    await user.click(await screen.findByRole('button', { name: '+ Nova meta' }))

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Aproveitamento nos últimos 30 dias')
    const alvo = screen.getByLabelText('Alvo (%)')
    await user.clear(alvo)
    await user.type(alvo, '40')
    // Só exercícios de arremesso entram na lista.
    const exercicio = screen.getByLabelText('Exercício (opcional)')
    expect(within(exercicio).queryByRole('option', { name: 'Suicídio' })).toBeNull()
    await user.selectOptions(exercicio, 'Lance livre')
    await user.click(screen.getByRole('button', { name: 'Criar meta' }))

    expect(ultima('POST', '/goals')?.corpo).toEqual({
      title: 'Aproveitamento nos últimos 30 dias: 40% (Lance livre)',
      kind: 'aproveitamento',
      target: 40,
      exerciseId: 1,
      deadline: null,
    })
    expect(await screen.findByText('Aproveitamento nos últimos 30 dias: 40% (Lance livre)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Criar meta' })).toBeNull()
  })

  it('não envia o exercício escolhido quando o tipo mudou para um que não aceita exercício', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirMetas({ 'POST /goals': ecoarMeta })
    await user.click(await screen.findByRole('button', { name: '+ Nova meta' }))

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Cestas a partir de hoje')
    await user.selectOptions(screen.getByLabelText('Exercício (opcional)'), 'Lance livre')
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Sessões por semana')
    await user.click(screen.getByRole('button', { name: 'Criar meta' }))

    expect(ultima('POST', '/goals')?.corpo).toMatchObject({ kind: 'sessoes_semana', target: 3, exerciseId: null, title: 'Sessões por semana: 3 sessões' })
  })

  it('não envia alvo zero, fracionado ou aproveitamento acima de 100%', async () => {
    const user = userEvent.setup()
    const { chamadas } = abrirMetas()
    await user.click(await screen.findByRole('button', { name: '+ Nova meta' }))
    const alvo = screen.getByLabelText('Alvo (sessões)')

    for (const valor of ['0', '2.5']) {
      await user.clear(alvo)
      await user.type(alvo, valor)
      expect(alvo).toBeInvalid()
      await user.click(screen.getByRole('button', { name: 'Criar meta' }))
    }

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Aproveitamento nos últimos 30 dias')
    await user.clear(screen.getByLabelText('Alvo (%)'))
    await user.type(screen.getByLabelText('Alvo (%)'), '101')
    expect(screen.getByLabelText('Alvo (%)')).toBeInvalid()
    await user.click(screen.getByRole('button', { name: 'Criar meta' }))
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
  })

  it('mostra o erro do servidor e mantém o formulário preenchido', async () => {
    const user = userEvent.setup()
    abrirMetas({ 'POST /goals': new Resposta(400, { error: 'Exercício 1 não existe' }) })
    await user.click(await screen.findByRole('button', { name: '+ Nova meta' }))
    await user.type(screen.getByLabelText('Título (opcional)'), 'Minha meta')
    await user.click(screen.getByRole('button', { name: 'Criar meta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Exercício 1 não existe')
    expect(screen.getByLabelText('Título (opcional)')).toHaveValue('Minha meta')
    expect(screen.getByRole('button', { name: 'Criar meta' })).toBeEnabled()
  })

  it('marca prazo vencido só nas metas não concluídas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-28T10:00:00-03:00'))
    abrirMetas({
      'GET /goals': [
        meta({ id: 1, title: 'Atrasada', deadline: '2026-10-27' }),
        meta({ id: 2, title: 'Cumprida', deadline: '2026-10-27', current: 3, achieved: true }),
        meta({ id: 3, title: 'Vence hoje', deadline: '2026-10-28' }),
      ],
    })
    const item = async (titulo: string) => (await screen.findByText(new RegExp(titulo))).closest('li') as HTMLElement

    expect(await item('Atrasada')).toHaveTextContent('prazo vencido')
    expect(await item('Cumprida')).not.toHaveTextContent('prazo vencido')
    expect(await item('Cumprida')).toHaveTextContent('Meta cumprida: Cumprida')
    expect(await item('Vence hoje')).not.toHaveTextContent('prazo vencido')
  })

  it('só exclui a meta depois de confirmar', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { chamadas } = abrirMetas({ 'GET /goals': [meta({})], 'DELETE /goals/1': new Resposta(204) })
    const excluir = await screen.findByRole('button', { name: 'Excluir meta Treinar 3x' })

    await user.click(excluir)
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)

    confirmar.mockReturnValue(true)
    await user.click(excluir)
    expect(await screen.findByText(/Nenhuma meta ainda/)).toBeInTheDocument()
    expect(chamadas.filter((c) => c.metodo === 'DELETE').map((c) => c.caminho)).toEqual(['/goals/1'])
  })
})

describe('Testes físicos', () => {
  const resultado = (id: number, kind: string, value: number, dia: string) => ({ id, kind, value, performedAt: `${dia}T15:00:00.000Z`, notes: null })

  it('marca como recorde o menor tempo quando menor é melhor', async () => {
    const user = userEvent.setup()
    abrirMetas({
      'GET /tests': [resultado(1, 'sprint', 4.8, '2026-10-20'), resultado(2, 'sprint', 4.5, '2026-09-20'), resultado(3, 'impulsao', 50, '2026-10-01')],
    })
    await user.click(await screen.findByRole('button', { name: 'Sprint de quadra inteira' }))

    expect(screen.getByText('Quanto menor, melhor.')).toBeInTheDocument()
    expect(screen.getByText(/Melhor marca:/)).toHaveTextContent('4,5 s')
    const recorde = screen.getByText('recorde').closest('li') as HTMLElement
    expect(recorde).toHaveTextContent('4,5 s')
  })

  it('com resultados empatados, marca como recorde só o primeiro que chegou nele', async () => {
    abrirMetas({
      'GET /tests': [resultado(7, 'impulsao', 61.5, '2026-10-25'), resultado(6, 'impulsao', 58, '2026-10-10'), resultado(5, 'impulsao', 61.5, '2026-10-01')],
    })
    expect(await screen.findByText(/Melhor marca:/)).toHaveTextContent('61,5 cm')
    const recordes = screen.getAllByText('recorde')
    expect(recordes).toHaveLength(1)
    expect(recordes[0].closest('li')).toHaveTextContent('1 de out.')
  })

  it('aceita vírgula decimal e grava ao meio-dia local do dia escolhido', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirMetas({
      'POST /tests': (corpo) => ({ id: 5, ...(corpo as object), notes: null }),
    })
    const valor = await screen.findByLabelText('Impulsão vertical (cm)')
    await user.type(valor, '55,5')
    const data = screen.getByLabelText('Data')
    await user.clear(data)
    await user.type(data, '2026-10-20')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    // 12h em São Paulo = 15h UTC: o dia não muda ao converter.
    expect(ultima('POST', '/tests')?.corpo).toEqual({ kind: 'impulsao', value: 55.5, performedAt: '2026-10-20T15:00:00.000Z', notes: null })
    expect(await screen.findByText(/Melhor marca:/)).toHaveTextContent('55,5 cm')
    expect(valor).toHaveValue('')
  })

  it('recusa valor zero ou que não é número', async () => {
    const user = userEvent.setup()
    const { chamadas } = abrirMetas()
    const valor = await screen.findByLabelText('Impulsão vertical (cm)')
    for (const digitado of ['0', 'abc']) {
      await user.clear(valor)
      await user.type(valor, digitado)
      await user.click(screen.getByRole('button', { name: 'Registrar' }))
      expect(screen.getByRole('alert')).toHaveTextContent('Digite um valor maior que zero.')
    }
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
  })
})
