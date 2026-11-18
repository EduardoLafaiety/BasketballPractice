import { z } from 'zod'
import { many, type Queryable } from '../../db/index.js'
import { tzQuery } from './session.schema.js'
import type { ComparacaoEvolucao, ResumoPeriodo } from '../../../../contracts/evolucao.js'

export const comparisonQuery = tzQuery.extend({
  days: z.coerce.number().refine((n) => n === 7 || n === 30).default(7),
  exerciseId: z.coerce.number().int().positive().optional(),
})

export async function compareSessions(db: Queryable, userId: number, query: z.infer<typeof comparisonQuery>, now = new Date()): Promise<ComparacaoEvolucao> {
  const { tzOffset, days, exerciseId } = query
  const local = new Date(now.getTime() - tzOffset * 60_000)
  const end = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) + tzOffset * 60_000
  const start = end - days * 86_400_000
  const previous = start - days * 86_400_000
  const rows = await many<ResumoPeriodo & { periodo: 'atual' | 'anterior' }>(db, `
    SELECT CASE WHEN s.performed_at >= $3::timestamptz THEN 'atual' ELSE 'anterior' END AS periodo,
      count(*)::int AS frequencia,
      count(DISTINCT ((s.performed_at AT TIME ZONE 'UTC') - $6 * interval '1 minute')::date)::int AS "diasAtivos",
      CASE WHEN $5::int IS NULL THEN COALESCE(sum(s.duration_minutes), 0)::float8 ELSE 0 END AS minutos,
      COALESCE(sum(e.acertos), 0)::float8 AS acertos, COALESCE(sum(e.tentativas), 0)::float8 AS tentativas,
      COALESCE(sum(e.repeticoes), 0)::float8 AS repeticoes, COALESCE(sum(e.segundos), 0)::float8 AS segundos
    FROM practice_sessions s
    LEFT JOIN LATERAL (
      SELECT count(*) AS entradas, sum(makes) AS acertos, sum(attempts) AS tentativas, sum(reps) AS repeticoes, sum(seconds) AS segundos
      FROM session_entries WHERE session_id = s.id AND ($5::int IS NULL OR exercise_id = $5)
    ) e ON true
    WHERE s.user_id = $1 AND s.performed_at >= $2::timestamptz AND s.performed_at < $4::timestamptz
      AND ($5::int IS NULL OR e.entradas > 0)
    GROUP BY periodo`, [userId, new Date(previous).toISOString(), new Date(start).toISOString(), new Date(end).toISOString(), exerciseId ?? null, tzOffset])
  const exercicios = await many<{ id: string; nome: string }>(db, `SELECT DISTINCT e.id::text AS id, e.name AS nome
    FROM session_entries se JOIN practice_sessions s ON s.id = se.session_id JOIN exercises e ON e.id = se.exercise_id
    WHERE s.user_id = $1 ORDER BY nome`, [userId])
  const periodo = (nome: string): ResumoPeriodo => {
    const row = rows.find((r) => r.periodo === nome)
    const { frequencia = 0, diasAtivos = 0, minutos = 0, acertos = 0, tentativas = 0, repeticoes = 0, segundos = 0 } = row ?? {}
    return { frequencia, diasAtivos, minutos, acertos, tentativas, repeticoes, segundos, aproveitamento: tentativas ? Math.round(acertos / tentativas * 1000) / 10 : null }
  }
  return { atual: periodo('atual'), anterior: periodo('anterior'), exercicios }
}
