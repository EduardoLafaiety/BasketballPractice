import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { isPgError, many, one, UNIQUE_VIOLATION, type Database, type Queryable } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { idParam, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { CARD_SKILLS, skillRating } from './card.js'
import { tzQuery } from './sessions.js'
import { localToday, streaks } from './stats.js'

// ---------- Métricas ----------

/** O que entra no ranking. Todas saem de dados que o servidor já validou. */
export const RANKING_METRICS = ['lances_livres', 'desafio', 'quiz', 'sequencia', 'cartao'] as const
/** O que dá para disputar num desafio entre amigos. */
export const CHALLENGE_METRICS = ['lances_livres', 'cestas', 'minutos', 'desafio', 'quiz'] as const

type RankingMetric = (typeof RANKING_METRICS)[number]
type ChallengeMetric = (typeof CHALLENGE_METRICS)[number]

// Tetos contra valores absurdos: uma sessão nunca soma mais que isso no ranking, mesmo que a API de sessões aceite.
export const CAP_MAKES_PER_ENTRY = 200
export const CAP_MINUTES_PER_SESSION = 300

/** Intervalo [from, to) em instantes e em dias (para as tabelas por dia). Sem from, todo o histórico. */
interface Period {
  from: Date | null
  to: Date
  fromDay: string | null
  toDay: string
}

const DAY = 86_400_000
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

/** Segunda-feira da semana de `day`. */
export function mondayOf(day: string) {
  const date = new Date(`${day}T00:00:00Z`)
  return addDays(day, -((date.getUTCDay() + 6) % 7))
}

/** Meia-noite local (tzOffset no formato de getTimezoneOffset) de um dia, como instante. */
const localMidnight = (day: string, tzOffset: number) => new Date(Date.parse(`${day}T00:00:00Z`) + tzOffset * 60_000)

export function weekPeriod(weekStart: string, tzOffset: number): Period {
  const toDay = addDays(weekStart, 7)
  return { from: localMidnight(weekStart, tzOffset), to: localMidnight(toDay, tzOffset), fromDay: weekStart, toDay }
}

const allTime = (tzOffset: number): Period => {
  const toDay = addDays(localToday(tzOffset), 1)
  return { from: null, to: localMidnight(toDay, tzOffset), fromDay: null, toDay }
}

type Values = Map<number, number>
const toMap = (rows: { userId: number; value: number }[]): Values => new Map(rows.map((r) => [r.userId, Number(r.value)]))

/** Cestas no período (só lances livres, ou todas), com teto por exercício registrado. Sessões futuras não contam. */
function sumMakes(db: Queryable, ids: number[], p: Period, onlyFreeThrows: boolean) {
  return many<{ userId: number; value: number }>(
    db,
    `SELECT s.user_id AS "userId", SUM(LEAST(se.makes, ${CAP_MAKES_PER_ENTRY}))::float8 AS value
     FROM session_entries se
     JOIN practice_sessions s ON s.id = se.session_id
     JOIN exercises e ON e.id = se.exercise_id
     WHERE s.user_id = ANY($1::int[]) AND se.makes IS NOT NULL AND se.attempts IS NOT NULL
       AND ($2::timestamptz IS NULL OR s.performed_at >= $2) AND s.performed_at < LEAST($3::timestamptz, now() + interval '1 hour')
       AND (NOT $4::boolean OR e.name ILIKE 'lance livre%')
     GROUP BY 1`,
    [ids, p.from?.toISOString() ?? null, p.to.toISOString(), onlyFreeThrows],
  ).then(toMap)
}

function sumMinutes(db: Queryable, ids: number[], p: Period) {
  return many<{ userId: number; value: number }>(
    db,
    `SELECT s.user_id AS "userId", SUM(LEAST(COALESCE(s.duration_minutes, 0), ${CAP_MINUTES_PER_SESSION}))::float8 AS value
     FROM practice_sessions s
     WHERE s.user_id = ANY($1::int[]) AND ($2::timestamptz IS NULL OR s.performed_at >= $2) AND s.performed_at < LEAST($3::timestamptz, now() + interval '1 hour')
     GROUP BY 1`,
    [ids, p.from?.toISOString() ?? null, p.to.toISOString()],
  ).then(toMap)
}

function sumDaily(db: Queryable, table: 'daily_challenge_results' | 'quiz_results', column: string, ids: number[], p: Period) {
  return many<{ userId: number; value: number }>(
    db,
    `SELECT user_id AS "userId", SUM(${column})::float8 AS value FROM ${table}
     WHERE user_id = ANY($1::int[]) AND ($2::date IS NULL OR day >= $2) AND day < $3::date GROUP BY 1`,
    [ids, p.fromDay, p.toDay],
  ).then(toMap)
}

/** Semana: dias com treino na semana. Geral: sequência atual de dias. */
async function trainingDays(db: Queryable, ids: number[], p: Period, tzOffset: number, weekly: boolean) {
  const rows = await many<{ userId: number; day: string }>(
    db,
    `SELECT DISTINCT s.user_id AS "userId", to_char((s.performed_at - make_interval(mins => $2::int))::date, 'YYYY-MM-DD') AS day
     FROM practice_sessions s
     WHERE s.user_id = ANY($1::int[]) AND ($3::timestamptz IS NULL OR s.performed_at >= $3) AND s.performed_at < LEAST($4::timestamptz, now() + interval '1 hour')`,
    [ids, tzOffset, (weekly ? p.from : new Date(Date.now() - 400 * DAY))?.toISOString() ?? null, p.to.toISOString()],
  )
  const byUser = new Map<number, string[]>()
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r.day])
  const today = localToday(tzOffset)
  return new Map([...byUser].map(([id, days]) => [id, weekly ? days.length : streaks(days, today).current]))
}

