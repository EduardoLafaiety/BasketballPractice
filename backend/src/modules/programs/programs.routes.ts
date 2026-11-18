import { Router } from 'express'
import { z } from 'zod'
import { many, type Database, type Queryable } from '../../db/index.js'
import { findProgram, PROGRAMS, type ProgramDefinition } from '../../db/programs.js'
import { notFound } from '../../lib/http-error.js'
import { dbId, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { tzQuery } from '../sessions/session.schema.js'

import { completeProgramDay, localToday, loadProgress, programStatus } from './program.service.js'
export { programStatus } from './program.service.js'

const programParam = z.object({ id: z.string().max(60) })
const dayParam = programParam.extend({ day: z.coerce.number().int().min(1).max(366) })
const completeSchema = z.object({ sessionId: dbId.nullish() }).default({})

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
    const status = await db.transaction(async (tx) => {
      return completeProgramDay(tx, userId, id, day, tzOffset, sessionId ?? null)
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
