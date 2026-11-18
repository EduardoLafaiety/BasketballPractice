import type { ProgramDefinition } from '../../db/programs.js'

export const localToday = (tzOffset: number) => new Date(Date.now() - tzOffset * 60_000).toISOString().slice(0, 10)
export type Progress = { startedOn: string; done: { day: number; doneOn: string }[] }

/** Estado de um programa para o atleta: concluídos, o próximo dia e se ele já pode ser feito hoje. */
export function programStatus(program: ProgramDefinition, progress: Progress | null, today: string) {
  if (!progress) return { started: false as const, total: program.days.length, done: 0 }
  const done = progress.done.length
  const lastDoneOn = progress.done.reduce<string | null>((last, d) => (!last || d.doneOn > last ? d.doneOn : last), null)
  const finished = done >= program.days.length
  return {
    started: true as const,
    startedOn: progress.startedOn,
    total: program.days.length,
    done,
    finished,
    nextDay: finished ? null : done + 1,
    // Um dia por data: o próximo libera amanhã se hoje já teve um concluído.
    availableToday: !finished && lastDoneOn !== today,
  }
}