/** Nota do cartão: semana = cartão do mês atual; geral = a melhor nota mensal. Só meses com a bateria completa. */
async function cardRatings(db: Queryable, ids: number[], tzOffset: number, weekly: boolean) {
  const rows = await many<{ userId: number; month: string; kind: string; best: number; worst: number }>(
    db,
    `SELECT user_id AS "userId", to_char(performed_at - make_interval(mins => $2::int), 'YYYY-MM') AS month, kind,
            MAX(value)::float8 AS best, MIN(value)::float8 AS worst
     FROM physical_tests WHERE user_id = ANY($1::int[]) AND kind = ANY($3::text[]) GROUP BY 1, 2, 3`,
    [ids, tzOffset, CARD_SKILLS.map((s) => s.test)],
  )
  const currentMonth = localToday(tzOffset).slice(0, 7)
  const overall = new Map<string, { userId: number; ratings: number[] }>()
  for (const r of rows) {
    if (weekly && r.month !== currentMonth) continue
    const skill = CARD_SKILLS.find((s) => s.test === r.kind)!
    const key = `${r.userId}:${r.month}`
    const entry = overall.get(key) ?? { userId: r.userId, ratings: [] }
    entry.ratings.push(skillRating(skill, skill.zero > skill.top ? r.worst : r.best))
    overall.set(key, entry)
  }
  const result: Values = new Map()
  for (const { userId, ratings } of overall.values()) {
    if (ratings.length < CARD_SKILLS.length) continue
    const avg = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
    result.set(userId, Math.max(result.get(userId) ?? 0, avg))
  }
  return result
}

