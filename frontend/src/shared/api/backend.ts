import type {
  BlocoPlano,
  Categoria,
  Config,
  DiaSemana,
  Drill,
  Nivel,
  Estilo,
  EstiloResumo,
  FatiaEstilo,
  Metrica,
  Posicao,
  NovaSessao,
  Rotina,
  Sessao,
  Zona,
} from '../types'
import type { ComparacaoEvolucao } from '../../../../contracts/evolucao'


import { request, ApiError } from './http'
export { ApiError, tokenAtual, contaLocal, definirToken, aoTokenExpirar, request } from './http'

// ---------- Contratos do backend ----------

type Num = number | string | null // agregados do Postgres podem vir como texto

export interface Usuario {
  id: number
  name: string
  email: string
  isAdmin: boolean
}

/** Conta vista pelo painel admin, com o resumo de uso. */
export interface UsuarioAdmin extends Usuario {
  createdAt: string
  workouts: number
  sessions: number
  lastSessionAt: string | null
}

/** Manchete da barra de notícias: automática (GNews) ou escrita por um admin (selo "Urgente"). */

export interface AuthResposta {
  token: string
  user: Usuario
}

interface ExerciseApi {
  id: number
  name: string
  category: string
  metric: Metrica
  description: string | null
  level?: Nivel | null
  warmup?: boolean
  position?: number | null
  custom: boolean
}

interface ShotApi {
  zone: Zona
  makes: number
  attempts: number
}

interface SessionApi {
  id: number
  workoutName?: string | null
  performedAt: string
  durationMinutes: Num
  rating: Num
  fatigue?: Num
  notes: string | null
  entries: {
    exerciseId: number
    exerciseName: string
    makes: Num
    attempts: Num
    reps: Num
    seconds: Num
    bestStreak?: Num
  }[]
  shots?: ShotApi[]
}

interface WorkoutResumoApi {
  id: number
  name: string
  description: string | null
}

interface WorkoutApi extends WorkoutResumoApi {
  exercises: { exerciseId: number; targetSeconds?: number | null }[]
}

interface SettingsApi {
  theme: Config['tema']
  reminders: { enabled: boolean; time: string; days: number[] }
  metronomeBpm: number
}

export interface ResultadoImportacao {
  created: Record<'exercises' | 'workouts' | 'sessions', number>
  skipped: Record<'sessions', number>
}

// ---------- Mapeamento backend → frontend ----------

const CATEGORIA: Record<string, Categoria> = {
  arremesso: 'Arremesso',
  drible: 'Drible',
  passe: 'Passe',
  finalizacao: 'Finalização',
  defesa: 'Defesa',
  condicionamento: 'Condicionamento',
}

const CATEGORIA_API = Object.fromEntries(Object.entries(CATEGORIA).map(([api, front]) => [front, api])) as Record<
  Categoria,
  string
>

const num = (v: Num | undefined) => (v === null || v === undefined || v === '' ? undefined : Number(v))

const paraDrill = (e: ExerciseApi): Drill => ({
  id: String(e.id),
  nome: e.name,
  categoria: CATEGORIA[e.category] ?? 'Condicionamento',
  metrica: e.metric,
  descricao: e.description ?? '',
  personalizado: e.custom,
  nivel: e.level ?? undefined,
  aquecimento: e.warmup ?? false,
  ordem: e.position ?? undefined,
})

function paraSessao(s: SessionApi): Sessao {
  const entrada = s.entries[0]
  const soma = (campo: 'makes' | 'attempts') =>
    s.entries.some((e) => e[campo] != null) ? s.entries.reduce((t, e) => t + (num(e[campo]) ?? 0), 0) : undefined
  const sequencias = s.entries.map((e) => num(e.bestStreak)).filter((n): n is number => n !== undefined)
  const nome =
    s.workoutName ??
    (s.entries.length > 1 ? `${entrada.exerciseName} + ${s.entries.length - 1}` : entrada?.exerciseName)
  return {
    id: String(s.id),
    drillId: entrada ? String(entrada.exerciseId) : undefined,
    drillNome: nome,
    data: s.performedAt,
    duracaoMin: num(s.durationMinutes) ?? 0,
    acertos: soma('makes'),
    tentativas: soma('attempts'),
    repeticoes: s.entries.length === 1 ? num(entrada.reps) : undefined,
    segundos: s.entries.length === 1 ? num(entrada.seconds) : undefined,
    esforco: num(s.rating),
    cansaco: num(s.fatigue),
    notas: s.notes ?? undefined,
    sequencia: sequencias.length ? Math.max(...sequencias) : undefined,
    entradas: s.entries.map((e) => ({
      drillId: String(e.exerciseId),
      drillNome: e.exerciseName,
      acertos: num(e.makes),
      tentativas: num(e.attempts),
      repeticoes: num(e.reps),
      segundos: num(e.seconds),
      sequencia: num(e.bestStreak),
    })),
    zonas: (s.shots ?? []).map((z) => ({ zona: z.zone, acertos: z.makes, tentativas: z.attempts })),
  }
}

