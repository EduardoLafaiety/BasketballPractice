import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { HttpError } from '../lib/http-error.js'
import { dbId, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { CATEGORIES, METRICS } from './exercises.js'
import { assertGoalExerciseKind, goalSchema } from './goals.js'
import { insertSession, sessionDetails, sessionSchema, type SessionInput } from './sessions.js'
import { readSettings, settingsSchema, writeSettings } from './settings.js'
import { testSchema } from './tests.js'
import { workoutSchema } from './workouts.js'

const FORMAT = 'basketball-practice'
const VERSION = 1

// Referência a um exercício no arquivo: o id vale para os exercícios exportados junto;
// os do catálogo padrão são achados pelo nome (os ids mudam de um banco para outro).
const exerciseRef = { exerciseId: dbId.nullish(), exerciseName: z.string().min(1).max(100) }

const importSchema = z.object({
  format: z.literal(FORMAT),
  version: z.literal(VERSION),
  exercises: z
    .array(
      z.object({
        id: dbId,
        name: z.string().trim().min(2).max(100),
        category: z.enum(CATEGORIES),
        metric: z.enum(METRICS),
        description: z.string().trim().max(1000).nullish(),
      }),
    )
    .max(500)
    .default([]),
  workouts: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(100),
        description: z.string().trim().max(1000).nullish(),
        exercises: z
          .array(
            z.object({
              ...exerciseRef,
              sets: z.number().int().nullish(),
              targetReps: z.number().int().nullish(),
              targetSeconds: z.number().int().nullish(),
              notes: z.string().nullish(),
            }),
          )
          .max(50),
      }),
    )
    .max(500)
    .default([]),
  sessions: z
    .array(
      z
        .object({ workoutName: z.string().nullish(), entries: z.array(z.object(exerciseRef).passthrough()).max(100) })
        .passthrough(),
    )
    .max(20000)
    .default([]),
  goals: z
    .array(z.object({ exerciseName: z.string().nullish() }).passthrough())
    .max(500)
    .default([]),
  physicalTests: z.array(testSchema).max(5000).default([]),
  settings: settingsSchema.optional(),
})

async function exportData(db: Queryable, userId: number) {
  const [exercises, workouts, workoutItems, sessions, goals, physicalTests] = await Promise.all([
    many(
      db,
      'SELECT id, name, category, metric, description FROM exercises WHERE user_id = $1 ORDER BY id',
      [userId],
    ),
    many<{ id: number }>(db, 'SELECT id, name, description FROM workouts WHERE user_id = $1 ORDER BY id', [userId]),
    many<{ workoutId: number }>(
      db,
      `SELECT we.workout_id AS "workoutId", we.exercise_id AS "exerciseId", e.name AS "exerciseName",
              we.sets, we.target_reps AS "targetReps", we.target_seconds AS "targetSeconds", we.notes
       FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = $1 ORDER BY we.workout_id, we.position`,
      [userId],
    ),
    many<{ id: number }>(
      db,
      `SELECT s.id, s.performed_at AS "performedAt", s.duration_minutes AS "durationMinutes", s.rating, s.fatigue,
              s.notes, w.name AS "workoutName"
       FROM practice_sessions s LEFT JOIN workouts w ON w.id = s.workout_id
       WHERE s.user_id = $1 ORDER BY s.performed_at, s.id`,
      [userId],
    ),
    many(
      db,
      `SELECT g.title, g.kind, g.target, g.exercise_id AS "exerciseId", e.name AS "exerciseName",
              to_char(g.deadline, 'YYYY-MM-DD') AS deadline
       FROM goals g LEFT JOIN exercises e ON e.id = g.exercise_id WHERE g.user_id = $1 ORDER BY g.id`,
      [userId],
    ),
    many(
      db,
      `SELECT kind, value, performed_at AS "performedAt", notes FROM physical_tests WHERE user_id = $1 ORDER BY performed_at`,
      [userId],
    ),
  ])

  const details = await sessionDetails(
    db,
    sessions.map((s) => s.id),
  )
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    workouts: workouts.map(({ id, ...workout }) => ({
      ...workout,
      exercises: workoutItems.filter((item) => item.workoutId === id).map(({ workoutId: _, ...item }) => item),
    })),
    sessions: sessions.map(({ id, ...session }) => {
      const { entries, shots } = details(id)
      return {
        ...session,
        entries: entries.map(({ id: _, category: __, metric: ___, ...entry }) => entry),
        shots,
      }
    }),
    goals,
    physicalTests,
  }
}

type SessionContent = Pick<SessionInput, 'performedAt' | 'durationMinutes' | 'rating' | 'fatigue' | 'notes'> & {
  entries: { [K in keyof SessionInput['entries'][number]]?: unknown }[]
  shots: { zone: string; makes: number; attempts: number }[]
}