export function metricValues(db: Queryable, metric: RankingMetric | ChallengeMetric, ids: number[], p: Period, tzOffset: number, weekly: boolean) {
  if (!ids.length) return Promise.resolve(new Map() as Values)
  switch (metric) {
    case 'lances_livres':
      return sumMakes(db, ids, p, true)
    case 'cestas':
      return sumMakes(db, ids, p, false)
    case 'minutos':
      return sumMinutes(db, ids, p)
    case 'desafio':
      return sumDaily(db, 'daily_challenge_results', 'makes', ids, p)
    case 'quiz':
      return sumDaily(db, 'quiz_results', 'correct', ids, p)
    case 'sequencia':
      return trainingDays(db, ids, p, tzOffset, weekly)
    case 'cartao':
      return cardRatings(db, ids, tzOffset, weekly)
  }
}

// ---------- Perfil ----------

const NICKNAME = /^[\p{L}\p{N}_.-]{3,20}$/u

const profileSchema = z.object({
  nickname: z.string().trim().regex(NICKNAME, 'Use de 3 a 20 letras, números, ponto, hífen ou sublinhado'),
  public: z.boolean().default(true),
})

type Profile = { userId: number; nickname: string; public: boolean; inviteCode: string }

const newInviteCode = () => randomBytes(9).toString('base64url')

const findProfile = (db: Queryable, userId: number) =>
  one<Profile>(db, `SELECT user_id AS "userId", nickname, public, invite_code AS "inviteCode" FROM profiles WHERE user_id = $1`, [userId])

async function requireProfile(db: Queryable, userId: number) {
  const profile = await findProfile(db, userId)
  if (!profile) throw new HttpError(409, 'Crie seu perfil do ranking primeiro')
  return profile
}

const friendIds = async (db: Queryable, userId: number) =>
  (await many<{ id: number }>(db, 'SELECT friend_id AS id FROM friendships WHERE user_id = $1', [userId])).map((r) => r.id)

const areFriends = async (db: Queryable, a: number, b: number) =>
  !!(await one(db, 'SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2', [a, b]))

// ---------- Rotas ----------

const rankingQuery = tzQuery.extend({
  metric: z.enum(RANKING_METRICS).default('lances_livres'),
  period: z.enum(['semana', 'geral']).default('semana'),
  scope: z.enum(['todos', 'amigos']).default('todos'),
})

const challengeSchema = z.object({ opponentId: z.number().int().positive(), metric: z.enum(CHALLENGE_METRICS) })

const RANKING_SIZE = 50
const MAX_PENDING_CHALLENGES = 10
const MAX_FRIENDS = 200

type ChallengeRow = {
  id: number
  challengerId: number
  opponentId: number
  challengerNickname: string
  opponentNickname: string
  metric: ChallengeMetric
  weekStart: string
  status: 'pendente' | 'aceito' | 'recusado' | 'cancelado'
}

type Notify = (userId: number, message: { title: string; body: string; url?: string; tag?: string }) => void

