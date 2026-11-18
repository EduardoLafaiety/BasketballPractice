import type { Categoria, Drill, Config, DiaSemana, Sessao, Posicao, EstiloResumo, FatiaEstilo } from '../types'
import type { Num, ExerciseApi, SessionApi, SettingsApi, EstiloResumoApi } from '../../../../contracts/api'

export const CATEGORIA: Record<string, Categoria> = {
  arremesso: 'Arremesso',
  drible: 'Drible',
  passe: 'Passe',
  finalizacao: 'Finalização',
  defesa: 'Defesa',
  condicionamento: 'Condicionamento',
}

export const CATEGORIA_API = Object.fromEntries(Object.entries(CATEGORIA).map(([api, front]) => [front, api])) as Record<
  Categoria,
  string
>

const num = (v: Num | undefined) => (v === null || v === undefined || v === '' ? undefined : Number(v))

export const paraDrill = (e: ExerciseApi): Drill => ({
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

export function paraSessao(s: SessionApi): Sessao {
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

export const paraConfig = (s: SettingsApi): Config => ({
  tema: s.theme,
  lembretes: { ativo: s.reminders.enabled, horario: s.reminders.time, dias: s.reminders.days as DiaSemana[] },
  metronomoBpm: s.metronomeBpm,
})

const POSICAO: Record<EstiloResumoApi['group'], Posicao> = { guard: 'Armador', forward: 'Ala', center: 'Pivô' }

export const paraEstiloResumo = (r: EstiloResumoApi): EstiloResumo => ({
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

