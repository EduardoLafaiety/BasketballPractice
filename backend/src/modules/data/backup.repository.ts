import { many, one, type Queryable } from '../../db/index.js'
import type { BackupInput } from './backup.schema.js'
import type { SessionContent } from './backup.fingerprint.js'
import type { SessionInput } from '../sessions/session.schema.js'

export async function readBackupRows(db: Queryable, userId: number) {
  // O snapshot usa uma conexão: leituras sequenciais evitam enfileirar consultas no mesmo client.
  const exercises = await many<BackupInput['exercises'][number]>(
      db,
      'SELECT id, name, category, metric, description FROM exercises WHERE user_id = $1 ORDER BY id',
      [userId],
    )
  const workouts = await many<{ id: number } & Pick<BackupInput['workouts'][number], 'name' | 'description'>>(db, 'SELECT id, name, description FROM workouts WHERE user_id = $1 ORDER BY id', [userId])
  const workoutItems = await many<BackupInput['workouts'][number]['exercises'][number] & { workoutId: number }>(
      db,
      `SELECT we.workout_id AS "workoutId", we.exercise_id AS "exerciseId", e.name AS "exerciseName",
              we.sets, we.target_reps AS "targetReps", we.target_seconds AS "targetSeconds", we.notes
       FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = $1 ORDER BY we.workout_id, we.position`,
      [userId],
    )
  const sessions = await many<Omit<SessionContent, 'entries' | 'shots'> & { id: number; workoutName: string | null }>(
      db,
      `SELECT s.id, s.performed_at AS "performedAt", s.duration_minutes AS "durationMinutes", s.rating, s.fatigue,
              s.notes, w.name AS "workoutName"
       FROM practice_sessions s LEFT JOIN workouts w ON w.id = s.workout_id
       WHERE s.user_id = $1 ORDER BY s.performed_at, s.id`,
      [userId],
    )

  return { exercises, workouts, workoutItems, sessions }
}

export async function readBackupExtras(db: Queryable, userId: number) {
  const q = (sql: string) => many(db, sql, [userId])
  return {
    dailyChallenges: await q(`SELECT to_char(day, 'YYYY-MM-DD') AS day, challenge_id AS "challengeId", makes, attempts FROM daily_challenge_results WHERE user_id = $1 ORDER BY day`),
    quiz: await q(`SELECT to_char(day, 'YYYY-MM-DD') AS day, correct, answers FROM quiz_results WHERE user_id = $1 ORDER BY day`),
    programs: await q(
      `SELECT p.program_id AS "programId", to_char(p.started_on, 'YYYY-MM-DD') AS "startedOn",
              COALESCE(array_agg(d.day ORDER BY d.day) FILTER (WHERE d.day IS NOT NULL), '{}') AS "daysDone"
       FROM user_programs p LEFT JOIN program_days_done d ON d.user_id = p.user_id AND d.program_id = p.program_id
       WHERE p.user_id = $1 GROUP BY 1, 2 ORDER BY 2`,
    ),
  }
}

export async function readSessionCandidates(tx: Queryable, userId: number, sessions: SessionInput[]) {
  const rows = await many<Omit<SessionContent, 'entries' | 'shots'> & { id: number }>(
    tx,
    `SELECT id, performed_at AS "performedAt", duration_minutes AS "durationMinutes", rating, fatigue, notes
     FROM practice_sessions WHERE user_id = $1 AND performed_at = ANY($2::timestamptz[])`,
    [userId, sessions.map((session) => session.performedAt)],
  )
  return rows
}

export async function readVisibleExercises(tx: Queryable, userId: number) {
  return await many<{ id: number; name: string; ownerId: number | null }>(
    tx,
    'SELECT id, name, user_id AS "ownerId" FROM exercises WHERE user_id IS NULL OR user_id = $1 ORDER BY user_id NULLS FIRST, id',
    [userId],
  )
}

export async function insertBackupExercise(tx: Queryable, userId: number, exercise: BackupInput['exercises'][number]) {
  return (await one<{ id: number }>(tx,
    'INSERT INTO exercises (user_id, name, category, metric, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [userId, exercise.name, exercise.category, exercise.metric, exercise.description ?? null]))!.id
}

export async function lockBackupImport(tx: Queryable, userId: number) {
  await tx.query('SELECT pg_advisory_xact_lock($1::int, $2::int)', [4243, userId])
}

export async function beginBackupSnapshot(tx: Queryable) {
  await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
}
