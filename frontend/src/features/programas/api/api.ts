import { fuso, request } from '../../../shared/api/backend'
import { invalidar, useRecurso } from '../../../shared/data/recursos'
import type { BlocoPlano, Metrica, Nivel } from '../../../shared/types'

import { CATEGORIA } from '../../../shared/api/mapeamento'

export interface StatusPrograma {
  comecado: boolean
  total: number
  feitos: number
  concluido?: boolean
  proximoDia?: number | null
  disponivelHoje?: boolean
}

export interface ResumoPrograma {
  id: string
  nome: string
  resumo: string
  nivel: Nivel
  foco: string
  totalDias: number
  minutosPorDia: number
  status: StatusPrograma
}

export interface DiaPrograma {
  dia: number
  titulo: string
  estado: 'done' | 'available' | 'tomorrow' | 'locked'
  feitoEm: string | null
  blocos: BlocoPlano[]
}

export interface Programa extends ResumoPrograma {
  dias: DiaPrograma[]
}

interface StatusApi {
  started: boolean
  total: number
  done: number
  finished?: boolean
  nextDay?: number | null
  availableToday?: boolean
}

interface ProgramaApi {
  id: string
  name: string
  summary: string
  level: Nivel
  focus: string
  totalDays: number
  minutesPerDay: number
  status: StatusApi
  days?: { day: number; title: string; state: DiaPrograma['estado']; doneOn: string | null; blocks: { exerciseId: number; name: string; category: string; metric: Metrica; minutes: number }[] }[]
}

const paraStatus = (s: StatusApi): StatusPrograma => ({
  comecado: s.started,
  total: s.total,
  feitos: s.done,
  concluido: s.finished,
  proximoDia: s.nextDay,
  disponivelHoje: s.availableToday,
})

const paraResumo = (p: ProgramaApi): ResumoPrograma => ({
  id: p.id,
  nome: p.name,
  resumo: p.summary,
  nivel: p.level,
  foco: p.focus,
  totalDias: p.totalDays,
  minutosPorDia: p.minutesPerDay,
  status: paraStatus(p.status),
})

export const apiProgramas = {
  async lista(signal?: AbortSignal) {
    return (await request<ProgramaApi[]>('GET', `/programs?${fuso()}`, undefined, { signal })).map(paraResumo)
  },
  async detalhe(id: string, signal?: AbortSignal): Promise<Programa> {
    const p = await request<ProgramaApi>('GET', `/programs/${encodeURIComponent(id)}?${fuso()}`, undefined, { signal })
    return {
      ...paraResumo(p),
      dias: (p.days ?? []).map((d) => ({
        dia: d.day,
        titulo: d.title,
        estado: d.state,
        feitoEm: d.doneOn,
        blocos: d.blocks.map((b) => ({ drillId: String(b.exerciseId), nome: b.name, categoria: CATEGORIA[b.category] ?? 'Condicionamento', metrica: b.metric, minutos: b.minutes })),
      })),
    }
  },
  async comecar(id: string) {
    await request('POST', `/programs/${encodeURIComponent(id)}/start?${fuso()}`)
    invalidar('programa')
  },
  async concluirDia(id: string, dia: number, sessaoId?: string) {
    await request('POST', `/programs/${encodeURIComponent(id)}/days/${dia}/complete?${fuso()}`, { sessionId: sessaoId ? Number(sessaoId) : null })
    invalidar('programa')
  },
  async sair(id: string) {
    await request('DELETE', `/programs/${encodeURIComponent(id)}`)
    invalidar('programa')
  },
}

export function useProgramas() {
  const { dados, ...resto } = useRecurso('programas', apiProgramas.lista)
  return { programas: dados, ...resto }
}

export function usePrograma(id: string) {
  const { dados, ...resto } = useRecurso(`programa:${id}`, (signal) => apiProgramas.detalhe(id, signal))
  return { programa: dados, ...resto }
}
