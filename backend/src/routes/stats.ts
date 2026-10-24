import { Router } from 'express'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { dateRangeFilter, dateRangeQuery, tzQuery, ZONES } from './sessions.js'

export { tzQuery }

const percentage = (makes: number | null, attempts: number | null) =>
  attempts ? Math.round(((makes ?? 0) / attempts) * 1000) / 10 : null

/** Expressão SQL do dia local de s.performed_at; `param` é o placeholder do tzOffset. */
export const localDay = (param: string) => `(s.performed_at - make_interval(mins => ${param}::int))::date`

/** Data local de hoje (AAAA-MM-DD) para o fuso do cliente. */
export const localToday = (tzOffset: number) => new Date(Date.now() - tzOffset * 60_000).toISOString().slice(0, 10)

const DAY = 86_400_000
const dayNumber = (isoDay: string) => Math.round(Date.parse(`${isoDay}T00:00:00Z`) / DAY)

/** Sequência atual (vale até ontem, para não zerar antes do treino de hoje) e a melhor de todas. */
export function streaks(days: string[], today: string) {
  const sorted = [...new Set(days)].map(dayNumber).sort((a, b) => a - b)
  let best = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  const last = sorted.at(-1)
  const current = last !== undefined && dayNumber(today) - last <= 1 ? run : 0
  return { current, best }
}

type Totals = {
  sessions: number
  minutes: number
  makes: number
  attempts: number
  bestFreeThrowStreak: number
  bestDayMakes: number
  tests: number
}

type Achievement = { id: string; title: string; description: string; target: number; value: (t: Totals & { bestStreak: number }) => number }

const ACHIEVEMENTS: Achievement[] = [
  { id: 'primeira-sessao', title: 'Primeiro treino', description: 'Registre sua primeira sessão.', target: 1, value: (t) => t.sessions },
  { id: '10-sessoes', title: 'Constância', description: 'Complete 10 sessões.', target: 10, value: (t) => t.sessions },
  { id: '50-sessoes', title: 'Rato de quadra', description: 'Complete 50 sessões.', target: 50, value: (t) => t.sessions },
  { id: '100-sessoes', title: 'Centenário', description: 'Complete 100 sessões.', target: 100, value: (t) => t.sessions },
  { id: '3-dias', title: 'Embalado', description: 'Treine 3 dias seguidos.', target: 3, value: (t) => t.bestStreak },
  { id: '7-dias', title: 'Semana perfeita', description: 'Treine 7 dias seguidos.', target: 7, value: (t) => t.bestStreak },
  { id: '30-dias', title: 'Imparável', description: 'Treine 30 dias seguidos.', target: 30, value: (t) => t.bestStreak },
  { id: '10-horas', title: '10 horas de quadra', description: 'Acumule 600 minutos de treino.', target: 600, value: (t) => t.minutes },
  { id: '100-num-dia', title: 'Mão quente', description: 'Converta 100 arremessos em um único dia.', target: 100, value: (t) => t.bestDayMakes },
  { id: '1000-cestas', title: 'Mil cestas', description: 'Converta 1.000 arremessos no total.', target: 1000, value: (t) => t.makes },
  { id: 'sequencia-10', title: 'Sangue frio', description: 'Acerte 10 arremessos seguidos num exercício.', target: 10, value: (t) => t.bestFreeThrowStreak },
  { id: 'sequencia-25', title: 'Automático', description: 'Acerte 25 arremessos seguidos num exercício.', target: 25, value: (t) => t.bestFreeThrowStreak },
  { id: 'teste-fisico', title: 'Laboratório', description: 'Registre um teste físico.', target: 1, value: (t) => t.tests },
]

async function progress(db: Queryable, userId: number, tzOffset: number) {
  const [days, totals] = await Promise.all([
    many<{ day: string }>(
      db,
      `SELECT DISTINCT to_char(${localDay('$2')}, 'YYYY-MM-DD') AS day FROM practice_sessions s WHERE s.user_id = $1`,
      [userId, tzOffset],
    ),
    one<Totals>(
      db,
      `SELECT
         (SELECT COUNT(*) FROM practice_sessions WHERE user_id = $1)::int AS sessions,
         (SELECT COALESCE(SUM(duration_minutes), 0) FROM practice_sessions WHERE user_id = $1)::int AS minutes,
         (SELECT COALESCE(SUM(se.makes), 0) FROM session_entries se
            JOIN practice_sessions s ON s.id = se.session_id WHERE s.user_id = $1)::int AS makes,
         (SELECT COALESCE(SUM(se.attempts), 0) FROM session_entries se
            JOIN practice_sessions s ON s.id = se.session_id WHERE s.user_id = $1)::int AS attempts,
         (SELECT COALESCE(MAX(se.best_streak), 0) FROM session_entries se
            JOIN practice_sessions s ON s.id = se.session_id WHERE s.user_id = $1)::int AS "bestFreeThrowStreak",
         (SELECT COALESCE(MAX(day_makes), 0) FROM (
            SELECT SUM(se.makes) AS day_makes FROM session_entries se
            JOIN practice_sessions s ON s.id = se.session_id
            WHERE s.user_id = $1 GROUP BY ${localDay('$2')}) d)::int AS "bestDayMakes",
         (SELECT COUNT(*) FROM physical_tests WHERE user_id = $1)::int AS tests`,
      [userId, tzOffset],
    ),
  ])

  const streak = streaks(
    days.map((d) => d.day),
    localToday(tzOffset),
  )
  const all = { ...totals!, bestStreak: streak.best }
  return {
    streak,
    totals: totals!,
    achievements: ACHIEVEMENTS.map(({ value, ...achievement }) => {
      const current = value(all)
      return { ...achievement, progress: Math.min(current, achievement.target), unlocked: current >= achievement.target }
    }),
  }
}

