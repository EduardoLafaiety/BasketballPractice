import type { SessionInput } from '../sessions/session.schema.js'

export type SessionContent = Pick<SessionInput, 'performedAt' | 'durationMinutes' | 'rating' | 'fatigue' | 'notes'> & {
  entries: { [K in keyof SessionInput['entries'][number]]?: unknown }[]
  shots: { zone: string; makes: number; attempts: number }[]
}

// O que torna uma sessão a mesma do backup: o instante e tudo o que foi registrado nele. O treino fica de fora
// porque é só um vínculo: renomeá-lo depois do backup não faz o treino feito naquele dia virar outro.
export const sessionFingerprint = (session: SessionContent) =>
  JSON.stringify([
    new Date(session.performedAt).toISOString(),
    session.durationMinutes ?? null,
    session.rating ?? null,
    session.fatigue ?? null,
    session.notes ?? null,
    session.entries.map((e) => [e.exerciseId, e.attempts ?? null, e.makes ?? null, e.reps ?? null, e.seconds ?? null, e.bestStreak ?? null, e.notes ?? null]),
    session.shots.map((s) => [s.zone, s.makes, s.attempts]),
  ])

