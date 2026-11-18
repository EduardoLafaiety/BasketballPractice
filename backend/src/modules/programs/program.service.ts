import { many, one, type Queryable } from '../../db/index.js'
import { findProgram, type ProgramDefinition } from '../../db/programs.js'
import { HttpError, notFound } from '../../lib/http-error.js'
export const localToday = (tzOffset: number) => new Date(Date.now() - tzOffset * 60_000).toISOString().slice(0, 10)
type Progress = { startedOn: string; done: { day: number; doneOn: string }[] }

/** Estado de um programa para o atleta: concluídos, o próximo dia e se ele já pode ser feito hoje. */
export function programStatus(program: ProgramDefinition, progress: Progress | null, today: string) {
  if (!progress) return { started: false as const, total: program.days.length, done: 0 }
  const done = progress.done.length
  const lastDoneOn = progress.done.reduce<string | null>((last, d) => (!last || d.doneOn > last ? d.doneOn : last), null)
  const finished = done >= program.days.length
  return {
    started: true as const,
    startedOn: progress.startedOn,
    total: program.days.length,
    done,
    finished,
    nextDay: finished ? null : done + 1,
    // Um dia por data: o próximo libera amanhã se hoje já teve um concluído.
    availableToday: !finished && lastDoneOn !== today,
  }
}

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

/** Participa da mesma transação que cria a sessão. */
export async function completeProgramDay(tx: Queryable, userId: number, id: string, day: number, tzOffset: number, sessionId: number | null) {
  const program = findProgram(id)
  if (!program) throw notFound('Programa')
  const today = localToday(tzOffset)
  await tx.query('SELECT pg_advisory_xact_lock(4244, $1)', [userId])
  const progress = (await loadProgress(tx, userId, id)).get(id) ?? null
  const current = programStatus(program, progress, today)
  if (!current.started) throw new HttpError(409, 'Comece o programa antes de concluir um dia')
  if (current.nextDay !== day) throw new HttpError(409, current.finished ? 'Programa já concluído' : `O próximo dia é o ${current.nextDay}`)
  if (!current.availableToday) throw new HttpError(409, 'Um dia por vez: o próximo treino libera amanhã')
  if (sessionId != null) {
    const own = await one(tx, 'SELECT 1 FROM practice_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId])
    if (!own) throw notFound('Sessão')
  }
  await tx.query(
    'INSERT INTO program_days_done (user_id, program_id, day, done_on, session_id) VALUES ($1, $2, $3, $4, $5)',
    [userId, id, day, today, sessionId ?? null],
  )
  return programStatus(program, { startedOn: progress!.startedOn, done: [...progress!.done, { day, doneOn: today }] }, today)
}
