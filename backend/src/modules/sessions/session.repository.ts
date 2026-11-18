import { many, one, type Queryable } from '../../db/index.js'
import type { SessionInput } from './session.schema.js'
export const SESSION_COLUMNS = `s.id, s.workout_id AS "workoutId", w.name AS "workoutName", s.performed_at AS "performedAt",
  s.duration_minutes AS "durationMinutes", s.rating, s.fatigue`

const ENTRY_SELECT = `SELECT se.session_id AS "sessionId", se.id, se.exercise_id AS "exerciseId", e.name AS "exerciseName",
         e.category, e.metric, se.attempts, se.makes, se.reps, se.seconds, se.best_streak AS "bestStreak", se.notes
  FROM session_entries se JOIN exercises e ON e.id = se.exercise_id`

type EntryRow = { sessionId: number } & Record<string, unknown>

// Busca as entries de várias sessões numa só consulta e agrupa por sessão.
async function entriesBySession(db: Queryable, sessionIds: number[]) {
  const bySession = new Map<number, Record<string, unknown>[]>()
  if (!sessionIds.length) return bySession
  const rows = await many<EntryRow>(
    db,
    `${ENTRY_SELECT} WHERE se.session_id = ANY($1::int[]) ORDER BY se.session_id, se.id`,
    [sessionIds],
  )
  for (const { sessionId, ...entry } of rows) {
    const list = bySession.get(sessionId) ?? []
    list.push(entry)
    bySession.set(sessionId, list)
  }
  return bySession
}

type ShotRow = { zone: string; makes: number; attempts: number }

// Mesmo agrupamento para os arremessos por zona.
async function shotsBySession(db: Queryable, sessionIds: number[]) {
  const bySession = new Map<number, ShotRow[]>()
  if (!sessionIds.length) return bySession
  const rows = await many<ShotRow & { sessionId: number }>(
    db,
    `SELECT session_id AS "sessionId", zone, makes, attempts FROM session_shots
     WHERE session_id = ANY($1::int[]) ORDER BY session_id, id`,
    [sessionIds],
  )
  for (const { sessionId, ...shot } of rows) {
    const list = bySession.get(sessionId) ?? []
    list.push(shot)
    bySession.set(sessionId, list)
  }
  return bySession
}

// Entries e shots de várias sessões, prontos para anexar a cada uma.
export async function sessionDetails(db: Queryable, sessionIds: number[]) {
  // Uma de cada vez: dentro de uma transação, as duas dividiriam a mesma conexão.
  const entries = await entriesBySession(db, sessionIds)
  const shots = await shotsBySession(db, sessionIds)
  return (id: number) => ({ entries: entries.get(id) ?? [], shots: shots.get(id) ?? [] })
}

// Regrava entries e shots de uma sessão (usado ao criar, editar e importar).
export async function replaceEntries(tx: Queryable, sessionId: number, input: SessionInput) {
  await tx.query('DELETE FROM session_shots WHERE session_id = $1', [sessionId])
  if (input.shots.length) {
    const { shots } = input
    await tx.query(
      `INSERT INTO session_shots (session_id, zone, makes, attempts)
       SELECT $1, t.zone, t.makes, t.attempts FROM unnest($2::text[], $3::int[], $4::int[]) AS t(zone, makes, attempts)`,
      [sessionId, shots.map((shot) => shot.zone), shots.map((shot) => shot.makes), shots.map((shot) => shot.attempts)],
    )
  }

  await tx.query('DELETE FROM session_entries WHERE session_id = $1', [sessionId])
  if (!input.entries.length) return

  // Insere tudo de uma vez; WITH ORDINALITY mantém a ordem original nos ids.
  const column = <K extends keyof SessionInput['entries'][number]>(key: K) =>
    input.entries.map((entry) => entry[key] ?? null)
  await tx.query(
    `INSERT INTO session_entries (session_id, exercise_id, attempts, makes, reps, seconds, best_streak, notes)
     SELECT $1, t.exercise_id, t.attempts, t.makes, t.reps, t.seconds, t.best_streak, t.notes
     FROM unnest($2::int[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[], $8::text[])
          WITH ORDINALITY AS t(exercise_id, attempts, makes, reps, seconds, best_streak, notes, ord)
     ORDER BY t.ord`,
    [
      sessionId,
      column('exerciseId'),
      column('attempts'),
      column('makes'),
      column('reps'),
      column('seconds'),
      column('bestStreak'),
      column('notes'),
    ],
  )
}

/** Cria a sessão com entries e shots. Chame dentro de uma transação, com as referências já validadas. */
export async function insertSession(tx: Queryable, userId: number, input: SessionInput) {
  const { id } = (await one<{ id: number }>(
    tx,
    `INSERT INTO practice_sessions (user_id, workout_id, performed_at, duration_minutes, rating, fatigue, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      userId,
      input.workoutId ?? null,
      input.performedAt,
      input.durationMinutes ?? null,
      input.rating ?? null,
      input.fatigue ?? null,
      input.notes ?? null,
    ],
  ))!
  await replaceEntries(tx, id, input)
  return id
}
