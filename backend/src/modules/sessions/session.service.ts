import type { Database, Queryable } from '../../db/index.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import { assertExercisesVisible } from '../exercises/exercise.repository.js'
import { completeProgramDay } from '../programs/program.service.js'
import { workoutOwnedBy } from '../workouts/workout.repository.js'
import type { CreateSessionInput, SessionInput, SessionListQuery } from './session.schema.js'
import {
  assignSessionClientId, deleteSessionRow, findSession, findSessionByClientId, insertSession,
  listSessionRows, lockSessionCreation, replaceEntries, sessionDetails, updateSessionRow,
} from './session.repository.js'

export async function getSession(db: Queryable, userId: number, id: number) {
  const session = await findSession(db, id, userId)
  if (!session) throw notFound('Registro de treino')
  return { ...session, ...(await sessionDetails(db, [id]))(id) }
}

export async function listSessions(db: Queryable, userId: number, query: SessionListQuery) {
  const sessions = await listSessionRows(db, userId, query)
  const details = await sessionDetails(db, sessions.map((s) => s.id))
  return sessions.map((session) => ({ ...session, ...details(session.id) }))
}

async function validateReferences(tx: Queryable, userId: number, input: SessionInput) {
  if (input.workoutId != null && !await workoutOwnedBy(tx, input.workoutId, userId)) {
    throw new HttpError(400, `Treino ${input.workoutId} não existe`)
  }
  await assertExercisesVisible(tx, input.entries.map((entry) => entry.exerciseId), userId)
}

/** Deduplicação, validação e conclusão do programa pertencem à mesma transação. */
export async function createSession(db: Database, userId: number, input: CreateSessionInput) {
  return db.transaction(async (tx) => {
    await lockSessionCreation(tx, userId)
    if (input.clientId) {
      const previous = await findSessionByClientId(tx, userId, input.clientId)
      if (previous) return getSession(tx, userId, previous.id)
    }
    await validateReferences(tx, userId, input)
    const id = await insertSession(tx, userId, input)
    if (input.clientId) await assignSessionClientId(tx, id, userId, input.clientId)
    if (input.program) await completeProgramDay(tx, userId, input.program.id, input.program.day, input.tzOffset, id)
    return getSession(tx, userId, id)
  })
}

/** Bloqueia o registro da conta antes de substituir seus dados, entradas e zonas. */
export async function updateSession(db: Database, userId: number, id: number, input: SessionInput) {
  return db.transaction(async (tx) => {
    if (!await findSession(tx, id, userId, true)) throw notFound('Registro de treino')
    await validateReferences(tx, userId, input)
    await updateSessionRow(tx, id, userId, input)
    await replaceEntries(tx, id, input)
    return getSession(tx, userId, id)
  })
}

export async function deleteSession(db: Queryable, userId: number, id: number) {
  if (!await deleteSessionRow(db, id, userId)) throw notFound('Registro de treino')
}
