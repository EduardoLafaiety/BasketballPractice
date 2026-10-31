import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { dbId, idParam, isoDate, MAX_INT, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { assertExercisesVisible } from './exercises.js'

const count = z.number().int().min(0).max(100000).nullish()

// Zonas da meia-quadra usadas no shot chart: garrafão, lance livre, 5 de média e 5 de três.
export const ZONES = [
  'garrafao',
  'lance_livre',
  'media_canto_e',
  'media_ala_e',
  'media_topo',
  'media_ala_d',
  'media_canto_d',
  'tres_canto_e',
  'tres_ala_e',
  'tres_topo',
  'tres_ala_d',
  'tres_canto_d',
] as const

const shotSchema = z
  .object({
    zone: z.enum(ZONES),
    makes: z.number().int().min(0).max(100000),
    attempts: z.number().int().min(0).max(100000),
  })
  .refine((shot) => shot.makes <= shot.attempts, {
    message: 'Acertos não podem ser maiores que tentativas',
    path: ['makes'],
  })

const entrySchema = z
  .object({
    exerciseId: dbId,
    attempts: count,
    makes: count,
    reps: count,
    seconds: count,
    bestStreak: count,
    notes: z.string().trim().max(500).nullish(),
  })
  .refine((entry) => entry.makes == null || entry.attempts == null || entry.makes <= entry.attempts, {
    message: 'Acertos não podem ser maiores que tentativas',
    path: ['makes'],
  })
  .refine((entry) => entry.bestStreak == null || entry.makes == null || entry.bestStreak <= entry.makes, {
    message: 'A sequência não pode passar do número de acertos',
    path: ['bestStreak'],
  })

export const sessionSchema = z.object({
  workoutId: dbId.nullish(),
  performedAt: isoDate.transform((value) => new Date(value).toISOString()),
  durationMinutes: z.number().int().min(1).max(1440).nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  fatigue: z.number().int().min(1).max(5).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  entries: z.array(entrySchema).max(100).default([]),
  shots: z
    .array(shotSchema)
    .max(ZONES.length)
    .refine((shots) => new Set(shots.map((shot) => shot.zone)).size === shots.length, 'Zona repetida')
    .default([]),
})

// Diferença do fuso do cliente em minutos, no formato de Date.getTimezoneOffset() (Brasília = 180).
// Sem ela, "dia" e "semana" seriam contados em UTC e um treino às 22h cairia no dia seguinte.
export const tzQuery = z.object({ tzOffset: z.coerce.number().int().min(-840).max(840).default(0) })

export const dateRangeQuery = tzQuery.extend({
  from: isoDate.optional(),
  to: isoDate.optional(),
})

const listQuery = dateRangeQuery.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(MAX_INT).default(0),
})

export type SessionInput = z.infer<typeof sessionSchema>

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

// "AAAA-MM-DD" vira a meia-noite local do cliente (tzOffset); um ISO com horário vale o instante exato.
function startOf(value: string, tzOffset: number) {
  const start = new Date(value)
  if (DATE_ONLY.test(value)) start.setTime(start.getTime() + tzOffset * 60_000)
  return start
}

// Fim exclusivo do intervalo: "AAAA-MM-DD" vale o dia local inteiro; um ISO com horário vale até aquele instante.
function exclusiveEnd(to: string, tzOffset: number) {
  const end = startOf(to, tzOffset)
  if (DATE_ONLY.test(to)) end.setUTCDate(end.getUTCDate() + 1)
  else end.setTime(end.getTime() + 1)
  return end.toISOString()
}

// Filtro por intervalo de datas (inclusivo) sobre practice_sessions com alias "s".
// Datas sem horário são dias no fuso do cliente (UTC se não vier tzOffset); com horário, o instante exato.
// `first` é o número do primeiro placeholder ($n) que o filtro pode usar.
export function dateRangeFilter(range: z.infer<typeof dateRangeQuery>, first: number) {
  const from = `$${first}::timestamptz`
  const to = `$${first + 1}::timestamptz`
  return {
    sql: `(${from} IS NULL OR s.performed_at >= ${from})
      AND (${to} IS NULL OR s.performed_at < ${to})`,
    params: [
      range.from ? startOf(range.from, range.tzOffset).toISOString() : null,
      range.to ? exclusiveEnd(range.to, range.tzOffset) : null,
    ],
  }
}

const SESSION_COLUMNS = `s.id, s.workout_id AS "workoutId", w.name AS "workoutName", s.performed_at AS "performedAt",
  s.duration_minutes AS "durationMinutes", s.rating, s.fatigue`

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
async function replaceEntries(tx: Queryable, sessionId: number, input: SessionInput) {
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

  const validateReferences = async (input: SessionInput, userId: number) => {
    if (
      input.workoutId != null &&
      !(await one(db, 'SELECT 1 FROM workouts WHERE id = $1 AND user_id = $2', [input.workoutId, userId]))
    ) {
      throw new HttpError(400, `Treino ${input.workoutId} não existe`)
    }
    await assertExercisesVisible(db, input.entries.map((entry) => entry.exerciseId), userId)
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

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await findSession(id, currentUser(req)))
  })

  router.post('/', async (req, res) => {
    const userId = currentUser(req)
    const body = parse(sessionSchema, req.body)
    await validateReferences(body, userId)

    const id = await db.transaction((tx) => insertSession(tx, userId, body))
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