// O que torna uma sessão a mesma do backup: o instante e tudo o que foi registrado nele. O treino fica de fora
// porque é só um vínculo: renomeá-lo depois do backup não faz o treino feito naquele dia virar outro.
const sessionFingerprint = (session: SessionContent) =>
  JSON.stringify([
    new Date(session.performedAt).toISOString(),
    session.durationMinutes ?? null,
    session.rating ?? null,
    session.fatigue ?? null,
    session.notes ?? null,
    session.entries.map((e) => [e.exerciseId, e.attempts ?? null, e.makes ?? null, e.reps ?? null, e.seconds ?? null, e.bestStreak ?? null, e.notes ?? null]),
    session.shots.map((s) => [s.zone, s.makes, s.attempts]),
  ])

// Quantas sessões iguais a cada uma do arquivo já estão no banco. Só lê as dos mesmos instantes.
async function existingFingerprints(tx: Queryable, userId: number, sessions: SessionInput[]) {
  const counts = new Map<string, number>()
  if (!sessions.length) return counts
  const rows = await many<Omit<SessionContent, 'entries' | 'shots'> & { id: number }>(
    tx,
    `SELECT id, performed_at AS "performedAt", duration_minutes AS "durationMinutes", rating, fatigue, notes
     FROM practice_sessions WHERE user_id = $1 AND performed_at = ANY($2::timestamptz[])`,
    [userId, sessions.map((session) => session.performedAt)],
  )
  const details = await sessionDetails(tx, rows.map((row) => row.id))
  for (const row of rows) {
    const { entries, shots } = details(row.id)
    const key = sessionFingerprint({ ...row, entries, shots })
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

async function importData(tx: Queryable, userId: number, data: z.infer<typeof importSchema>) {
  const created = { exercises: 0, workouts: 0, sessions: 0, goals: 0, physicalTests: 0 }
  const skipped = { sessions: 0, goals: 0, physicalTests: 0 }

  // Exercícios do atleta: reaproveita um de mesmo nome para que importar duas vezes não duplique.
  const visible = await many<{ id: number; name: string; ownerId: number | null }>(
    tx,
    'SELECT id, name, user_id AS "ownerId" FROM exercises WHERE user_id IS NULL OR user_id = $1 ORDER BY user_id NULLS FIRST, id',
    [userId],
  )
  const byName = new Map<string, number>()
  for (const e of visible) if (!byName.has(e.name.toLowerCase())) byName.set(e.name.toLowerCase(), e.id)

  const idMap = new Map<number, number>()
  for (const exercise of data.exercises) {
    let id = byName.get(exercise.name.toLowerCase())
    if (id === undefined) {
      id = (await one<{ id: number }>(
        tx,
        'INSERT INTO exercises (user_id, name, category, metric, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [userId, exercise.name, exercise.category, exercise.metric, exercise.description ?? null],
      ))!.id
      byName.set(exercise.name.toLowerCase(), id)
      created.exercises++
    }
    idMap.set(exercise.id, id)
  }

  const resolve = (ref: { exerciseId?: number | null; exerciseName: string }) => {
    const id = (ref.exerciseId != null ? idMap.get(ref.exerciseId) : undefined) ?? byName.get(ref.exerciseName.toLowerCase())
    if (id === undefined) throw new HttpError(400, `Exercício "${ref.exerciseName}" não encontrado`)
    return id
  }

  // Treinos com o mesmo nome e descrição (como os dias da rotina) têm os exercícios substituídos.
  const workoutIds = new Map<string, number>()
  for (const workout of data.workouts) {
    // Mesmos limites da tela de treinos (séries, repetições, tempo).
    const items = parse(workoutSchema, {
      ...workout,
      exercises: workout.exercises.map((item) => ({ ...item, exerciseId: resolve(item) })),
    }).exercises
    const existing = await one<{ id: number }>(
      tx,
      'SELECT id FROM workouts WHERE user_id = $1 AND name = $2 AND description IS NOT DISTINCT FROM $3 ORDER BY id DESC LIMIT 1',
      [userId, workout.name, workout.description ?? null],
    )
    const id =
      existing?.id ??
      (await one<{ id: number }>(tx, 'INSERT INTO workouts (user_id, name, description) VALUES ($1, $2, $3) RETURNING id', [
        userId,
        workout.name,
        workout.description ?? null,
      ]))!.id
    if (!existing) created.workouts++
    await tx.query('UPDATE workouts SET updated_at = now() WHERE id = $1', [id])
    await tx.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id])
    if (items.length) {
      const column = (key: 'exerciseId' | 'sets' | 'targetReps' | 'targetSeconds' | 'notes') =>
        items.map((item) => item[key] ?? null)
      await tx.query(
        `INSERT INTO workout_exercises (workout_id, exercise_id, position, sets, target_reps, target_seconds, notes)
         SELECT $1, t.exercise_id, t.ord - 1, t.sets, t.target_reps, t.target_seconds, t.notes
         FROM unnest($2::int[], $3::int[], $4::int[], $5::int[], $6::text[])
              WITH ORDINALITY AS t(exercise_id, sets, target_reps, target_seconds, notes, ord)`,
        [id, column('exerciseId'), column('sets'), column('targetReps'), column('targetSeconds'), column('notes')],
      )
    }
    workoutIds.set(workout.name, id)
  }

  const sessions = data.sessions.map((raw) => {
    const { workoutName, ...rest } = raw
    return parse(sessionSchema, {
      ...rest,
      workoutId: workoutName ? (workoutIds.get(workoutName) ?? null) : null,
      entries: raw.entries.map((entry) => ({ ...entry, exerciseId: resolve(entry) })),
    })
  })
  // Cada sessão do banco cobre uma do arquivo: importar de novo não duplica, e duas sessões iguais no arquivo ficam.
  const existing = await existingFingerprints(tx, userId, sessions)
  for (const session of sessions) {
    const key = sessionFingerprint(session)
    const remaining = existing.get(key) ?? 0
    if (remaining > 0) {
      existing.set(key, remaining - 1)
      skipped.sessions++
      continue
    }
    await insertSession(tx, userId, session)
    created.sessions++
  }

  for (const raw of data.goals) {
    const { exerciseName, ...rest } = raw
    const goal = parse(goalSchema, {
      ...rest,
      exerciseId: exerciseName ? resolve({ exerciseId: raw.exerciseId as number | null, exerciseName }) : null,
    })
    assertGoalExerciseKind(goal)
    const duplicate = await one(tx, 'SELECT 1 FROM goals WHERE user_id = $1 AND title = $2 AND kind = $3 AND target = $4', [
      userId,
      goal.title,
      goal.kind,
      goal.target,
    ])
    if (duplicate) {
      skipped.goals++
      continue
    }
    await tx.query(
      'INSERT INTO goals (user_id, title, kind, target, exercise_id, deadline) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, goal.title, goal.kind, goal.target, goal.exerciseId ?? null, goal.deadline?.slice(0, 10) ?? null],
    )
    created.goals++
  }

  for (const test of data.physicalTests) {
    const duplicate = await one(tx, 'SELECT 1 FROM physical_tests WHERE user_id = $1 AND kind = $2 AND performed_at = $3', [
      userId,
      test.kind,
      test.performedAt,
    ])
    if (duplicate) {
      skipped.physicalTests++
      continue
    }
    await tx.query('INSERT INTO physical_tests (user_id, kind, value, performed_at, notes) VALUES ($1, $2, $3, $4, $5)', [
      userId,
      test.kind,
      test.value,
      test.performedAt,
      test.notes ?? null,
    ])
    created.physicalTests++
  }

  return { created, skipped }
}

