import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { dbId, idParam, isoDate, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { assertExercisesVisible } from './exercises.js'
import { localDay, localToday, streaks, tzQuery } from './stats.js'

// Como cada tipo de meta é medido:
// - aproveitamento: % de acertos nos últimos 30 dias (num exercício ou em todos)
// - *_semana: semana atual, de segunda a domingo, no fuso do atleta
// - *_total: desde que a meta foi criada
// - dias_seguidos: sequência atual de dias com treino
export const GOAL_KINDS = [
  'aproveitamento',
  'sessoes_semana',
  'minutos_semana',
  'sessoes_total',
  'minutos_total',
  'cestas_total',
  'dias_seguidos',
] as const

export const goalSchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    kind: z.enum(GOAL_KINDS),
    target: z.number().int().min(1).max(1_000_000),
    exerciseId: dbId.nullish(),
    deadline: isoDate.nullish(),
  })
  .refine((goal) => goal.kind !== 'aproveitamento' || goal.target <= 100, {
    message: 'Aproveitamento vai até 100%',
    path: ['target'],
  })

/** Usada também na importação de backup, para o arquivo não criar metas que a tela recusaria. */
export function assertGoalExerciseKind(goal: z.infer<typeof goalSchema>) {
  if (goal.exerciseId != null && !['aproveitamento', 'cestas_total'].includes(goal.kind)) {
    throw new HttpError(400, 'Só metas de aproveitamento ou de cestas podem ser de um exercício')
  }
}

type GoalRow = {
  id: number
  title: string
  kind: (typeof GOAL_KINDS)[number]
  target: number
  exerciseId: number | null
  exerciseName: string | null
  deadline: string | null
  createdAt: Date
}

const COLUMNS = `g.id, g.title, g.kind, g.target, g.exercise_id AS "exerciseId", e.name AS "exerciseName",
  to_char(g.deadline, 'YYYY-MM-DD') AS deadline, g.created_at AS "createdAt"`

/** Segunda-feira da semana de `day` (AAAA-MM-DD). */
function mondayOf(day: string) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

async function currentValue(db: Queryable, userId: number, goal: GoalRow, tzOffset: number) {
  const today = localToday(tzOffset)
  switch (goal.kind) {
    case 'aproveitamento': {
      const row = await one<{ makes: number; attempts: number }>(
        db,
        `SELECT COALESCE(SUM(se.makes), 0)::float8 AS makes, COALESCE(SUM(se.attempts), 0)::float8 AS attempts
         FROM session_entries se JOIN practice_sessions s ON s.id = se.session_id
         WHERE s.user_id = $1 AND s.performed_at >= now() - interval '30 days'
           AND ($2::int IS NULL OR se.exercise_id = $2)`,
        [userId, goal.exerciseId],
      )
      return row!.attempts ? Math.round((row!.makes / row!.attempts) * 100) : 0
    }
    case 'sessoes_semana':
    case 'minutos_semana': {
      const row = await one<{ sessions: number; minutes: number }>(
        db,
        `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(s.duration_minutes), 0)::float8 AS minutes
         FROM practice_sessions s WHERE s.user_id = $1 AND ${localDay('$2')} >= $3::date`,
        [userId, tzOffset, mondayOf(today)],
      )
      return goal.kind === 'sessoes_semana' ? row!.sessions : row!.minutes
    }
    case 'sessoes_total':
    case 'minutos_total': {
      const row = await one<{ sessions: number; minutes: number }>(
        db,
        `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(s.duration_minutes), 0)::float8 AS minutes
         FROM practice_sessions s WHERE s.user_id = $1 AND s.performed_at >= $2`,
        [userId, goal.createdAt],
      )
      return goal.kind === 'sessoes_total' ? row!.sessions : row!.minutes
    }
    case 'cestas_total': {
      const row = await one<{ makes: number }>(
        db,
        `SELECT COALESCE(SUM(se.makes), 0)::float8 AS makes
         FROM session_entries se JOIN practice_sessions s ON s.id = se.session_id
         WHERE s.user_id = $1 AND s.performed_at >= $2 AND ($3::int IS NULL OR se.exercise_id = $3)`,
        [userId, goal.createdAt, goal.exerciseId],
      )
      return row!.makes
    }
    case 'dias_seguidos': {
      const days = await many<{ day: string }>(
        db,
        `SELECT DISTINCT to_char(${localDay('$2')}, 'YYYY-MM-DD') AS day FROM practice_sessions s WHERE s.user_id = $1`,
        [userId, tzOffset],
      )
      return streaks(
        days.map((d) => d.day),
        today,
      ).current
    }
  }
}

export function goalsRouter(db: Database) {
  const router = Router()

  const findGoal = async (id: number, userId: number) => {
    const goal = await one<GoalRow>(
      db,
      `SELECT ${COLUMNS} FROM goals g LEFT JOIN exercises e ON e.id = g.exercise_id WHERE g.id = $1 AND g.user_id = $2`,
      [id, userId],
    )
    if (!goal) throw notFound('Meta')
    return goal
  }

  const withProgress = async (goal: GoalRow, userId: number, tzOffset: number) => {
    const current = await currentValue(db, userId, goal, tzOffset)
    return { ...goal, current, achieved: current >= goal.target }
  }

  const validate = async (body: z.infer<typeof goalSchema>, userId: number) => {
    if (body.exerciseId != null) await assertExercisesVisible(db, [body.exerciseId], userId)
    assertGoalExerciseKind(body)
  }

  router.get('/', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const goals = await many<GoalRow>(
      db,
      `SELECT ${COLUMNS} FROM goals g LEFT JOIN exercises e ON e.id = g.exercise_id
       WHERE g.user_id = $1 ORDER BY g.created_at DESC, g.id DESC`,
      [userId],
    )
    res.json(await Promise.all(goals.map((goal) => withProgress(goal, userId, tzOffset))))
  })

  router.post('/', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const body = parse(goalSchema, req.body)
    await validate(body, userId)
    const { id } = (await one<{ id: number }>(
      db,
      `INSERT INTO goals (user_id, title, kind, target, exercise_id, deadline) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, body.title, body.kind, body.target, body.exerciseId ?? null, body.deadline?.slice(0, 10) ?? null],
    ))!
    res.status(201).json(await withProgress(await findGoal(id, userId), userId, tzOffset))
  })

  router.put('/:id', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(idParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    const body = parse(goalSchema, req.body)
    await findGoal(id, userId)
    await validate(body, userId)
    await db.query(
      `UPDATE goals SET title = $1, kind = $2, target = $3, exercise_id = $4, deadline = $5 WHERE id = $6`,
      [body.title, body.kind, body.target, body.exerciseId ?? null, body.deadline?.slice(0, 10) ?? null, id],
    )
    res.json(await withProgress(await findGoal(id, userId), userId, tzOffset))
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { rowCount } = await db.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [id, currentUser(req)])
    if (!rowCount) throw notFound('Meta')
    res.status(204).end()
  })

  return router
}
