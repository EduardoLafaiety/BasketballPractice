import type {
  BlocoPlano,
  Categoria,
  Config,
  DiaSemana,
  Drill,
  Nivel,
  Estilo,
  EstiloResumo,
  Metrica,
  NovaSessao,
  Rotina,
  Sessao,
} from '../types'
import type { ComparacaoEvolucao } from '../../../../contracts/evolucao'


import { request, ApiError } from './http'
export { ApiError, tokenAtual, contaLocal, definirToken, aoTokenExpirar, request } from './http'

// ---------- Contratos do backend ----------

export type { Usuario, UsuarioAdmin, AuthResposta, ResultadoImportacao } from '../../../../contracts/api'
import type { Usuario, UsuarioAdmin, AuthResposta, ResultadoImportacao, ProgressSessionApi, ExerciseApi, SessionApi, SettingsApi, WorkoutApi, WorkoutResumoApi, EstiloResumoApi, EstiloApi, ExercicioEstiloApi } from '../../../../contracts/api'
import { CATEGORIA, CATEGORIA_API, paraDrill, paraSessao, paraProgresso, paraConfig, paraEstiloResumo } from './mapeamento'

// ---------- Mapeamento backend → frontend ----------

/** Data local no formato AAAA-MM-DD. */
export function dataLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Fuso do navegador, para o backend contar dias e semanas no horário local do atleta.
export const fuso = () => `tzOffset=${new Date().getTimezoneOffset()}`

// ---------- Endpoints ----------

