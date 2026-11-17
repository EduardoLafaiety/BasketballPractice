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
export function skillRating(skill: { zero: number; top: number }, value: number) {
  const rating = (99 * (value - skill.zero)) / (skill.top - skill.zero)
  return Math.round(Math.min(99, Math.max(0, rating)))
}

/**
 * Taxas de arremesso do mês (treino + jogo) que também viram nota: `zero` é o aproveitamento (%) que vale 0 e `top` o que vale 99.
 * Só contam com `MIN_SHOTS` arremessos no mês, para dez bolas de sorte não valerem uma nota.
 */
export const SHOOTING_SKILLS = [
  { id: 'tres', name: 'Bola de 3', zero: 15, top: 45 },
  { id: 'quadra', name: 'Arremesso de quadra', zero: 25, top: 60 },
  { id: 'lance_pct', name: 'Lance livre (%)', zero: 40, top: 95 },
] as const
export const MIN_SHOTS = 10

export type ShootingSkill = (typeof SHOOTING_SKILLS)[number]

export interface MonthCard {
  month: string // AAAA-MM
  skills: Record<CardSkill['id'], { value: number; rating: number } | null>
  /** Aproveitamento do mês em cada tipo de arremesso, com a nota correspondente. */
  shooting: Record<ShootingSkill['id'], { pct: number; attempts: number; rating: number } | null>
  /** Média das notas medidas no mês (testes da bateria e taxas de arremesso). */
  overall: number | null
  /** As quatro habilidades medidas no mês. */
  complete: boolean
}

/** Cartões mês a mês (do mais antigo ao mais novo), com o melhor resultado de cada teste em cada mês. */
type ShotRow = { month: string; made: number; att: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number }

function shootingOf(rows: ShotRow[]): MonthCard['shooting'] {
  const sum = (key: keyof Omit<ShotRow, 'month'>) => rows.reduce((t, r) => t + r[key], 0)
  const rate = (skill: ShootingSkill, made: number, att: number) => {
    if (att < MIN_SHOTS) return null
    const pct = Math.round((made / att) * 1000) / 10
    return { pct, attempts: att, rating: skillRating(skill, pct) }
  }
  const [tres, quadra, lance] = SHOOTING_SKILLS
  return {
    tres: rate(tres, sum('threeMade'), sum('threeAtt')),
    quadra: rate(quadra, sum('made'), sum('att')),
    lance_pct: rate(lance, sum('ftMade'), sum('ftAtt')),
  }
}

export async function monthlyCards(db: Queryable, userId: number, tzOffset = 0): Promise<MonthCard[]> {
  const rows = await many<{ month: string; kind: string; best: number; worst: number }>(
    db,
    `SELECT to_char(performed_at - make_interval(mins => $2::int), 'YYYY-MM') AS month, kind,
            MAX(value)::float8 AS best, MIN(value)::float8 AS worst
     FROM physical_tests WHERE user_id = $1 AND kind = ANY($3::text[])
     GROUP BY 1, 2 ORDER BY 1`,
    [userId, tzOffset, CARD_SKILLS.map((s) => s.test)],
  )
  // Arremessos do mês: exercícios de treino e jogos. Os de três são os exercícios com "três" no nome; lance livre, os que começam por "Lance livre".
  const [practice, games] = await Promise.all([
    many<ShotRow>(
      db,
      `SELECT to_char(s.performed_at - make_interval(mins => $2::int), 'YYYY-MM') AS month,
              COALESCE(SUM(se.makes), 0)::float8 AS made, COALESCE(SUM(se.attempts), 0)::float8 AS att,
              COALESCE(SUM(se.makes) FILTER (WHERE e.name ILIKE '%três%'), 0)::float8 AS "threeMade",
              COALESCE(SUM(se.attempts) FILTER (WHERE e.name ILIKE '%três%'), 0)::float8 AS "threeAtt",
              COALESCE(SUM(se.makes) FILTER (WHERE e.name ILIKE 'lance livre%'), 0)::float8 AS "ftMade",
              COALESCE(SUM(se.attempts) FILTER (WHERE e.name ILIKE 'lance livre%'), 0)::float8 AS "ftAtt"
       FROM session_entries se JOIN practice_sessions s ON s.id = se.session_id JOIN exercises e ON e.id = se.exercise_id
       WHERE s.user_id = $1 AND se.makes IS NOT NULL AND se.attempts IS NOT NULL GROUP BY 1`,
      [userId, tzOffset],
    ),
    many<ShotRow>(
      db,
      `SELECT to_char(played_on, 'YYYY-MM') AS month, SUM(fg_made)::float8 AS made, SUM(fg_att)::float8 AS att,
              SUM(three_made)::float8 AS "threeMade", SUM(three_att)::float8 AS "threeAtt",
              SUM(ft_made)::float8 AS "ftMade", SUM(ft_att)::float8 AS "ftAtt"
       FROM games WHERE user_id = $1 GROUP BY 1`,
      [userId],
    ),
  ])
  const shotMonths = [...new Set([...practice, ...games].map((r) => r.month))]
  const shotsByMonth = new Map(shotMonths.map((m) => [m, shootingOf([...practice, ...games].filter((r) => r.month === m))]))

  // Mês com teste ou com taxa de arremesso que já conta.
  const withShots = shotMonths.filter((m) => Object.values(shotsByMonth.get(m)!).some(Boolean))
  const months = [...new Set([...rows.map((r) => r.month), ...withShots])].sort()
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
    const shooting = shotsByMonth.get(month) ?? { tres: null, quadra: null, lance_pct: null }
    const ratings = [...Object.values(skills), ...Object.values(shooting)].flatMap((s) => (s ? [s.rating] : []))
    return {
      month,
      skills,
      shooting,
      overall: ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
      complete: Object.values(skills).every(Boolean),
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
      shootingSkills: SHOOTING_SKILLS.map(({ id, name, zero, top }) => ({ id, name, zero, top })),
      months,
      current: months.at(-1) ?? null,
    })
  })

  return router
}
