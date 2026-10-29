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

function abrirMetas(rotas: Parameters<typeof apiFalsa>[0] = {}) {
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
  abrirApp('/metas')
  return api
}

/** Devolve a meta criada como o backend faria, ecoando o que a página enviou. */
const ecoarMeta = (corpo: unknown) => {
  const c = corpo as { title: string; kind: string; target: number; exerciseId: number | null; deadline: string | null }
  return meta({ id: 9, title: c.title, kind: c.kind, target: c.target, current: 0, exerciseId: c.exerciseId, deadline: c.deadline })
}

describe('Metas', () => {
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
    expect(await item('Cumprida')).toHaveTextContent('✅')
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