export function socialRouter(db: Database, { notificar }: { notificar?: Notify } = {}) {
  const router = Router()

  router.get('/profile', async (req, res) => {
    const userId = currentUser(req)
    const profile = await findProfile(db, userId)
    res.json(profile ? { nickname: profile.nickname, public: profile.public, inviteCode: profile.inviteCode, friends: (await friendIds(db, userId)).length } : null)
  })

  router.put('/profile', async (req, res) => {
    const userId = currentUser(req)
    const body = parse(profileSchema, req.body)
    try {
      const profile = await one<Profile>(
        db,
        `INSERT INTO profiles (user_id, nickname, public, invite_code) VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET nickname = EXCLUDED.nickname, public = EXCLUDED.public
         RETURNING user_id AS "userId", nickname, public, invite_code AS "inviteCode"`,
        [userId, body.nickname, body.public, newInviteCode()],
      )
      res.json({ nickname: profile!.nickname, public: profile!.public, inviteCode: profile!.inviteCode, friends: (await friendIds(db, userId)).length })
    } catch (error) {
      if (isPgError(error, UNIQUE_VIOLATION)) throw new HttpError(409, 'Esse apelido já está em uso')
      throw error
    }
  })

  // Sair do ranking: some o perfil, as amizades e os desafios (pela cascata). Os treinos continuam.
  router.delete('/profile', async (req, res) => {
    const { rowCount } = await db.query('DELETE FROM profiles WHERE user_id = $1', [currentUser(req)])
    if (!rowCount) throw notFound('Perfil')
    res.status(204).end()
  })

  router.post('/profile/invite', async (req, res) => {
    const userId = currentUser(req)
    await requireProfile(db, userId)
    const code = newInviteCode()
    await db.query('UPDATE profiles SET invite_code = $1 WHERE user_id = $2', [code, userId])
    res.json({ inviteCode: code })
  })

  router.get('/invites/:code', async (req, res) => {
    const { code } = parse(z.object({ code: z.string().min(6).max(40) }), req.params)
    const inviter = await one<{ userId: number; nickname: string }>(db, `SELECT user_id AS "userId", nickname FROM profiles WHERE invite_code = $1`, [code])
    if (!inviter) throw notFound('Convite')
    const userId = currentUser(req)
    res.json({ nickname: inviter.nickname, self: inviter.userId === userId, alreadyFriends: await areFriends(db, userId, inviter.userId) })
  })

  router.get('/friends', async (req, res) => {
    res.json(
      await many(
        db,
        `SELECT p.user_id AS id, p.nickname FROM friendships f JOIN profiles p ON p.user_id = f.friend_id
         WHERE f.user_id = $1 ORDER BY lower(p.nickname)`,
        [currentUser(req)],
      ),
    )
  })

  // Aceitar um convite: a amizade vale para os dois.
  router.post('/friends', async (req, res) => {
    const userId = currentUser(req)
    const { code } = parse(z.object({ code: z.string().min(6).max(40) }), req.body)
    await requireProfile(db, userId)
    const inviter = await one<{ userId: number; nickname: string }>(db, `SELECT user_id AS "userId", nickname FROM profiles WHERE invite_code = $1`, [code])
    if (!inviter) throw notFound('Convite')
    if (inviter.userId === userId) throw new HttpError(400, 'Esse é o seu próprio convite')
    const { n } = (await one<{ n: number }>(db, 'SELECT COUNT(*)::int AS n FROM friendships WHERE user_id = $1', [userId]))!
    if (n >= MAX_FRIENDS) throw new HttpError(400, `Limite de ${MAX_FRIENDS} amigos`)
    await db.query(
      `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING`,
      [userId, inviter.userId],
    )
    res.status(201).json({ id: inviter.userId, nickname: inviter.nickname })
  })

  router.delete('/friends/:id', async (req, res) => {
    const userId = currentUser(req)
    const { id } = parse(idParam, req.params)
    const { rowCount } = await db.query(
      'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [userId, id],
    )
    if (!rowCount) throw notFound('Amigo')
    // Desafios ainda em aberto entre os dois deixam de valer.
    await db.query(
      `UPDATE friend_challenges SET status = 'cancelado', responded_at = now()
       WHERE status IN ('pendente', 'aceito') AND ((challenger_id = $1 AND opponent_id = $2) OR (challenger_id = $2 AND opponent_id = $1))`,
      [userId, id],
    )
    res.status(204).end()
  })

  router.get('/ranking', async (req, res) => {
    const userId = currentUser(req)
    const { metric, period, scope, tzOffset } = parse(rankingQuery, req.query)
    const me = await findProfile(db, userId)
    const friends = me ? await friendIds(db, userId) : []
    // Todos: perfis públicos, mais você e os seus amigos. Amigos: só você e eles.
    const candidates =
      scope === 'amigos'
        ? me
          ? [userId, ...friends]
          : []
        : (await many<{ id: number }>(db, 'SELECT user_id AS id FROM profiles WHERE public OR user_id = $1 OR user_id = ANY($2::int[])', [userId, friends])).map((r) => r.id)
    const weekly = period === 'semana'
    const p = weekly ? weekPeriod(mondayOf(localToday(tzOffset)), tzOffset) : allTime(tzOffset)
    const values = await metricValues(db, metric, candidates, p, tzOffset, weekly)
    const nicknames = new Map(
      (await many<{ id: number; nickname: string }>(db, 'SELECT user_id AS id, nickname FROM profiles WHERE user_id = ANY($1::int[])', [candidates])).map((r) => [r.id, r.nickname]),
    )

    // Só entra quem tem algum valor; empate fica na mesma posição.
    const ordered = candidates
      .filter((id) => (values.get(id) ?? 0) > 0)
      .sort((a, b) => values.get(b)! - values.get(a)! || nicknames.get(a)!.localeCompare(nicknames.get(b)!))
    const position = (id: number) => ordered.findIndex((x) => values.get(x) === values.get(id)) + 1
    const friendSet = new Set(friends)
    const entry = (id: number) => ({ position: position(id), nickname: nicknames.get(id)!, value: values.get(id)!, me: id === userId, friend: friendSet.has(id) })

    res.json({
      metric,
      period,
      scope,
      weekStart: weekly ? p.fromDay : null,
      hasProfile: !!me,
      entries: ordered.slice(0, RANKING_SIZE).map(entry),
      me: me && values.get(userId) ? entry(userId) : null,
      total: ordered.length,
    })
  })

  // ---------- Desafios entre amigos ----------

  const challengeColumns = `c.id, c.challenger_id AS "challengerId", c.opponent_id AS "opponentId", pc.nickname AS "challengerNickname",
    po.nickname AS "opponentNickname", c.metric, to_char(c.week_start, 'YYYY-MM-DD') AS "weekStart", c.status`

  const withScore = async (rows: ChallengeRow[], userId: number, tzOffset: number) => {
    const today = localToday(tzOffset)
    return Promise.all(
      rows.map(async (c) => {
        const p = weekPeriod(c.weekStart, tzOffset)
        const finished = today >= p.toDay
        const scores = c.status === 'aceito' ? await metricValues(db, c.metric, [c.challengerId, c.opponentId], p, tzOffset, true) : null
        const mine = c.challengerId === userId ? c.challengerId : c.opponentId
        const theirs = c.challengerId === userId ? c.opponentId : c.challengerId
        const myScore = scores?.get(mine) ?? 0
        const theirScore = scores?.get(theirs) ?? 0
        return {
          id: c.id,
          metric: c.metric,
          weekStart: c.weekStart,
          weekEnd: addDays(c.weekStart, 6),
          status: c.status === 'aceito' && finished ? 'encerrado' : c.status === 'pendente' && finished ? 'expirado' : c.status,
          role: c.challengerId === userId ? 'desafiante' : 'desafiado',
          friend: { id: theirs, nickname: c.challengerId === userId ? c.opponentNickname : c.challengerNickname },
          score: scores ? { me: myScore, friend: theirScore } : null,
          result: scores && finished ? (myScore > theirScore ? 'vitoria' : myScore < theirScore ? 'derrota' : 'empate') : null,
        }
      }),
    )
  }

  router.get('/challenges', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const rows = await many<ChallengeRow>(
      db,
      `SELECT ${challengeColumns} FROM friend_challenges c
       JOIN profiles pc ON pc.user_id = c.challenger_id JOIN profiles po ON po.user_id = c.opponent_id
       WHERE (c.challenger_id = $1 OR c.opponent_id = $1) AND c.week_start >= $2::date - 28
       ORDER BY c.week_start DESC, c.id DESC LIMIT 30`,
      [userId, localToday(tzOffset)],
    )
    res.json(await withScore(rows, userId, tzOffset))
  })

  router.post('/challenges', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const { opponentId, metric } = parse(challengeSchema, req.body)
    await requireProfile(db, userId)
    if (!(await areFriends(db, userId, opponentId))) throw new HttpError(400, 'Só dá para desafiar amigos')
    const weekStart = mondayOf(localToday(tzOffset))
    const created = await db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(4245, $1)', [Math.min(userId, opponentId)])
      const repeated = await one(
        tx,
        `SELECT 1 FROM friend_challenges WHERE metric = $1 AND week_start = $2 AND status IN ('pendente', 'aceito')
           AND ((challenger_id = $3 AND opponent_id = $4) OR (challenger_id = $4 AND opponent_id = $3))`,
        [metric, weekStart, userId, opponentId],
      )
      if (repeated) throw new HttpError(409, 'Já existe um desafio de vocês dois nisso esta semana')
      const { n } = (await one<{ n: number }>(tx, `SELECT COUNT(*)::int AS n FROM friend_challenges WHERE challenger_id = $1 AND status = 'pendente'`, [userId]))!
      if (n >= MAX_PENDING_CHALLENGES) throw new HttpError(400, `Você já tem ${MAX_PENDING_CHALLENGES} desafios esperando resposta`)
      return (await one<{ id: number }>(
        tx,
        `INSERT INTO friend_challenges (challenger_id, opponent_id, metric, week_start) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, opponentId, metric, weekStart],
      ))!
    })
    const row = await one<ChallengeRow>(
      db,
      `SELECT ${challengeColumns} FROM friend_challenges c JOIN profiles pc ON pc.user_id = c.challenger_id JOIN profiles po ON po.user_id = c.opponent_id WHERE c.id = $1`,
      [created.id],
    )
    notificar?.(opponentId, {
      title: `${row!.challengerNickname} te desafiou`,
      body: 'Um desafio para esta semana está esperando a sua resposta.',
      url: '/ranking',
      tag: `desafio-${row!.id}`,
    })
    res.status(201).json((await withScore([row!], userId, tzOffset))[0])
  })

  // Responder: o desafiado aceita ou recusa; quem desafiou pode cancelar enquanto ninguém respondeu.
  const respond = (action: 'accept' | 'decline' | 'cancel') =>
    router.post(`/challenges/:id/${action}`, async (req, res) => {
      const userId = currentUser(req)
      const { id } = parse(idParam, req.params)
      const { tzOffset } = parse(tzQuery, req.query)
      const challenge = await one<ChallengeRow>(
        db,
        `SELECT ${challengeColumns} FROM friend_challenges c JOIN profiles pc ON pc.user_id = c.challenger_id JOIN profiles po ON po.user_id = c.opponent_id
         WHERE c.id = $1 AND (c.challenger_id = $2 OR c.opponent_id = $2)`,
        [id, userId],
      )
      if (!challenge) throw notFound('Desafio')
      const allowed = action === 'cancel' ? challenge.challengerId === userId : challenge.opponentId === userId
      if (!allowed) throw new HttpError(403, action === 'cancel' ? 'Só quem desafiou pode cancelar' : 'Só quem foi desafiado pode responder')
      if (challenge.status !== 'pendente') throw new HttpError(409, 'Esse desafio já foi respondido')
      if (localToday(tzOffset) >= weekPeriod(challenge.weekStart, tzOffset).toDay) throw new HttpError(409, 'A semana desse desafio já acabou')
      const status = action === 'accept' ? 'aceito' : action === 'decline' ? 'recusado' : 'cancelado'
      await db.query(`UPDATE friend_challenges SET status = $1, responded_at = now() WHERE id = $2`, [status, id])
      if (action === 'accept') {
        notificar?.(challenge.challengerId, { title: `${challenge.opponentNickname} aceitou o desafio`, body: 'O placar da semana já está valendo.', url: '/ranking', tag: `desafio-${id}` })
      }
      res.json((await withScore([{ ...challenge, status }], userId, tzOffset))[0])
    })
  respond('accept')
  respond('decline')
  respond('cancel')

  return router
}
