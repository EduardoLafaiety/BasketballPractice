import { fuso, request } from '../api'
import { invalidar, useRecurso } from '../store'
import type { BlocoPlano, Categoria, Metrica } from '../types'

const CATEGORIA: Record<string, Categoria> = {
  arremesso: 'Arremesso',
  drible: 'Drible',
  passe: 'Passe',
  finalizacao: 'Finalização',
  defesa: 'Defesa',
  condicionamento: 'Condicionamento',
}

export interface ResumoTimes {
  comoTecnico: { id: number; nome: string; atletas: number }[]
  comoAtleta: { id: number; nome: string; tecnico: string }[]
}

export interface Tarefa {
  id: number
  tipo: 'programa' | 'treino'
  programaId: string | null
  programaNome: string | null
  titulo: string
  blocos: BlocoPlano[]
  prazo: string | null
  notas: string | null
}

export interface ProgressoTarefa {
  tarefaId: number
  comecou: boolean
  feitos: number
  total: number
  cumprida: boolean
}

export interface ProgressoAtleta {
  sessoesSemana: number
  minutosSemana: number
  ultimoTreino: string | null
  sequencia: number
  cartao: { mes: string; geral: number | null } | null
  tarefas: ProgressoTarefa[]
}

export interface Time {
  id: number
  nome: string
  papel: 'tecnico' | 'atleta'
  tecnico: string
  convite?: string
  tarefas: Tarefa[]
  atletas?: { id: number; nome: string; desde: string; progresso: ProgressoAtleta }[]
  progresso?: ProgressoAtleta
}

interface ProgressApi {
  sessionsWeek: number
  minutesWeek: number
  lastSessionAt: string | null
  streak: number
  card: { month: string; overall: number | null } | null
  tasks: { assignmentId: number; started: boolean; done: number; total: number; completed: boolean }[]
}

interface AssignmentApi {
  id: number
  kind: 'programa' | 'treino'
  programId: string | null
  programName: string | null
  title: string
  blocks: { exerciseId: number; name: string; category: string; metric: Metrica; minutes: number }[]
  dueOn: string | null
  notes: string | null
}

interface TeamApi {
  id: number
  name: string
  role: 'tecnico' | 'atleta'
  coachName: string
  inviteCode?: string
  assignments: AssignmentApi[]
  members?: { id: number; name: string; joinedAt: string; progress: ProgressApi }[]
  progress?: ProgressApi
}

const paraProgresso = (p: ProgressApi): ProgressoAtleta => ({
  sessoesSemana: p.sessionsWeek,
  minutosSemana: p.minutesWeek,
  ultimoTreino: p.lastSessionAt,
  sequencia: p.streak,
  cartao: p.card ? { mes: p.card.month, geral: p.card.overall } : null,
  tarefas: p.tasks.map((t) => ({ tarefaId: t.assignmentId, comecou: t.started, feitos: t.done, total: t.total, cumprida: t.completed })),
})

const paraTarefa = (a: AssignmentApi): Tarefa => ({
  id: a.id,
  tipo: a.kind,
  programaId: a.programId,
  programaNome: a.programName,
  titulo: a.title,
  blocos: a.blocks.map((b) => ({ drillId: String(b.exerciseId), nome: b.name, categoria: CATEGORIA[b.category] ?? 'Condicionamento', metrica: b.metric, minutos: b.minutes })),
  prazo: a.dueOn,
  notas: a.notes,
})

export const apiTime = {
  async lista(): Promise<ResumoTimes> {
    const r = await request<{ coaching: { id: number; name: string; members: number }[]; member: { id: number; name: string; coachName: string }[] }>('GET', '/teams')
    return {
      comoTecnico: r.coaching.map((t) => ({ id: t.id, nome: t.name, atletas: t.members })),
      comoAtleta: r.member.map((t) => ({ id: t.id, nome: t.name, tecnico: t.coachName })),
    }
  },
  async detalhe(id: number): Promise<Time> {
    const t = await request<TeamApi>('GET', `/teams/${id}?${fuso()}`)
    return {
      id: t.id,
      nome: t.name,
      papel: t.role,
      tecnico: t.coachName,
      convite: t.inviteCode,
      tarefas: t.assignments.map(paraTarefa),
      atletas: t.members?.map((m) => ({ id: m.id, nome: m.name, desde: m.joinedAt, progresso: paraProgresso(m.progress) })),
      progresso: t.progress ? paraProgresso(t.progress) : undefined,
    }
  },
  async criar(nome: string) {
    const t = await request<{ id: number }>('POST', '/teams', { name: nome })
    invalidar('time')
    return t.id
  },
  convite: async (codigo: string) => {
    const r = await request<{ id: number; name: string; coachName: string; coach: boolean; member: boolean }>('GET', `/teams/invites/${encodeURIComponent(codigo)}`)
    return { id: r.id, nome: r.name, tecnico: r.coachName, souTecnico: r.coach, jaAtleta: r.member }
  },
  async entrar(codigo: string) {
    const r = await request<{ id: number }>('POST', '/teams/join', { code: codigo })
    invalidar('time')
    return r.id
  },
  async novoConvite(id: number) {
    await request('POST', `/teams/${id}/invite`)
    invalidar('time')
  },
  async apagar(id: number) {
    await request('DELETE', `/teams/${id}`)
    invalidar('time')
  },
  async tirar(id: number, atletaId: number) {
    await request('DELETE', `/teams/${id}/members/${atletaId}`)
    invalidar('time')
  },
  async atribuir(id: number, t: { tipo: 'programa' | 'treino'; programaId?: string; titulo: string; blocos?: { drillId: string; minutos: number }[]; prazo?: string; notas?: string }) {
    await request('POST', `/teams/${id}/assignments`, {
      kind: t.tipo,
      programId: t.tipo === 'programa' ? t.programaId : null,
      title: t.titulo,
      blocks: (t.blocos ?? []).map((b) => ({ exerciseId: Number(b.drillId), minutes: b.minutos })),
      dueOn: t.prazo || null,
      notes: t.notas?.trim() || null,
    })
    invalidar('time')
  },
  async removerTarefa(id: number, tarefaId: number) {
    await request('DELETE', `/teams/${id}/assignments/${tarefaId}`)
    invalidar('time')
  },
  async concluirTarefa(id: number, tarefaId: number, sessaoId?: string) {
    await request('POST', `/teams/${id}/assignments/${tarefaId}/done`, { sessionId: sessaoId ? Number(sessaoId) : null })
    invalidar('time')
  },
}

export const useTimes = () => {
  const { dados, ...resto } = useRecurso('time:lista', apiTime.lista)
  return { times: dados, ...resto }
}

export const useTime = (id: number) => {
  const { dados, ...resto } = useRecurso(`time:${id}`, () => apiTime.detalhe(id))
  return { time: dados, ...resto }
}

export const linkDoTime = (codigo: string) => `${window.location.origin}${import.meta.env.BASE_URL}time/entrar/${codigo}`
