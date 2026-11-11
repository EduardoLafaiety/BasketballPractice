import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { findProgram, PROGRAMS, type ProgramDefinition } from '../db/programs.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { dbId, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { tzQuery } from './sessions.js'
import { localToday } from './stats.js'

const programParam = z.object({ id: z.string().max(60) })
const dayParam = programParam.extend({ day: z.coerce.number().int().min(1).max(366) })
const completeSchema = z.object({ sessionId: dbId.nullish() }).default({})

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

async function loadProgress(db: Queryable, userId: number, programId?: string) {
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

/** Exercícios do catálogo usados pelos programas, por nome. */
async function catalogByName(db: Queryable, names: string[]) {
  const rows = await many<{ id: number; name: string; category: string; metric: string }>(
    db,
    'SELECT id, name, category, metric FROM exercises WHERE user_id IS NULL AND name = ANY($1::text[])',
    [names],
  )
  return new Map(rows.map((r) => [r.name, r]))
}

const summary = (program: ProgramDefinition) => ({
  id: program.id,
  name: program.name,
  summary: program.summary,
  level: program.level,
  focus: program.focus,
  totalDays: program.days.length,
  minutesPerDay: Math.round(program.days.reduce((t, d) => t + d.blocks.reduce((s, [, m]) => s + m, 0), 0) / program.days.length),
})

export function programsRouter(db: Database) {
  const router = Router()

  const findOr404 = (id: string) => {
    const program = findProgram(id)
    if (!program) throw notFound('Programa')
    return program
  }

  router.get('/', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const progress = await loadProgress(db, userId)
    const today = localToday(tzOffset)
    res.json(PROGRAMS.map((p) => ({ ...summary(p), status: programStatus(p, progress.get(p.id) ?? null, today) })))
  })

  router.get('/:id', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(programParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    const program = findOr404(id)
    const progress = (await loadProgress(db, userId, id)).get(id) ?? null
    const status = programStatus(program, progress, localToday(tzOffset))
    const catalog = await catalogByName(db, [...new Set(program.days.flatMap((d) => d.blocks.map(([name]) => name)))])
    res.json({
      ...summary(program),
      status,
      days: program.days.map((d, i) => {
        const day = i + 1
        const doneOn = progress?.done.find((x) => x.day === day)?.doneOn ?? null
        const state = doneOn
          ? 'done'
          : status.started && status.nextDay === day
            ? status.availableToday
              ? 'available'
              : 'tomorrow'
            : 'locked'
        return {
          day,
          title: d.title,
          state,
          doneOn,
          blocks: d.blocks.flatMap(([name, minutes]) => {
            const e = catalog.get(name)
            return e ? [{ exerciseId: e.id, name, category: e.category, metric: e.metric, minutes }] : []
          }),
        }
      }),
    })
  })

  // Começar (ou recomeçar do zero) um programa.
  router.post('/:id/start', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(programParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    findOr404(id)
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM user_programs WHERE user_id = $1 AND program_id = $2', [userId, id])
      await tx.query('INSERT INTO user_programs (user_id, program_id, started_on) VALUES ($1, $2, $3)', [userId, id, localToday(tzOffset)])
    })
    res.status(201).json(programStatus(findOr404(id), { startedOn: localToday(tzOffset), done: [] }, localToday(tzOffset)))
  })

  router.post('/:id/days/:day/complete', async (req, res) => {
    const userId = currentUser(req)
    const { id, day } = parse(dayParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    const { sessionId } = parse(completeSchema, req.body ?? {})
    const program = findOr404(id)
    const today = localToday(tzOffset)

    const status = await db.transaction(async (tx) => {
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
    })
    res.status(201).json(status)
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(programParam, req.params)
    const { rowCount } = await db.query('DELETE FROM user_programs WHERE user_id = $1 AND program_id = $2', [currentUser(req), id])
    if (!rowCount) throw notFound('Programa')
    res.status(204).end()
  })

  return router
}
