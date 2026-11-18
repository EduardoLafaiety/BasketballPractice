import type { Queryable } from '../../db/index.js'
import type { SessionComparisonQuery } from './session.schema.js'
import { comparisonRows, comparedExercises } from './session.repository.js'
import type { ComparacaoEvolucao, ResumoPeriodo } from '../../../../contracts/evolucao.js'

export async function compareSessions(db: Queryable, userId: number, query: SessionComparisonQuery, now = new Date()): Promise<ComparacaoEvolucao> {
  const { tzOffset, days } = query
  const local = new Date(now.getTime() - tzOffset * 60_000)
  const end = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) + tzOffset * 60_000
  const start = end - days * 86_400_000
  const previous = start - days * 86_400_000
  const rows = await comparisonRows(db, userId, query, {
    previous: new Date(previous).toISOString(), start: new Date(start).toISOString(), end: new Date(end).toISOString(),
  })
  const exercicios = await comparedExercises(db, userId)
  const periodo = (nome: string): ResumoPeriodo => {
    const row = rows.find((r) => r.periodo === nome)
    const { frequencia = 0, diasAtivos = 0, minutos = 0, acertos = 0, tentativas = 0, repeticoes = 0, segundos = 0 } = row ?? {}
    return { frequencia, diasAtivos, minutos, acertos, tentativas, repeticoes, segundos, aproveitamento: tentativas ? Math.round(acertos / tentativas * 1000) / 10 : null }
  }
  return { atual: periodo('atual'), anterior: periodo('anterior'), exercicios }
}
