import { Router } from 'express'
import { many, type Queryable } from '../db/index.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { tzQuery } from './sessions.js'

/**
 * Cartão do atleta: uma bateria por mês com quatro testes, cada um vira uma nota de 0 a 99.
 * `zero` é o resultado que vale 0 e `top` o que vale 99; entre eles a nota cresce em linha reta.
 * Nos testes de tempo, `zero` é maior que `top` (menos segundos, nota maior).
 */
export const CARD_SKILLS = [
  { id: 'lance_livre', name: 'Lance livre', test: 'lances_1min', zero: 0, top: 18 },
  { id: 'arremesso', name: 'Arremesso', test: 'arremesso_5_pontos', zero: 0, top: 22 },
  { id: 'drible', name: 'Drible', test: 'drible_cones', zero: 30, top: 9 },
  { id: 'salto', name: 'Salto', test: 'impulsao', zero: 10, top: 85 },
] as const

export type CardSkill = (typeof CARD_SKILLS)[number]

/** Nota de 0 a 99 de um resultado. */
export function skillRating(skill: Pick<CardSkill, 'zero' | 'top'>, value: number) {
  const rating = (99 * (value - skill.zero)) / (skill.top - skill.zero)
  return Math.round(Math.min(99, Math.max(0, rating)))
}

export interface MonthCard {
  month: string // AAAA-MM
  skills: Record<CardSkill['id'], { value: number; rating: number } | null>
  /** Média das notas medidas no mês. */
  overall: number | null
  /** As quatro habilidades medidas no mês. */
  complete: boolean
}

/** Cartões mês a mês (do mais antigo ao mais novo), com o melhor resultado de cada teste em cada mês. */
export async function monthlyCards(db: Queryable, userId: number, tzOffset = 0): Promise<MonthCard[]> {
  const rows = await many<{ month: string; kind: string; best: number; worst: number }>(
    db,
    `SELECT to_char(performed_at - make_interval(mins => $2::int), 'YYYY-MM') AS month, kind,
            MAX(value)::float8 AS best, MIN(value)::float8 AS worst
     FROM physical_tests WHERE user_id = $1 AND kind = ANY($3::text[])
     GROUP BY 1, 2 ORDER BY 1`,
    [userId, tzOffset, CARD_SKILLS.map((s) => s.test)],
  )
  const months = [...new Set(rows.map((r) => r.month))]
  return months.map((month) => {
    const skills = Object.fromEntries(
      CARD_SKILLS.map((skill) => {
        const row = rows.find((r) => r.month === month && r.kind === skill.test)
        if (!row) return [skill.id, null]
        // Teste de tempo: o melhor do mês é o menor.
        const value = skill.zero > skill.top ? row.worst : row.best
        return [skill.id, { value, rating: skillRating(skill, value) }]
      }),
    ) as MonthCard['skills']
    const ratings = Object.values(skills).flatMap((s) => (s ? [s.rating] : []))
    return {
      month,
      skills,
      overall: ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
      complete: ratings.length === CARD_SKILLS.length,
    }
  })
}

export function cardRouter(db: Queryable) {
  const router = Router()

  router.get('/', async (req, res) => {
    const { tzOffset } = parse(tzQuery, req.query)
    const months = await monthlyCards(db, currentUser(req), tzOffset)
    res.json({
      skills: CARD_SKILLS.map(({ id, name, test, zero, top }) => ({ id, name, test, zero, top })),
      months,
      current: months.at(-1) ?? null,
    })
  })

  return router
}
