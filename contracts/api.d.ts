import type { Metrica, Nivel, Zona } from './primitivos'

export type Num = number | string | null // agregados do Postgres podem vir como texto

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

export interface AuthResposta {
  token: string
  user: Usuario
}

export interface ExerciseApi {
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

export interface ShotApi {
  zone: Zona
  makes: number
  attempts: number
}

export interface SessionApi {
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

/** Somente os dados consumidos pelas fórmulas de Overall e conquistas. */
export interface ProgressSessionApi {
  id: number
  performedAt: string
  durationMinutes: number | null
  makes: number
  bestStreak: number
  entries: { exerciseId: number }[]
  shots: ShotApi[]
}

export interface WorkoutResumoApi {
  id: number
  name: string
  description: string | null
}

export interface WorkoutApi extends WorkoutResumoApi {
  exercises: { exerciseId: number; targetSeconds?: number | null }[]
}

export interface SettingsApi {
  theme: 'sistema' | 'claro' | 'escuro'
  reminders: { enabled: boolean; time: string; days: number[] }
  metronomeBpm: number
}

export interface ResultadoImportacao {
  created: Record<'exercises' | 'workouts' | 'sessions', number>
  skipped: Record<'sessions', number>
}

export interface EstiloResumoApi {
  id: string
  name: string
  group: 'guard' | 'forward' | 'center'
  archetype: string
  minutes: number
  mix: Record<string, number>
  moveCount?: number
  moves?: unknown[]
}

export interface ExercicioEstiloApi {
  exerciseId: number
  name: string
  category: string
  metric: Metrica
}

export interface EstiloApi extends EstiloResumoApi {
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

