import { many, one, type Queryable } from '../../db/index.js'
import type { SessionInput, SessionListQuery, SessionComparisonQuery } from './session.schema.js'
import { dateRangeFilter } from './session.filters.js'
import type { ResumoPeriodo } from '../../../../contracts/evolucao.js'
export const SESSION_COLUMNS = `s.id, s.workout_id AS "workoutId", w.name AS "workoutName", s.performed_at AS "performedAt",
  s.duration_minutes AS "durationMinutes", s.rating, s.fatigue`

export interface SessionRow {
  id: number
  workoutId: number | null
  workoutName: string | null
  performedAt: Date | string
  durationMinutes: number | null
  rating: number | null
  fatigue: number | null
  notes: string | null
  createdAt?: Date | string
}

export async function findSession(db: Queryable, id: number, userId: number, lock = false) {
  return one<SessionRow>(db,
    `SELECT ${SESSION_COLUMNS}, s.notes, s.created_at AS "createdAt"
     FROM practice_sessions s LEFT JOIN workouts w ON w.id = s.workout_id
     WHERE s.id = $1 AND s.user_id = $2${lock ? ' FOR UPDATE OF s' : ''}`, [id, userId])
}

export async function listSessionRows(db: Queryable, userId: number, query: SessionListQuery) {
  const range = dateRangeFilter(query, 2)
  return many<SessionRow & { entryCount: number; makes: number | null; attempts: number | null }>(db,
    `SELECT ${SESSION_COLUMNS}, s.notes,
            COUNT(se.id)::int AS "entryCount", SUM(se.makes)::int AS makes, SUM(se.attempts)::int AS attempts
     FROM practice_sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     LEFT JOIN session_entries se ON se.session_id = s.id
     WHERE s.user_id = $1 AND ${range.sql}
     GROUP BY s.id, w.name ORDER BY s.performed_at DESC, s.id DESC LIMIT $4 OFFSET $5`,
    [userId, ...range.params, query.limit, query.offset])
}

export async function lockSessionCreation(tx: Queryable, userId: number) {
  await tx.query('SELECT pg_advisory_xact_lock(4245, $1)', [userId])
}

export async function findSessionByClientId(tx: Queryable, userId: number, clientId: string) {
  return one<{ id: number }>(tx, 'SELECT id FROM practice_sessions WHERE user_id = $1 AND client_id = $2 FOR UPDATE', [userId, clientId])
}

export async function assignSessionClientId(tx: Queryable, id: number, userId: number, clientId: string) {
  await tx.query('UPDATE practice_sessions SET client_id = $1 WHERE id = $2 AND user_id = $3', [clientId, id, userId])
}

export async function updateSessionRow(tx: Queryable, id: number, userId: number, input: SessionInput) {
  await tx.query(
    `UPDATE practice_sessions
     SET workout_id = $1, performed_at = $2, duration_minutes = $3, rating = $4, fatigue = $5, notes = $6
     WHERE id = $7 AND user_id = $8`,
    [input.workoutId ?? null, input.performedAt, input.durationMinutes ?? null,
      input.rating ?? null, input.fatigue ?? null, input.notes ?? null, id, userId])
}

export async function deleteSessionRow(db: Queryable, id: number, userId: number) {
  return (await db.query('DELETE FROM practice_sessions WHERE id = $1 AND user_id = $2', [id, userId])).rowCount
}

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

export async function comparisonRows(db: Queryable, userId: number, query: SessionComparisonQuery, range: { previous: string; start: string; end: string }) {
  return many<ResumoPeriodo & { periodo: 'atual' | 'anterior' }>(db, `
    SELECT CASE WHEN s.performed_at >= $3::timestamptz THEN 'atual' ELSE 'anterior' END AS periodo,
      count(*)::int AS frequencia,
      count(DISTINCT ((s.performed_at AT TIME ZONE 'UTC') - $6 * interval '1 minute')::date)::int AS "diasAtivos",
      CASE WHEN $5::int IS NULL THEN COALESCE(sum(s.duration_minutes), 0)::float8 ELSE 0 END AS minutos,
      COALESCE(sum(e.acertos), 0)::float8 AS acertos, COALESCE(sum(e.tentativas), 0)::float8 AS tentativas,
      COALESCE(sum(e.repeticoes), 0)::float8 AS repeticoes, COALESCE(sum(e.segundos), 0)::float8 AS segundos
    FROM practice_sessions s
    LEFT JOIN LATERAL (
      SELECT count(*) AS entradas, sum(makes) AS acertos, sum(attempts) AS tentativas, sum(reps) AS repeticoes, sum(seconds) AS segundos
      FROM session_entries WHERE session_id = s.id AND ($5::int IS NULL OR exercise_id = $5)
    ) e ON true
    WHERE s.user_id = $1 AND s.performed_at >= $2::timestamptz AND s.performed_at < $4::timestamptz
      AND ($5::int IS NULL OR e.entradas > 0)
    GROUP BY periodo`, [userId, range.previous, range.start, range.end, query.exerciseId ?? null, query.tzOffset])
}

export async function comparedExercises(db: Queryable, userId: number) {
  return many<{ id: string; nome: string }>(db, `SELECT DISTINCT e.id::text AS id, e.name AS nome
    FROM session_entries se JOIN practice_sessions s ON s.id = se.session_id JOIN exercises e ON e.id = se.exercise_id
    WHERE s.user_id = $1 ORDER BY nome`, [userId])
}