export function statsRouter(db: Database) {
  const router = Router()

  router.get('/summary', async (req, res) => {
    const userId = currentUser(req)
    const query = parse(dateRangeQuery, req.query)
    const range = dateRangeFilter(query, 2)
    const params = [userId, ...range.params]

    const [totals, byExercise, byWeek] = await Promise.all([
      one(
        db,
        `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(s.duration_minutes), 0)::int AS minutes,
                ROUND(AVG(s.rating), 1)::float8 AS "averageRating",
                ROUND(AVG(s.fatigue), 1)::float8 AS "averageFatigue"
         FROM practice_sessions s WHERE s.user_id = $1 AND ${range.sql}`,
        params,
      ),
      many<{ makes: number | null; attempts: number | null }>(
        db,
        `SELECT e.id AS "exerciseId", e.name, e.category, e.metric,
                COUNT(DISTINCT s.id)::int AS sessions,
                SUM(se.makes)::int AS makes, SUM(se.attempts)::int AS attempts,
                SUM(se.reps)::int AS reps, SUM(se.seconds)::int AS seconds,
                MAX(se.best_streak)::int AS "bestStreak"
         FROM session_entries se
         JOIN practice_sessions s ON s.id = se.session_id
         JOIN exercises e ON e.id = se.exercise_id
         WHERE s.user_id = $1 AND ${range.sql}
         GROUP BY e.id ORDER BY sessions DESC, e.name`,
        params,
      ),
      // Semanas começam na segunda-feira (date_trunc 'week' segue a ISO 8601), no fuso do cliente.
      // Os arremessos são somados numa subconsulta para não multiplicar minutos pelas entries.
      many<{ makes: number | null; attempts: number | null }>(
        db,
        `SELECT to_char(date_trunc('week', ${localDay('$4')}::timestamp), 'YYYY-MM-DD') AS "weekStart",
                COUNT(*)::int AS sessions, COALESCE(SUM(s.duration_minutes), 0)::int AS minutes,
                SUM(t.makes)::int AS makes, SUM(t.attempts)::int AS attempts
         FROM practice_sessions s
         LEFT JOIN (
           SELECT session_id, SUM(makes) AS makes, SUM(attempts) AS attempts FROM session_entries GROUP BY session_id
         ) t ON t.session_id = s.id
         WHERE s.user_id = $1 AND ${range.sql}
         GROUP BY 1 ORDER BY 1`,
        [...params, query.tzOffset],
      ),
    ])

    const shooting = { makes: 0, attempts: 0 }
    for (const row of byExercise) {
      shooting.makes += row.makes ?? 0
      shooting.attempts += row.attempts ?? 0
    }

    res.json({
      totals,
      shooting: { ...shooting, percentage: percentage(shooting.makes, shooting.attempts) },
      byExercise: byExercise.map((row) => ({ ...row, percentage: percentage(row.makes, row.attempts) })),
      byWeek: byWeek.map((row) => ({ ...row, percentage: percentage(row.makes, row.attempts) })),
    })
  })

  // Aproveitamento por zona da quadra (shot chart). Zonas sem arremessos vêm zeradas.
  router.get('/zones', async (req, res) => {
    const range = dateRangeFilter(parse(dateRangeQuery, req.query), 2)
    const rows = await many<{ zone: string; makes: number; attempts: number }>(
      db,
      `SELECT sh.zone, SUM(sh.makes)::int AS makes, SUM(sh.attempts)::int AS attempts
       FROM session_shots sh JOIN practice_sessions s ON s.id = sh.session_id
       WHERE s.user_id = $1 AND ${range.sql}
       GROUP BY sh.zone`,
      [currentUser(req), ...range.params],
    )
    const byZone = new Map(rows.map((row) => [row.zone, row]))
    res.json(
      ZONES.map((zone) => {
        const { makes = 0, attempts = 0 } = byZone.get(zone) ?? {}
        return { zone, makes, attempts, percentage: percentage(makes, attempts) }
      }),
    )
  })

  // Sequência de dias treinando, totais da carreira e conquistas.
  router.get('/progress', async (req, res) => {
    const { tzOffset } = parse(tzQuery, req.query)
    res.json(await progress(db, currentUser(req), tzOffset))
  })

  return router
}