export const api = {
  comparacao: (dias: number, exercicio = '', signal?: AbortSignal) => request<ComparacaoEvolucao>('GET', `/sessions/comparison?${fuso()}&days=${dias}${exercicio ? `&exerciseId=${encodeURIComponent(exercicio)}` : ''}`, undefined, { signal }),
  cadastrar: (nome: string, email: string, senha: string) =>
    request<{ message: string }>('POST', '/auth/register', { name: nome, email, password: senha }),

  confirmarConta: (token: string, senha: string) => request<AuthResposta>('POST', '/auth/confirm', { token, password: senha }),

  esqueciSenha: (email: string) => request<{ message: string }>('POST', '/auth/forgot-password', { email }),

  redefinirSenha: (token: string, senha: string) => request<AuthResposta>('POST', '/auth/reset-password', { token, password: senha }),

  trocarSenha: (atual: string, nova: string) =>
    request<AuthResposta>('PUT', '/auth/password', { currentPassword: atual, newPassword: nova }),

  excluirConta: (senha: string) => request<null>('DELETE', '/auth/me', { password: senha }),

  sair: () => request<null>('POST', '/auth/logout'),

  entrar: (email: string, senha: string) => request<AuthResposta>('POST', '/auth/login', { email, password: senha }),

  eu: () => request<Usuario>('GET', '/auth/me'),

  usuariosAdmin: () => request<UsuarioAdmin[]>('GET', '/admin/users'),
  definirAdmin: (id: number, isAdmin: boolean) => request<UsuarioAdmin>('PATCH', `/admin/users/${id}`, { isAdmin }),
  excluirUsuario: (id: number) => request<null>('DELETE', `/admin/users/${id}`),

  async drills(signal?: AbortSignal) {
    return (await request<ExerciseApi[]>('GET', '/exercises', undefined, { signal })).map(paraDrill)
  },

  async salvarDrill(d: Pick<Drill, 'nome' | 'categoria' | 'metrica' | 'descricao'>, id?: string) {
    const corpo = { name: d.nome, category: CATEGORIA_API[d.categoria], metric: d.metrica, description: d.descricao || null }
    const salvo = id
      ? await request<ExerciseApi>('PUT', `/exercises/${id}`, corpo)
      : await request<ExerciseApi>('POST', '/exercises', corpo)
    return paraDrill(salvo)
  },

  removerDrill: (id: string) => request<null>('DELETE', `/exercises/${id}`),

  async sessoes(signal?: AbortSignal): Promise<Sessao[]> {
    // A listagem já traz notas, entries e arremessos por zona de cada sessão.
    return (await request<SessionApi[]>('GET', '/sessions?limit=50', undefined, { signal })).map(paraSessao)
  },

  /** Histórico completo, página por página (para exportar em CSV). */
  async todasSessoes(signal?: AbortSignal): Promise<Sessao[]> {
    const todas: Sessao[] = []
    for (let offset = 0; ; offset += 200) {
      const pagina = await request<SessionApi[]>('GET', `/sessions?limit=200&offset=${offset}`, undefined, { signal })
      todas.push(...pagina.map(paraSessao))
      if (pagina.length < 200) return todas
    }
  },

  async paginaSessoes(pagina: number, signal?: AbortSignal) {
    return (await request<SessionApi[]>('GET', `/sessions?limit=21&offset=${pagina * 20}`, undefined, { signal })).map(paraSessao)
  },

  async sessoesProgresso(signal?: AbortSignal): Promise<Sessao[]> {
    const todas: Sessao[] = []
    try {
      for (let offset = 0; ; offset += 200) {
        const pagina = await request<ProgressSessionApi[]>('GET', `/sessions/progress?limit=200&offset=${offset}`, undefined, { signal })
        todas.push(...pagina.map(paraProgresso))
        if (pagina.length < 200) return todas
      }
    } catch (erro) {
      // Compatibilidade durante a atualização gradual da API e da demonstração.
      if (erro instanceof ApiError && erro.status === 404) return api.todasSessoes(signal)
      throw erro
    }
  },

  async registrarSessao(s: NovaSessao) {
    const criada = await request<SessionApi>('POST', '/sessions', {
      clientId: s.clientId,
      program: s.programa ? { id: s.programa.id, day: s.programa.dia } : undefined,
      tzOffset: s.tzOffset ?? (s.programa ? new Date().getTimezoneOffset() : undefined),
      workoutId: s.workoutId ?? null,
      performedAt: s.data,
      durationMinutes: s.duracaoMin || null,
      rating: s.esforco ?? null,
      fatigue: s.cansaco ?? null,
      notes: s.notas ?? null,
      entries: s.entradas.map((e) => ({
        exerciseId: Number(e.drillId),
        makes: e.acertos ?? null,
        attempts: e.tentativas ?? null,
        reps: e.repeticoes ?? null,
        seconds: e.segundos ?? null,
        bestStreak: e.sequencia ?? null,
      })),
      shots: (s.zonas ?? [])
        .filter((z) => z.tentativas > 0)
        .map((z) => ({ zone: z.zona, makes: z.acertos, attempts: z.tentativas })),
    })
    return paraSessao(criada)
  },

  removerSessao: (id: string) => request<null>('DELETE', `/sessions/${id}`),

  async config(signal?: AbortSignal) {
    return paraConfig(await request<SettingsApi>('GET', '/settings', undefined, { signal }))
  },

  async salvarConfig(c: Config) {
    const salvo = await request<SettingsApi>('PUT', '/settings', {
      theme: c.tema,
      reminders: { enabled: c.lembretes.ativo, time: c.lembretes.horario, days: c.lembretes.dias },
      metronomeBpm: c.metronomoBpm,
    })
    return paraConfig(salvo)
  },

  async gerarTreino(minutos: number, foco: Categoria[], aquecimento: boolean, semente?: number, nivel?: Nivel, evitar: string[] = []) {
    const r = await request<{
      minutes: number
      blocks: { exerciseId: number; name: string; category: string; metric: Metrica; minutes: number }[]
    }>('POST', '/plans/generate', {
      minutes: minutos,
      focus: foco.map((c) => CATEGORIA_API[c]),
      warmup: aquecimento,
      seed: semente,
      level: nivel,
      // Os exercícios já usados nos outros dias da semana: só voltam se a categoria não tiver outro.
      exclude: evitar.length ? evitar.map(Number) : undefined,
    })
    return r.blocks.map(
      (b): BlocoPlano => ({
        drillId: String(b.exerciseId),
        nome: b.name,
        categoria: CATEGORIA[b.category] ?? 'Condicionamento',
        metrica: b.metric,
        minutos: b.minutes,
      }),
    )
  },

  async estilos(signal?: AbortSignal): Promise<EstiloResumo[]> {
    return (await request<EstiloResumoApi[]>('GET', '/styles', undefined, { signal })).map(paraEstiloResumo)
  },

  async estilo(id: string, signal?: AbortSignal): Promise<Estilo> {
    const r = await request<EstiloApi>('GET', `/styles/${encodeURIComponent(id)}`, undefined, { signal })
    const bloco = (b: ExercicioEstiloApi) => ({
      drillId: String(b.exerciseId),
      nome: b.name,
      categoria: CATEGORIA[b.category] ?? 'Condicionamento',
      metrica: b.metric,
    })
    return {
      ...paraEstiloResumo(r),
      alturaCm: r.heightCm,
      ritmo: r.pace,
      resumo: r.summary,
      mentalidade: r.mindset,
      movimentos: r.moves.map((m) => ({
        nome: m.name,
        descricao: m.description,
        dica: m.tip,
        dose: m.dose,
        minutos: m.minutes,
        exercicio: m.exercise ? bloco(m.exercise) : null,
      })),
      sessao: r.session.map((b) => ({ ...bloco(b), minutos: b.minutes, dose: b.dose })),
    }
  },

  exportar: () => request<unknown>('GET', '/data/export'),

  importar: (dados: unknown) => request<ResultadoImportacao>('POST', '/data/import', dados),

  // A rotina semanal vira um modelo de treino (/workouts) por dia da semana,
  // identificado pela descrição "bp-rotina:<dia>".
  async rotina(signal?: AbortSignal): Promise<{ rotina: Rotina; ids: Partial<Record<DiaSemana, number>>; duracoes: Record<DiaSemana, number[]> }> {
    const rotina: Rotina = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    const duracoes = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } as Record<DiaSemana, number[]>
    const ids: Partial<Record<DiaSemana, number>> = {}
    const lista = await request<WorkoutResumoApi[]>('GET', '/workouts', undefined, { signal })
    const dosDias = lista.filter((w) => diaDaRotina(w.description) !== null)
    const completos = await Promise.all(dosDias.map((w) => request<WorkoutApi>('GET', `/workouts/${w.id}`, undefined, { signal })))
    for (const w of completos) {
      const dia = diaDaRotina(w.description)!
      if (ids[dia] !== undefined) continue // duplicado: fica o mais recente
      ids[dia] = w.id
      rotina[dia] = w.exercises.map((e) => String(e.exerciseId))
      duracoes[dia] = w.exercises.map((e) => e.targetSeconds ? Math.max(1, Math.round(e.targetSeconds / 60)) : 10)
    }
    return { rotina, ids, duracoes }
  },

  async salvarSemana(rotina: Rotina, duracoes: Partial<Record<DiaSemana, number[]>>, ids: Partial<Record<DiaSemana, number>>) {
    const days = ([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).map((day) => ({ day, exercises: rotina[day].map((id, i) => ({ exerciseId: Number(id), minutes: duracoes[day]?.[i] ?? 10 })) }))
    try { return (await request<{ ids: Partial<Record<DiaSemana, number>> }>('PUT', '/routine', { days })).ids }
    catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e
      const result = { ...ids }
      for (const { day } of days) result[day] = await api.salvarDia(day, ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day], rotina[day], ids[day], duracoes[day])
      return result
    }
  },

  async salvarDia(dia: DiaSemana, nomeDia: string, drillIds: string[], workoutId?: number, duracoes?: number[]) {
    const corpo = {
      name: `Rotina de ${nomeDia.toLowerCase()}`,
      description: `${PREFIXO_ROTINA}${dia}`,
      exercises: drillIds.map((id, i) => ({ exerciseId: Number(id), ...(duracoes?.[i] && duracoes[i] !== 10 ? { targetSeconds: duracoes[i] * 60 } : {}) })),
    }
    const salvo = workoutId
      ? await request<WorkoutApi>('PUT', `/workouts/${workoutId}`, corpo)
      : await request<WorkoutApi>('POST', '/workouts', corpo)
    return salvo.id
  },
}

const PREFIXO_ROTINA = 'bp-rotina:'

function diaDaRotina(descricao: string | null): DiaSemana | null {
  const m = descricao?.match(/^bp-rotina:([0-6])$/)
  return m ? (Number(m[1]) as DiaSemana) : null
}