// Uma importação grande prende uma conexão por dezenas de segundos: acima deste limite, o pool ficaria sem
// conexões para os outros atletas. Vale por instância da API.
export const DEFAULT_MAX_IMPORTS = 2
// Namespace do advisory lock por usuário, separado da trava de migração (chave única 4242).
const IMPORT_LOCK = 4243

export function dataRouter(db: Database, { maxImports = DEFAULT_MAX_IMPORTS }: { maxImports?: number } = {}) {
  const router = Router()
  let running = 0

  router.get('/export', async (req, res) => {
    const userId = currentUser(req)
    const [data, settings] = await Promise.all([exportData(db, userId), readSettings(db, userId)])
    res.setHeader('Content-Disposition', `attachment; filename="basketball-practice-${data.exportedAt.slice(0, 10)}.json"`)
    res.json({ ...data, settings })
  })

  router.post('/import', async (req, res) => {
    const userId = currentUser(req)
    const data = parse(importSchema, req.body)
    if (running >= maxImports) {
      res.setHeader('Retry-After', '30')
      throw new HttpError(503, 'Muitas importações em andamento. Tente de novo em instantes.')
    }

    running++
    try {
      // Tudo ou nada: um registro inválido desfaz a importação inteira.
      const result = await db.transaction(async (tx) => {
        // O mesmo backup enviado duas vezes ao mesmo tempo: a segunda espera e enxerga o que a primeira gravou.
        await tx.query('SELECT pg_advisory_xact_lock($1::int, $2::int)', [IMPORT_LOCK, userId])
        const imported = await importData(tx, userId, data)
        if (data.settings) await writeSettings(tx, userId, data.settings)
        return imported
      })
      res.json(result)
    } finally {
      running--
    }
  })

  return router
}
