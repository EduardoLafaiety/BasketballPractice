import type { Database, Queryable } from '../../db/index.js'
import { findProgram, PROGRAMS, type ProgramDefinition } from '../../db/programs.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import { localToday, programStatus } from './program.model.js'
import { catalogByName, insertProgram, insertProgramDay, loadProgress, lockProgramProgress, ownsSession, removeProgram } from './program.repository.js'

const summary = (program: ProgramDefinition) => ({
  id: program.id,
  name: program.name,
  summary: program.summary,
  level: program.level,
  focus: program.focus,
  totalDays: program.days.length,
  minutesPerDay: Math.round(program.days.reduce((t, d) => t + d.blocks.reduce((s, [, m]) => s + m, 0), 0) / program.days.length),
})

function requireProgram(id: string) {
  const program = findProgram(id)
  if (!program) throw notFound('Programa')
  return program
}

export async function listPrograms(db: Queryable, userId: number, tzOffset: number) {
  const progress = await loadProgress(db, userId)
  const today = localToday(tzOffset)
  return PROGRAMS.map((p) => ({ ...summary(p), status: programStatus(p, progress.get(p.id) ?? null, today) }))
}

export async function getProgram(db: Queryable, userId: number, id: string, tzOffset: number) {
  const program = requireProgram(id)
  const progress = (await loadProgress(db, userId, id)).get(id) ?? null
  const status = programStatus(program, progress, localToday(tzOffset))
  const rows = await catalogByName(db, [...new Set(program.days.flatMap((d) => d.blocks.map(([name]) => name)))])
  const catalog = new Map(rows.map((row) => [row.name, row]))
  return {
    ...summary(program), status,
    days: program.days.map((d, i) => {
      const day = i + 1
      const doneOn = progress?.done.find((x) => x.day === day)?.doneOn ?? null
      const state = doneOn
        ? 'done'
        : status.started && status.nextDay === day
          ? status.availableToday ? 'available' : 'tomorrow'
          : 'locked'
      return {
        day, title: d.title, state, doneOn,
        blocks: d.blocks.flatMap(([name, minutes]) => {
          const e = catalog.get(name)
          return e ? [{ exerciseId: e.id, name, category: e.category, metric: e.metric, minutes }] : []
        }),
      }
    }),
  }
}

export async function startProgram(db: Database, userId: number, id: string, tzOffset: number) {
  const program = requireProgram(id)
  return db.transaction(async (tx) => {
    await lockProgramProgress(tx, userId)
    const today = localToday(tzOffset)
    await removeProgram(tx, userId, id)
    await insertProgram(tx, userId, id, today)
    return programStatus(program, { startedOn: today, done: [] }, today)
  })
}

export async function leaveProgram(db: Database, userId: number, id: string) {
  await db.transaction(async (tx) => {
    await lockProgramProgress(tx, userId)
    if (!await removeProgram(tx, userId, id)) throw notFound('Programa')
  })
}

export function completeDay(db: Database, userId: number, id: string, day: number, tzOffset: number, sessionId: number | null) {
  return db.transaction((tx) => completeProgramDay(tx, userId, id, day, tzOffset, sessionId))
}

/** Participa da mesma transação que cria a sessão. */
export async function completeProgramDay(tx: Queryable, userId: number, id: string, day: number, tzOffset: number, sessionId: number | null) {
  const program = requireProgram(id)
  await lockProgramProgress(tx, userId)
  const today = localToday(tzOffset)
  const progress = (await loadProgress(tx, userId, id)).get(id) ?? null
  const current = programStatus(program, progress, today)
  if (!current.started) throw new HttpError(409, 'Comece o programa antes de concluir um dia')
  if (current.nextDay !== day) throw new HttpError(409, current.finished ? 'Programa já concluído' : `O próximo dia é o ${current.nextDay}`)
  if (!current.availableToday) throw new HttpError(409, 'Um dia por vez: o próximo treino libera amanhã')
  if (sessionId != null) {
    const own = await ownsSession(tx, userId, sessionId)
    if (!own) throw notFound('Sessão')
  }
  await insertProgramDay(tx, userId, id, day, today, sessionId)
  return programStatus(program, { startedOn: progress!.startedOn, done: [...progress!.done, { day, doneOn: today }] }, today)
}
