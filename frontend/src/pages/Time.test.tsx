import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

const catalogo = [
  { id: 1, name: 'Lance livre', category: 'arremesso', metric: 'acertos', description: null, custom: false },
  { id: 2, name: 'Mikan drill', category: 'finalizacao', metric: 'acertos', description: null, custom: false },
  { id: 3, name: 'Meu drill', category: 'drible', metric: 'tempo', description: null, custom: true },
]
const programas = [{ id: 'mao-fraca-4', name: 'Mão fraca em 4 semanas', summary: '', level: 'iniciante', focus: 'Drible', totalDays: 28, minutesPerDay: 20, status: { started: false, total: 28, done: 0 } }]
const progresso = (extra: object = {}) => ({ sessionsWeek: 3, minutesWeek: 75, lastSessionAt: '2026-11-09T12:00:00Z', streak: 2, card: { month: '2026-11', overall: 54 }, tasks: [], ...extra })
const tarefaTreino = { id: 5, kind: 'treino', programId: null, programName: null, title: 'Finalização de sexta', blocks: [{ exerciseId: 2, name: 'Mikan drill', category: 'finalizacao', metric: 'acertos', minutes: 10 }], dueOn: '2026-11-14', notes: 'Capricha na mão fraca' }
const tarefaPrograma = { id: 6, kind: 'programa', programId: 'mao-fraca-4', programName: 'Mão fraca em 4 semanas', title: 'Mão fraca até o campeonato', blocks: [], dueOn: null, notes: null }

const timeTecnico = {
  id: 9,
  name: 'Sub-17',
  role: 'tecnico',
  coachName: 'Marina Silva',
  inviteCode: 'cod123abc',
  assignments: [tarefaTreino],
  members: [
    { id: 20, name: 'Caio', joinedAt: '2026-11-01T12:00:00Z', progress: progresso({ sessionsWeek: 1, tasks: [{ assignmentId: 5, started: false, done: 0, total: 1, completed: false }] }) },
    { id: 21, name: 'Lia', joinedAt: '2026-11-01T12:00:00Z', progress: progresso({ tasks: [{ assignmentId: 5, started: true, done: 1, total: 1, completed: true }] }) },
  ],
}

const timeAtleta = {
  id: 9,
  name: 'Sub-17',
  role: 'atleta',
  coachName: 'Rosa',
  assignments: [tarefaTreino, tarefaPrograma],
  progress: progresso({ tasks: [{ assignmentId: 5, started: false, done: 0, total: 1, completed: false }, { assignmentId: 6, started: true, done: 3, total: 28, completed: false }] }),
}

function abrir(caminho: string, rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': catalogo,
    'GET /programs': programas,
    'GET /teams': { coaching: [{ id: 9, name: 'Sub-17', members: 2 }], member: [{ id: 4, name: 'Escolinha', coachName: 'Rosa' }] },
    'GET /teams/9': timeTecnico,
    ...rotas,
  })
  abrirApp(caminho)
  return api
}

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('Modo técnico', () => {
  it('lista os times nos dois papéis e cria um time novo', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/time', { 'POST /teams': new Resposta(201, { id: 9, name: 'Sub-17' }) })
    expect(await screen.findByText('2 atletas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Escolinha/ })).toHaveAttribute('href', '/time/4')
    await user.type(screen.getByLabelText('Nome do time'), 'Sub-17')
    await user.click(screen.getByRole('button', { name: 'Criar time' }))
    expect(ultima('POST', '/teams')?.corpo).toEqual({ name: 'Sub-17' })
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/time/9'))
  })

  it('o técnico vê o código, o progresso de cada atleta e quem cumpriu a tarefa', async () => {
    abrir('/time/9')
    expect(await screen.findByText('cod123abc')).toBeInTheDocument()
    expect(screen.getByText(/time\/entrar\/cod123abc$/)).toBeInTheDocument()
    const lia = screen.getByRole('heading', { name: 'Lia' }).closest('li')!
    expect(lia).toHaveTextContent('3 treinos em 7 dias')
    expect(lia).toHaveTextContent('54 nota do cartão')
    expect(lia).toHaveTextContent('Finalização de sexta: feito')
    // Quem treinou mais na semana aparece primeiro.
    const nomes = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(nomes.indexOf('Lia')).toBeLessThan(nomes.indexOf('Caio'))
    expect(screen.getByText('1 de 2 cumpriram')).toBeInTheDocument()
  })

  it('o técnico passa um treino com exercícios do catálogo', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/time/9', { 'POST /teams/9/assignments': new Resposta(201, tarefaTreino) })
    await screen.findByText('cod123abc')
    const exercicios = (await within(screen.getByLabelText('Exercício')).findAllByRole('option')).map((o) => o.textContent)
    expect(exercicios).toEqual(['Lance livre', 'Mikan drill'])
    await user.selectOptions(screen.getByLabelText('Exercício'), 'Mikan drill')
    await user.clear(screen.getByLabelText('Minutos'))
    await user.type(screen.getByLabelText('Minutos'), '15')
    await user.click(screen.getByRole('button', { name: '+ Adicionar exercício' }))
    await user.type(screen.getByLabelText(/^Título/), 'Bandejas')
    await user.click(screen.getByRole('button', { name: 'Passar para o time' }))
    expect(ultima('POST', '/teams/9/assignments')?.corpo).toMatchObject({ kind: 'treino', title: 'Bandejas', blocks: [{ exerciseId: 2, minutes: 15 }] })
  })

  it('o atleta vê as tarefas, o progresso no programa e marca o treino como feito', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/time/9', {
      'GET /teams/9': timeAtleta,
      'POST /teams/9/assignments/5/done': new Resposta(201, { done: true }),
    })
    expect(await screen.findByText('3 de 28 dias')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar o programa' })).toHaveAttribute('href', '/programas/mao-fraca-4')
    expect(screen.getByText('Capricha na mão fraca')).toBeInTheDocument()
    expect(screen.queryByText('cod123abc')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Já treinei, marcar como feito' }))
    expect(ultima('POST', '/teams/9/assignments/5/done')?.corpo).toEqual({ sessionId: null })
  })

  it('o link do técnico explica o que ele vai ver e coloca o atleta no time', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir('/time/entrar/cod123abc', {
      'GET /teams/invites/cod123abc': { id: 9, name: 'Sub-17', coachName: 'Rosa', coach: false, member: false },
      'POST /teams/join': new Resposta(201, { id: 9, name: 'Sub-17' }),
      'GET /teams/9': timeAtleta,
    })
    expect(await screen.findByText(/o técnico passa a ver os seus treinos da semana/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entrar no time' }))
    expect(ultima('POST', '/teams/join')?.corpo).toEqual({ code: 'cod123abc' })
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/time/9'))
  })
})
