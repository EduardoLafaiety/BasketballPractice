import type { Database, Queryable } from '../../db/index.js'
import { HttpError } from '../../lib/http-error.js'
import { parse } from '../../lib/validate.js'
import { insertSession, sessionDetails } from '../sessions/session.repository.js'
import { sessionSchema, type SessionInput } from '../sessions/session.schema.js'
import { readSettings, writeSettings } from '../settings/settings.service.js'
import { findWorkoutByIdentity, insertWorkout, replaceWorkoutExercises, touchWorkout } from '../workouts/workout.repository.js'
import { workoutSchema } from '../workouts/workout.schema.js'
import { FORMAT, VERSION, type BackupInput, type BackupImportResult } from './backup.schema.js'
import { sessionFingerprint } from './backup.fingerprint.js'
import {
  beginBackupSnapshot, insertBackupExercise, lockBackupImport, readBackupExtras,
  readBackupRows, readSessionCandidates, readVisibleExercises,
} from './backup.repository.js'

async function exportData(db: Queryable, userId: number) {
  const { exercises, workouts, workoutItems, sessions } = await readBackupRows(db, userId)
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
    // Só para a pessoa ter tudo o que é dela; a importação ignora esta parte.
    extras: await readBackupExtras(db, userId),
    settings: await readSettings(db, userId),
  }
}

async function existingFingerprints(tx: Queryable, userId: number, sessions: SessionInput[]) {
  const counts = new Map<string, number>()
  if (!sessions.length) return counts
  const rows = await readSessionCandidates(tx, userId, sessions)
  const details = await sessionDetails(tx, rows.map((row) => row.id))
  for (const row of rows) {
    const { entries, shots } = details(row.id)
    const key = sessionFingerprint({ ...row, entries, shots })
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

async function importData(tx: Queryable, userId: number, data: BackupInput): Promise<BackupImportResult> {
  const created = { exercises: 0, workouts: 0, sessions: 0 }
  const skipped = { sessions: 0 }

  // Exercícios do atleta: reaproveita um de mesmo nome para que importar duas vezes não duplique.
  const visible = await readVisibleExercises(tx, userId)
  const byName = new Map<string, number>()
  for (const e of visible) if (!byName.has(e.name.toLowerCase())) byName.set(e.name.toLowerCase(), e.id)

  const idMap = new Map<number, number>()
  for (const exercise of data.exercises) {
    let id = byName.get(exercise.name.toLowerCase())
    if (id === undefined) {
      id = await insertBackupExercise(tx, userId, exercise)
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
    const existing = await findWorkoutByIdentity(tx, userId, workout.name, workout.description)
    const id = existing?.id ?? await insertWorkout(tx, userId, workout)
    if (!existing) created.workouts++
    await touchWorkout(tx, id, userId)
    await replaceWorkoutExercises(tx, id, items)
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

  return { created, skipped }
}

// Limite por instância; a trava do banco serializa importações da mesma conta entre instâncias.
export const DEFAULT_MAX_IMPORTS = 2
export class BackupImportBusyError extends HttpError {
  readonly retryAfter = 30
  constructor() { super(503, 'Muitas importações em andamento. Tente de novo em instantes.') }
}

export function createBackupService(db: Database, { maxImports = DEFAULT_MAX_IMPORTS }: { maxImports?: number } = {}) {
  let running = 0
  return {
    exportBackup(userId: number) {
      return db.transaction(async (tx) => {
        await beginBackupSnapshot(tx)
        return exportData(tx, userId)
      })
    },
    async importBackup(userId: number, data: BackupInput) {
      if (running >= maxImports) throw new BackupImportBusyError()
      running++
      try {
        return await db.transaction(async (tx) => {
          await lockBackupImport(tx, userId)
          const result = await importData(tx, userId, data)
          if (data.settings) await writeSettings(tx, userId, data.settings)
          return result
        })
      } finally { running-- }
    },
  }
}
