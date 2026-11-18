import { many, one, type Queryable } from '../../db/index.js'
import type { Progress } from './program.model.js'

export async function loadProgress(db: Queryable, userId: number, programId?: string) {
  const started = await many<{ programId: string; startedOn: string }>(
    db,
    `SELECT program_id AS "programId", to_char(started_on, 'YYYY-MM-DD') AS "startedOn" FROM user_programs
     WHERE user_id = $1 AND ($2::text IS NULL OR program_id = $2)`,
    [userId, programId ?? null],
  )
  const done = await many<{ programId: string; day: number; doneOn: string }>(
    db,
    `SELECT program_id AS "programId", day, to_char(done_on, 'YYYY-MM-DD') AS "doneOn" FROM program_days_done
     WHERE user_id = $1 AND ($2::text IS NULL OR program_id = $2) ORDER BY day`,
    [userId, programId ?? null],
  )
  return new Map<string, Progress>(
    started.map((s) => [s.programId, { startedOn: s.startedOn, done: done.filter((d) => d.programId === s.programId) }]),
  )
}

export async function lockProgramProgress(tx: Queryable, userId: number) {
  await tx.query('SELECT pg_advisory_xact_lock(4244, $1)', [userId])
}

export function catalogByName(db: Queryable, names: string[]) {
  return many<{ id: number; name: string; category: string; metric: string }>(db,
    'SELECT id, name, category, metric FROM exercises WHERE user_id IS NULL AND name = ANY($1::text[])', [names])
}

export async function removeProgram(tx: Queryable, userId: number, id: string) {
  return (await tx.query('DELETE FROM user_programs WHERE user_id = $1 AND program_id = $2', [userId, id])).rowCount
}

export async function insertProgram(tx: Queryable, userId: number, id: string, today: string) {
  await tx.query('INSERT INTO user_programs (user_id, program_id, started_on) VALUES ($1, $2, $3)', [userId, id, today])
}

export async function ownsSession(tx: Queryable, userId: number, sessionId: number) {
  return Boolean(await one(tx, 'SELECT 1 FROM practice_sessions WHERE id = $1 AND user_id = $2 FOR KEY SHARE', [sessionId, userId]))
}

export async function insertProgramDay(tx: Queryable, userId: number, id: string, day: number, today: string, sessionId: number | null) {
  await tx.query('INSERT INTO program_days_done (user_id, program_id, day, done_on, session_id) VALUES ($1, $2, $3, $4, $5)',
    [userId, id, day, today, sessionId])
}
