import { Router } from 'express'
import { compareSessions, comparisonQuery } from './session.comparison.js'
import { z } from 'zod'
import { many, one, type Database } from '../../db/index.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import { idParam, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { assertExercisesVisible } from '../exercises/exercise.repository.js'
import { completeProgramDay } from '../programs/program.service.js'
import { sessionSchema, listQuery, dateRangeFilter, type SessionInput } from './session.schema.js'
import { SESSION_COLUMNS, sessionDetails, insertSession, replaceEntries } from './session.repository.js'

export function sessionsRouter(db: Database) {
  const router = Router()

  const findSession = async (id: number, userId: number) => {
    const session = await one(
      db,
      `SELECT ${SESSION_COLUMNS}, s.notes, s.created_at AS "createdAt"
       FROM practice_sessions s LEFT JOIN workouts w ON w.id = s.workout_id
       WHERE s.id = $1 AND s.user_id = $2`,
      [id, userId],
    )
    if (!session) throw notFound('Registro de treino')

    return { ...session, ...(await sessionDetails(db, [id]))(id) }
  }

  const validateReferences = async (input: SessionInput, userId: number, connection: import('../../db/index.js').Queryable = db) => {
    if (
      input.workoutId != null &&
      !(await one(connection, 'SELECT 1 FROM workouts WHERE id = $1 AND user_id = $2', [input.workoutId, userId]))
    ) {
      throw new HttpError(400, `Treino ${input.workoutId} não existe`)
    }
    await assertExercisesVisible(connection, input.entries.map((entry) => entry.exerciseId), userId)
  }

  router.get('/', async (req, res) => {
    const query = parse(listQuery, req.query)
    const range = dateRangeFilter(query, 2)
    const sessions = await many<{ id: number }>(
      db,
      `SELECT ${SESSION_COLUMNS}, s.notes,
              COUNT(se.id)::int AS "entryCount", SUM(se.makes)::int AS makes, SUM(se.attempts)::int AS attempts
       FROM practice_sessions s
       LEFT JOIN workouts w ON w.id = s.workout_id
       LEFT JOIN session_entries se ON se.session_id = s.id
       WHERE s.user_id = $1 AND ${range.sql}
       GROUP BY s.id, w.name ORDER BY s.performed_at DESC, s.id DESC LIMIT $4 OFFSET $5`,
      [currentUser(req), ...range.params, query.limit, query.offset],
    )
    const details = await sessionDetails(db, sessions.map((session) => session.id))
    res.json(sessions.map((session) => ({ ...session, ...details(session.id) })))
  })

  router.get('/comparison', async (req, res) => {
    res.json(await compareSessions(db, currentUser(req), parse(comparisonQuery, req.query)))
  })

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await findSession(id, currentUser(req)))
  })

  router.post('/', async (req, res) => {
    const userId = currentUser(req)
    const body = parse(sessionSchema.extend({
      clientId: z.string().uuid().optional(),
      program: z.object({ id: z.string().max(60), day: z.number().int().min(1).max(366) }).optional(),
      tzOffset: z.number().int().min(-840).max(840).default(0),
    }), req.body)
    const id = await db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(4245, $1)', [userId])
      if (body.clientId) {
        const previous = await one<{ id: number }>(tx, 'SELECT id FROM practice_sessions WHERE user_id = $1 AND client_id = $2', [userId, body.clientId])
        if (previous) return previous.id
      }
      await validateReferences(body, userId, tx)
      const created = await insertSession(tx, userId, body)
      if (body.clientId) await tx.query('UPDATE practice_sessions SET client_id = $1 WHERE id = $2', [body.clientId, created])
      if (body.program) await completeProgramDay(tx, userId, body.program.id, body.program.day, body.tzOffset, created)
      return created
    })
    res.status(201).json(await findSession(id, userId))
  })

  router.put('/:id', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(idParam, req.params)
    const body = parse(sessionSchema, req.body)
    await findSession(id, userId)
    await validateReferences(body, userId)

    await db.transaction(async (tx) => {
      await tx.query(
        `UPDATE practice_sessions
         SET workout_id = $1, performed_at = $2, duration_minutes = $3, rating = $4, fatigue = $5, notes = $6
         WHERE id = $7`,
        [
          body.workoutId ?? null,
          body.performedAt,
          body.durationMinutes ?? null,
          body.rating ?? null,
          body.fatigue ?? null,
          body.notes ?? null,
          id,
        ],
      )
      await replaceEntries(tx, id, body)
    })
    res.json(await findSession(id, userId))
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { rowCount } = await db.query('DELETE FROM practice_sessions WHERE id = $1 AND user_id = $2', [
      id,
      currentUser(req),
    ])
    if (!rowCount) throw notFound('Registro de treino')
    res.status(204).end()
  })

  return router
}

export { sessionSchema, dateRangeFilter, tzQuery, ZONES } from './session.schema.js'
export { sessionDetails, insertSession } from './session.repository.js'
