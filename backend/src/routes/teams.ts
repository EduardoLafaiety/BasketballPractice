import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { findProgram } from '../db/programs.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { dbId, idParam, isoDate, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { assertExercisesVisible } from './exercises.js'
import { monthlyCards } from './card.js'
import { tzQuery } from './sessions.js'
import { localToday, streaks } from './stats.js'

const MAX_TEAMS_PER_COACH = 10
const MAX_MEMBERS = 60
const MAX_ASSIGNMENTS = 100

const newCode = () => randomBytes(6).toString('base64url')

const teamSchema = z.object({ name: z.string().trim().min(2).max(60) })
const codeSchema = z.object({ code: z.string().trim().min(6).max(20) })
const memberParam = idParam.extend({ userId: z.coerce.number().int().positive() })
const assignmentParam = idParam.extend({ assignmentId: z.coerce.number().int().positive() })

const assignmentSchema = z
  .object({
    kind: z.enum(['programa', 'treino']),
    programId: z.string().max(60).nullish(),
    title: z.string().trim().min(2).max(100),
    blocks: z.array(z.object({ exerciseId: dbId, minutes: z.number().int().min(1).max(120) })).max(20).default([]),
    dueOn: isoDate.transform((v) => v.slice(0, 10)).nullish(),
    notes: z.string().trim().max(1000).nullish(),
  })
  .superRefine((a, ctx) => {
    if (a.kind === 'programa' && !findProgram(a.programId ?? '')) ctx.addIssue({ code: 'custom', path: ['programId'], message: 'Programa inexistente' })
    if (a.kind === 'treino' && a.blocks.length === 0) ctx.addIssue({ code: 'custom', path: ['blocks'], message: 'Escolha pelo menos um exercício' })
  })

type Team = { id: number; coachId: number; name: string; inviteCode: string }
type Assignment = { id: number; kind: 'programa' | 'treino'; programId: string | null; title: string; blocks: { exerciseId: number; minutes: number }[]; dueOn: string | null; notes: string | null; createdAt: string }

const TEAM_COLUMNS = `t.id, t.coach_id AS "coachId", t.name, t.invite_code AS "inviteCode"`
const ASSIGNMENT_COLUMNS = `a.id, a.kind, a.program_id AS "programId", a.title, a.blocks, to_char(a.due_on, 'YYYY-MM-DD') AS "dueOn", a.notes, a.created_at AS "createdAt"`

async function findTeam(db: Queryable, id: number) {
  const team = await one<Team>(db, `SELECT ${TEAM_COLUMNS} FROM teams t WHERE t.id = $1`, [id])
  if (!team) throw notFound('Time')
  return team
}

