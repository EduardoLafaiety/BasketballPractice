import type {
  ArremessosZona,
  BlocoPlano,
  Categoria,
  Config,
  Conquista,
  DiaSemana,
  Drill,
  InfoTeste,
  Meta,
  Metrica,
  ModeloRotina,
  NovaSessao,
  Progresso,
  Resumo,
  Rotina,
  Sessao,
  TesteFisico,
  TipoMeta,
  TipoTeste,
  Zona,
} from './types'


// Em dev o Vite faz proxy de /api para o backend (vite.config.ts).
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
const CHAVE_TOKEN = 'bp.token'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[] | undefined>,
  ) {
    super(message)
  }
}

// Na demonstração não há login: o visitante já entra com a sessão aberta.
let token: string | null = __DEMO__ ? 'demo' : lerToken()
let aoExpirar: (() => void) | null = null

function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export const tokenAtual = () => token

export function definirToken(novo: string | null) {
  token = novo
  try {
    if (novo) localStorage.setItem(CHAVE_TOKEN, novo)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // armazenamento indisponível: o login vale só nesta aba
  }
}

/** Chamado quando a API responde 401 numa rota autenticada (token expirado). */
export function aoTokenExpirar(fn: (() => void) | null) {
  aoExpirar = fn
}

async function request<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  let resposta: Response
  try {
    resposta = __DEMO__
      ? // Demonstração: a API real roda no próprio navegador (src/demo/servidor.ts).
        await (await import('@demo/servidor')).responder(metodo, caminho, corpo)
      : await fetch(`${BASE}${caminho}`, {
          method: metodo,
          headers: {
            ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
        })
  } catch (erro) {
    if (__DEMO__) console.error('Demonstração indisponível', erro)
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique sua conexão.')
  }

  const texto = await resposta.text()
  let dados: unknown = null
  try {
    dados = texto ? JSON.parse(texto) : null
  } catch {
    // resposta sem JSON (ex.: proxy sem backend)
  }

  if (!resposta.ok) {
    const erro = (dados ?? {}) as { error?: string; details?: ApiError['details'] }
    if (resposta.status === 401 && token) aoExpirar?.()
    const mensagem =
      erro.error ?? (resposta.status >= 500 ? 'O servidor não respondeu. Tente de novo.' : `Erro ${resposta.status}`)
    throw new ApiError(resposta.status, mensagem, erro.details)
  }
  return dados as T
}

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

interface AuthResposta {
  token: string
  user: Usuario
}

interface ExerciseApi {
  id: number
  name: string
  category: string
  metric: Metrica
  description: string | null
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
  exercises: { exerciseId: number }[]
}

interface StatsApi {
  totals: { sessions: Num; minutes: Num; averageRating: Num; averageFatigue?: Num }
  shooting: { makes: Num; attempts: Num; percentage: Num }
  byWeek?: { weekStart: string; sessions: Num; minutes: Num; makes: Num; attempts: Num }[]
}

interface GoalApi {
  id: number
  title: string
  kind: TipoMeta
  target: number
  current: number
  achieved: boolean
  exerciseId: number | null
  exerciseName: string | null
  deadline: string | null
}

interface ProgressApi {
  streak: { current: number; best: number }
  achievements: { id: string; title: string; description: string; target: number; progress: number; unlocked: boolean }[]
}

interface TestApi {
  id: number
  kind: TipoTeste
  value: number
  performedAt: string
  notes: string | null
}

interface SettingsApi {
  theme: Config['tema']
  reminders: { enabled: boolean; time: string; days: number[] }
  metronomeBpm: number
}