const paraConfig = (s: SettingsApi): Config => ({
  tema: s.theme,
  lembretes: { ativo: s.reminders.enabled, horario: s.reminders.time, dias: s.reminders.days as DiaSemana[] },
  metronomoBpm: s.metronomeBpm,
})

/** Data local no formato AAAA-MM-DD. */
export function dataLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Fuso do navegador, para o backend contar dias e semanas no horário local do atleta.
export const fuso = () => `tzOffset=${new Date().getTimezoneOffset()}`

// ---------- Endpoints ----------

export const api = {
  comparacao: (dias: number, exercicio = '') => request<ComparacaoEvolucao>('GET', `/sessions/comparison?${fuso()}&days=${dias}${exercicio ? `&exerciseId=${encodeURIComponent(exercicio)}` : ''}`),
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

  async drills() {
    return (await request<ExerciseApi[]>('GET', '/exercises')).map(paraDrill)
  },

  async salvarDrill(d: Pick<Drill, 'nome' | 'categoria' | 'metrica' | 'descricao'>, id?: string) {
    const corpo = { name: d.nome, category: CATEGORIA_API[d.categoria], metric: d.metrica, description: d.descricao || null }
    const salvo = id
      ? await request<ExerciseApi>('PUT', `/exercises/${id}`, corpo)
      : await request<ExerciseApi>('POST', '/exercises', corpo)
    return paraDrill(salvo)
  },

  removerDrill: (id: string) => request<null>('DELETE', `/exercises/${id}`),

  async sessoes(): Promise<Sessao[]> {
    // A listagem já traz notas, entries e arremessos por zona de cada sessão.
    return (await request<SessionApi[]>('GET', '/sessions?limit=50')).map(paraSessao)
  },

  /** Histórico completo, página por página (para exportar em CSV). */
  async todasSessoes(): Promise<Sessao[]> {
    const todas: Sessao[] = []
    for (let offset = 0; ; offset += 200) {
      const pagina = await request<SessionApi[]>('GET', `/sessions?limit=200&offset=${offset}`)
      todas.push(...pagina.map(paraSessao))
      if (pagina.length < 200) return todas
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

  async config() {
    return paraConfig(await request<SettingsApi>('GET', '/settings'))
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

  async estilos(): Promise<EstiloResumo[]> {
    return (await request<EstiloResumoApi[]>('GET', '/styles')).map(paraEstiloResumo)
  },

  async estilo(id: string): Promise<Estilo> {
    const r = await request<EstiloApi>('GET', `/styles/${encodeURIComponent(id)}`)
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
  async rotina(): Promise<{ rotina: Rotina; ids: Partial<Record<DiaSemana, number>>; duracoes: Record<DiaSemana, number[]> }> {
    const rotina: Rotina = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    const duracoes = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } as Record<DiaSemana, number[]>
    const ids: Partial<Record<DiaSemana, number>> = {}
    const lista = await request<WorkoutResumoApi[]>('GET', '/workouts')
    const dosDias = lista.filter((w) => diaDaRotina(w.description) !== null)
    const completos = await Promise.all(dosDias.map((w) => request<WorkoutApi>('GET', `/workouts/${w.id}`)))
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

interface EstiloResumoApi {
  id: string
  name: string
  group: 'guard' | 'forward' | 'center'
  archetype: string
  minutes: number
  mix: Record<string, number>
  moveCount?: number
  moves?: unknown[]
}

interface ExercicioEstiloApi {
  exerciseId: number
  name: string
  category: string
  metric: Metrica
}

interface EstiloApi extends EstiloResumoApi {
  heightCm: number
  pace: string
  summary: string
  mindset: string
  moves: {
    name: string
    description: string
    tip: string
    dose: string
    minutes: number
    exercise: ExercicioEstiloApi | null
  }[]
  session: (ExercicioEstiloApi & { minutes: number; dose: string })[]
}

const POSICAO: Record<EstiloResumoApi['group'], Posicao> = { guard: 'Armador', forward: 'Ala', center: 'Pivô' }

const paraEstiloResumo = (r: EstiloResumoApi): EstiloResumo => ({
  id: r.id,
  nome: r.name,
  posicao: POSICAO[r.group] ?? 'Ala',
  arquetipo: r.archetype,
  // A lista traz só a contagem; o detalhe traz os movimentos.
  totalMovimentos: r.moveCount ?? r.moves?.length ?? 0,
  minutos: r.minutes,
  divisao: Object.entries(r.mix).map(
    ([c, porcentagem]): FatiaEstilo => ({ categoria: CATEGORIA[c] ?? 'Condicionamento', porcentagem }),
  ),
})

const PREFIXO_ROTINA = 'bp-rotina:'

function diaDaRotina(descricao: string | null): DiaSemana | null {
  const m = descricao?.match(/^bp-rotina:([0-6])$/)
  return m ? (Number(m[1]) as DiaSemana) : null
}