const isMember = async (db: Queryable, teamId: number, userId: number) =>
  !!(await one(db, 'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]))

/** Técnico ou atleta do time; quem não é nenhum dos dois não descobre nem que o time existe. */
async function teamFor(db: Queryable, id: number, userId: number) {
  const team = await findTeam(db, id)
  if (team.coachId === userId) return { team, role: 'tecnico' as const }
  if (await isMember(db, id, userId)) return { team, role: 'atleta' as const }
  throw notFound('Time')
}

async function requireCoach(db: Queryable, id: number, userId: number) {
  const { team, role } = await teamFor(db, id, userId)
  if (role !== 'tecnico') throw new HttpError(403, 'Só o técnico pode fazer isso')
  return team
}

/** Exercícios das tarefas de treino, com nome e métrica, para a sessão guiada. */
async function withExerciseNames(db: Queryable, assignments: Assignment[]) {
  const ids = [...new Set(assignments.flatMap((a) => a.blocks.map((b) => b.exerciseId)))]
  const rows = ids.length
    ? await many<{ id: number; name: string; category: string; metric: string }>(db, 'SELECT id, name, category, metric FROM exercises WHERE id = ANY($1::int[])', [ids])
    : []
  const byId = new Map(rows.map((r) => [r.id, r]))
  return assignments.map((a) => ({
    ...a,
    programName: a.programId ? (findProgram(a.programId)?.name ?? a.programId) : null,
    blocks: a.blocks.flatMap((b) => {
      const e = byId.get(b.exerciseId)
      return e ? [{ exerciseId: e.id, name: e.name, category: e.category, metric: e.metric, minutes: b.minutes }] : []
    }),
  }))
}

/** Progresso de cada atleta: semana, sequência, último treino, nota do cartão e as tarefas cumpridas. */
async function memberProgress(db: Queryable, userIds: number[], assignments: Assignment[], tzOffset: number) {
  if (!userIds.length) return new Map()
  const today = localToday(tzOffset)
  const [week, days, done, programs] = await Promise.all([
    many<{ userId: number; sessions: number; minutes: number; last: string | null }>(
      db,
      `SELECT u.id AS "userId",
              COUNT(s.id) FILTER (WHERE s.performed_at >= now() - interval '7 days')::int AS sessions,
              COALESCE(SUM(s.duration_minutes) FILTER (WHERE s.performed_at >= now() - interval '7 days'), 0)::int AS minutes,
              MAX(s.performed_at) AS last
       FROM users u LEFT JOIN practice_sessions s ON s.user_id = u.id
       WHERE u.id = ANY($1::int[]) GROUP BY u.id`,
      [userIds],
    ),
    many<{ userId: number; day: string }>(
      db,
      `SELECT DISTINCT user_id AS "userId", to_char((performed_at - make_interval(mins => $2::int))::date, 'YYYY-MM-DD') AS day
       FROM practice_sessions WHERE user_id = ANY($1::int[]) AND performed_at >= now() - interval '400 days'`,
      [userIds, tzOffset],
    ),
    many<{ userId: number; assignmentId: number }>(
      db,
      `SELECT user_id AS "userId", assignment_id AS "assignmentId" FROM team_assignment_done WHERE user_id = ANY($1::int[]) AND assignment_id = ANY($2::int[])`,
      [userIds, assignments.map((a) => a.id)],
    ),
    many<{ userId: number; programId: string; done: number }>(
      db,
      `SELECT up.user_id AS "userId", up.program_id AS "programId", COUNT(d.day)::int AS done
       FROM user_programs up LEFT JOIN program_days_done d ON d.user_id = up.user_id AND d.program_id = up.program_id
       WHERE up.user_id = ANY($1::int[]) GROUP BY 1, 2`,
      [userIds],
    ),
  ])
  const cards = new Map(await Promise.all(userIds.map(async (id) => [id, (await monthlyCards(db, id, tzOffset)).at(-1) ?? null] as const)))
  return new Map(
    userIds.map((id) => {
      const w = week.find((x) => x.userId === id)
      const tasks = assignments.map((a) => {
        if (a.kind === 'programa') {
          const p = programs.find((x) => x.userId === id && x.programId === a.programId)
          const total = findProgram(a.programId!)?.days.length ?? 0
          return { assignmentId: a.id, started: !!p, done: p?.done ?? 0, total, completed: !!p && p.done >= total }
        }
        const feito = done.some((d) => d.userId === id && d.assignmentId === a.id)
        return { assignmentId: a.id, started: feito, done: feito ? 1 : 0, total: 1, completed: feito }
      })
      const card = cards.get(id)
      return [
        id,
        {
          sessionsWeek: w?.sessions ?? 0,
          minutesWeek: w?.minutes ?? 0,
          lastSessionAt: w?.last ?? null,
          streak: streaks(days.filter((d) => d.userId === id).map((d) => d.day), today).current,
          card: card ? { month: card.month, overall: card.overall } : null,
          tasks,
        },
      ]
    }),
  )
}

export function teamsRouter(db: Database) {
  const router = Router()

  // Times que eu treino (técnico) e times em que eu treino (atleta).
  router.get('/', async (req, res) => {
    const userId = currentUser(req)
    const [coaching, member] = await Promise.all([
      many(
        db,
        `SELECT ${TEAM_COLUMNS}, (SELECT COUNT(*)::int FROM team_members m WHERE m.team_id = t.id) AS members
         FROM teams t WHERE t.coach_id = $1 ORDER BY t.created_at`,
        [userId],
      ),
      many(
        db,
        `SELECT t.id, t.name, u.name AS "coachName" FROM team_members m JOIN teams t ON t.id = m.team_id JOIN users u ON u.id = t.coach_id
         WHERE m.user_id = $1 ORDER BY m.joined_at`,
        [userId],
      ),
    ])
    res.json({ coaching, member })
  })

  router.post('/', async (req, res) => {
    const userId = currentUser(req)
    const { name } = parse(teamSchema, req.body)
    const { n } = (await one<{ n: number }>(db, 'SELECT COUNT(*)::int AS n FROM teams WHERE coach_id = $1', [userId]))!
    if (n >= MAX_TEAMS_PER_COACH) throw new HttpError(400, `Limite de ${MAX_TEAMS_PER_COACH} times por técnico`)
    const team = await one<Team>(
      db,
      `INSERT INTO teams (coach_id, name, invite_code) VALUES ($1, $2, $3) RETURNING id, coach_id AS "coachId", name, invite_code AS "inviteCode"`,
      [userId, name, newCode()],
    )
    res.status(201).json(team)
  })

  // Prévia do convite: nome do time e do técnico, antes de entrar.
  router.get('/invites/:code', async (req, res) => {
    const { code } = parse(codeSchema, req.params)
    const userId = currentUser(req)
    const team = await one<{ id: number; name: string; coachId: number; coachName: string }>(
      db,
      `SELECT t.id, t.name, t.coach_id AS "coachId", u.name AS "coachName" FROM teams t JOIN users u ON u.id = t.coach_id WHERE t.invite_code = $1`,
      [code],
    )
    if (!team) throw notFound('Convite')
    res.json({ id: team.id, name: team.name, coachName: team.coachName, coach: team.coachId === userId, member: await isMember(db, team.id, userId) })
  })

  router.post('/join', async (req, res) => {
    const userId = currentUser(req)
    const { code } = parse(codeSchema, req.body)
    const team = await one<Team>(db, `SELECT ${TEAM_COLUMNS} FROM teams t WHERE t.invite_code = $1`, [code])
    if (!team) throw notFound('Convite')
    if (team.coachId === userId) throw new HttpError(400, 'Você é o técnico deste time')
    const { n } = (await one<{ n: number }>(db, 'SELECT COUNT(*)::int AS n FROM team_members WHERE team_id = $1', [team.id]))!
    if (n >= MAX_MEMBERS) throw new HttpError(400, `O time já tem ${MAX_MEMBERS} atletas`)
    await db.query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [team.id, userId])
    res.status(201).json({ id: team.id, name: team.name })
  })

  router.get('/:id', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(idParam, req.params)
    const { tzOffset } = parse(tzQuery, req.query)
    const { team, role } = await teamFor(db, id, userId)
    const assignments = await many<Assignment>(db, `SELECT ${ASSIGNMENT_COLUMNS} FROM team_assignments a WHERE a.team_id = $1 ORDER BY a.created_at DESC, a.id DESC`, [id])
    const coach = await one<{ name: string }>(db, 'SELECT name FROM users WHERE id = $1', [team.coachId])
    const tasks = await withExerciseNames(db, assignments)

    if (role === 'tecnico') {
      const members = await many<{ id: number; name: string; joinedAt: string }>(
        db,
        `SELECT u.id, u.name, m.joined_at AS "joinedAt" FROM team_members m JOIN users u ON u.id = m.user_id WHERE m.team_id = $1 ORDER BY lower(u.name)`,
        [id],
      )
      const progress = await memberProgress(db, members.map((m) => m.id), assignments, tzOffset)
      res.json({ id, name: team.name, role, coachName: coach!.name, inviteCode: team.inviteCode, assignments: tasks, members: members.map((m) => ({ ...m, progress: progress.get(m.id) })) })
      return
    }
    // O atleta vê as tarefas e o próprio progresso nelas, nunca o dos colegas.
    const mine = (await memberProgress(db, [userId], assignments, tzOffset)).get(userId)
    res.json({ id, name: team.name, role, coachName: coach!.name, assignments: tasks, progress: mine })
  })

  router.post('/:id/invite', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await requireCoach(db, id, currentUser(req))
    const code = newCode()
    await db.query('UPDATE teams SET invite_code = $1 WHERE id = $2', [code, id])
    res.json({ inviteCode: code })
  })

  router.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { name } = parse(teamSchema, req.body)
    await requireCoach(db, id, currentUser(req))
    await db.query('UPDATE teams SET name = $1 WHERE id = $2', [name, id])
    res.json({ id, name })
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await requireCoach(db, id, currentUser(req))
    await db.query('DELETE FROM teams WHERE id = $1', [id])
    res.status(204).end()
  })

  // O técnico tira um atleta; o atleta sai do time (userId = ele mesmo).
  router.delete('/:id/members/:userId', async (req, res) => {
    const userId = currentUser(req)
    const { id, userId: target } = parse(memberParam, req.params)
    const { role } = await teamFor(db, id, userId)
    if (role !== 'tecnico' && target !== userId) throw new HttpError(403, 'Só o técnico pode tirar outro atleta')
    const { rowCount } = await db.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [id, target])
    if (!rowCount) throw notFound('Atleta')
    res.status(204).end()
  })

  router.post('/:id/assignments', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(idParam, req.params)
    await requireCoach(db, id, userId)
    const body = parse(assignmentSchema, req.body)
    // Treino só com exercícios do catálogo padrão: os do técnico não existem na conta dos atletas.
    if (body.kind === 'treino') {
      const ids = body.blocks.map((b) => b.exerciseId)
      await assertExercisesVisible(db, ids, userId)
      const own = await one(db, 'SELECT 1 FROM exercises WHERE id = ANY($1::int[]) AND user_id IS NOT NULL', [ids])
      if (own) throw new HttpError(400, 'Use exercícios do catálogo: os seus exercícios próprios não aparecem para os atletas')
    }
    const { n } = (await one<{ n: number }>(db, 'SELECT COUNT(*)::int AS n FROM team_assignments WHERE team_id = $1', [id]))!
    if (n >= MAX_ASSIGNMENTS) throw new HttpError(400, `Limite de ${MAX_ASSIGNMENTS} tarefas por time`)
    const row = await one<Assignment>(
      db,
      `INSERT INTO team_assignments (team_id, kind, program_id, title, blocks, due_on, notes) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, kind, program_id AS "programId", title, blocks, to_char(due_on, 'YYYY-MM-DD') AS "dueOn", notes, created_at AS "createdAt"`,
      [id, body.kind, body.kind === 'programa' ? body.programId : null, body.title, JSON.stringify(body.kind === 'treino' ? body.blocks : []), body.dueOn ?? null, body.notes ?? null],
    )
    res.status(201).json((await withExerciseNames(db, [row!]))[0])
  })

  router.delete('/:id/assignments/:assignmentId', async (req, res) => {
    const { id, assignmentId } = parse(assignmentParam, req.params)
    await requireCoach(db, id, currentUser(req))
    const { rowCount } = await db.query('DELETE FROM team_assignments WHERE id = $1 AND team_id = $2', [assignmentId, id])
    if (!rowCount) throw notFound('Tarefa')
    res.status(204).end()
  })

  // O atleta marca o treino do técnico como feito (com a sessão registrada, se houver).
  router.post('/:id/assignments/:assignmentId/done', async (req, res) => {
    const userId = currentUser(req)
    const { id, assignmentId } = parse(assignmentParam, req.params)
    const { sessionId } = parse(z.object({ sessionId: dbId.nullish() }).default({}), req.body ?? {})
    const { role } = await teamFor(db, id, userId)
    if (role !== 'atleta') throw new HttpError(403, 'Só os atletas do time cumprem as tarefas')
    const task = await one<{ kind: string }>(db, 'SELECT kind FROM team_assignments WHERE id = $1 AND team_id = $2', [assignmentId, id])
    if (!task) throw notFound('Tarefa')
    if (task.kind !== 'treino') throw new HttpError(400, 'Programas andam pelos dias do próprio programa')
    if (sessionId != null && !(await one(db, 'SELECT 1 FROM practice_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]))) throw notFound('Sessão')
    await db.query(
      `INSERT INTO team_assignment_done (assignment_id, user_id, session_id) VALUES ($1, $2, $3)
       ON CONFLICT (assignment_id, user_id) DO UPDATE SET session_id = COALESCE(EXCLUDED.session_id, team_assignment_done.session_id), done_at = now()`,
      [assignmentId, userId, sessionId ?? null],
    )
    res.status(201).json({ done: true })
  })

  return router
}