export interface ResultadoImportacao {
  created: Record<'exercises' | 'workouts' | 'sessions' | 'goals' | 'physicalTests', number>
  skipped: Record<'sessions' | 'goals' | 'physicalTests', number>
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

const paraMeta = (g: GoalApi): Meta => ({
  id: String(g.id),
  titulo: g.title,
  tipo: g.kind,
  alvo: g.target,
  atual: g.current,
  concluida: g.achieved,
  drillId: g.exerciseId === null ? undefined : String(g.exerciseId),
  drillNome: g.exerciseName ?? undefined,
  prazo: g.deadline ?? undefined,
})

const paraTeste = (t: TestApi): TesteFisico => ({
  id: String(t.id),
  tipo: t.kind,
  valor: Number(t.value),
  data: t.performedAt,
  notas: t.notes ?? undefined,
})

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
const fuso = () => `tzOffset=${new Date().getTimezoneOffset()}`

// Instante exato (ex.: meia-noite local) para o período, e o fuso para as semanas do resumo.
function filtroPeriodo(desde?: Date, ate?: Date) {
  const params = new URLSearchParams({ tzOffset: String(new Date().getTimezoneOffset()) })
  if (desde) params.set('from', desde.toISOString())
  // "ate" é exclusivo no app (início do dia seguinte); o backend inclui o instante, então tira 1 ms.
  if (ate) params.set('to', new Date(ate.getTime() - 1).toISOString())
  return `?${params}`
}

// ---------- Endpoints ----------

export const api = {
  cadastrar: (nome: string, email: string, senha: string) =>
    request<AuthResposta>('POST', '/auth/register', { name: nome, email, password: senha }),

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

  /** Totais de [desde, ate); sem datas, todo o histórico. */
  async resumo(desde?: Date, ate?: Date): Promise<Resumo> {
    const r = await request<StatsApi>('GET', `/stats/summary${filtroPeriodo(desde, ate)}`)
    return {
      sessoes: num(r.totals.sessions) ?? 0,
      minutos: num(r.totals.minutes) ?? 0,
      acertos: num(r.shooting.makes) ?? 0,
      tentativas: num(r.shooting.attempts) ?? 0,
      esforcoMedio: num(r.totals.averageRating),
      cansacoMedio: num(r.totals.averageFatigue),
      semanas: (r.byWeek ?? []).map((w) => ({
        inicio: w.weekStart,
        sessoes: num(w.sessions) ?? 0,
        minutos: num(w.minutes) ?? 0,
        acertos: num(w.makes) ?? 0,
        tentativas: num(w.attempts) ?? 0,
      })),
    }
  },

  async zonas(desde?: Date): Promise<ArremessosZona[]> {
    const r = await request<ShotApi[]>('GET', `/stats/zones${filtroPeriodo(desde)}`)
    return r.map((z) => ({ zona: z.zone, acertos: z.makes, tentativas: z.attempts }))
  },

  async progresso(): Promise<Progresso> {
    const r = await request<ProgressApi>('GET', `/stats/progress?${fuso()}`)
    return {
      sequenciaAtual: r.streak.current,
      melhorSequencia: r.streak.best,
      conquistas: r.achievements.map(
        (a): Conquista => ({
          id: a.id,
          titulo: a.title,
          descricao: a.description,
          alvo: a.target,
          progresso: a.progress,
          desbloqueada: a.unlocked,
        }),
      ),
    }
  },

  async metas() {
    return (await request<GoalApi[]>('GET', `/goals?${fuso()}`)).map(paraMeta)
  },

  async salvarMeta(m: Pick<Meta, 'titulo' | 'tipo' | 'alvo' | 'drillId' | 'prazo'>) {
    const criada = await request<GoalApi>('POST', `/goals?${fuso()}`, {
      title: m.titulo,
      kind: m.tipo,
      target: m.alvo,
      exerciseId: m.drillId ? Number(m.drillId) : null,
      deadline: m.prazo || null,
    })
    return paraMeta(criada)
  },

  removerMeta: (id: string) => request<null>('DELETE', `/goals/${id}`),

  async tiposTeste(): Promise<InfoTeste[]> {
    const r = await request<{ kind: TipoTeste; name: string; unit: string; better: InfoTeste['melhor'] }[]>('GET', '/tests/kinds')
    return r.map((t) => ({ tipo: t.kind, nome: t.name, unidade: t.unit, melhor: t.better }))
  },

  async testes() {
    return (await request<TestApi[]>('GET', '/tests')).map(paraTeste)
  },

  async registrarTeste(t: Omit<TesteFisico, 'id'>) {
    const criado = await request<TestApi>('POST', '/tests', {
      kind: t.tipo,
      value: t.valor,
      performedAt: t.data,
      notes: t.notas ?? null,
    })
    return paraTeste(criado)
  },

  removerTeste: (id: string) => request<null>('DELETE', `/tests/${id}`),

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

  async modelosRotina(): Promise<ModeloRotina[]> {
    const r = await request<
      { id: string; name: string; description: string; days: Record<string, { exerciseId: number }[]> }[]
    >('GET', '/plans/templates')
    return r.map((m) => ({
      id: m.id,
      nome: m.name,
      descricao: m.description,
      dias: Object.fromEntries(
        Object.entries(m.days).map(([dia, itens]) => [dia, itens.map((i) => String(i.exerciseId))]),
      ) as Rotina,
    }))
  },

  async gerarTreino(minutos: number, foco: Categoria[], aquecimento: boolean, semente?: number) {
    const r = await request<{
      minutes: number
      blocks: { exerciseId: number; name: string; category: string; metric: Metrica; minutes: number }[]
    }>('POST', '/plans/generate', {
      minutes: minutos,
      focus: foco.map((c) => CATEGORIA_API[c]),
      warmup: aquecimento,
      seed: semente,
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

  /** Salva um plano gerado como modelo de treino reutilizável. */
  async salvarPlano(nome: string, blocos: BlocoPlano[]) {
    const salvo = await request<WorkoutApi>('POST', '/workouts', {
      name: nome,
      exercises: blocos.map((b) => ({ exerciseId: Number(b.drillId), targetSeconds: b.minutos * 60 })),
    })
    return salvo.id
  },

  exportar: () => request<unknown>('GET', '/data/export'),

  importar: (dados: unknown) => request<ResultadoImportacao>('POST', '/data/import', dados),

  // A rotina semanal vira um modelo de treino (/workouts) por dia da semana,
  // identificado pela descrição "bp-rotina:<dia>".
  async rotina(): Promise<{ rotina: Rotina; ids: Partial<Record<DiaSemana, number>> }> {
    const rotina: Rotina = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    const ids: Partial<Record<DiaSemana, number>> = {}
    const lista = await request<WorkoutResumoApi[]>('GET', '/workouts')
    const dosDias = lista.filter((w) => diaDaRotina(w.description) !== null)
    const completos = await Promise.all(dosDias.map((w) => request<WorkoutApi>('GET', `/workouts/${w.id}`)))
    for (const w of completos) {
      const dia = diaDaRotina(w.description)!
      if (ids[dia] !== undefined) continue // duplicado: fica o mais recente
      ids[dia] = w.id
      rotina[dia] = w.exercises.map((e) => String(e.exerciseId))
    }
    return { rotina, ids }
  },

  async salvarDia(dia: DiaSemana, nomeDia: string, drillIds: string[], workoutId?: number) {
    const corpo = {
      name: `Rotina de ${nomeDia.toLowerCase()}`,
      description: `${PREFIXO_ROTINA}${dia}`,
      exercises: drillIds.map((id) => ({ exerciseId: Number(id) })),
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
