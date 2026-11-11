import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database } from '../db/index.js'
import { notFound } from '../lib/http-error.js'
import { idParam, isoDate, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

const stat = (max: number) => z.number().int().min(0).max(max)

// Os limites seguem a tabela (migração) e barram números impossíveis numa partida.
export const gameSchema = z
  .object({
    playedOn: isoDate.transform((value) => value.slice(0, 10)),
    opponent: z.string().trim().max(80).nullish(),
    teamScore: stat(300).nullish(),
    oppScore: stat(300).nullish(),
    minutes: stat(70).nullish(),
    points: stat(150),
    rebounds: stat(60).default(0),
    assists: stat(50).default(0),
    steals: stat(30).default(0),
    blocks: stat(30).default(0),
    turnovers: stat(30).default(0),
    fgMade: stat(100).default(0),
    fgAtt: stat(100).default(0),
    threeMade: stat(100).default(0),
    threeAtt: stat(100).default(0),
    ftMade: stat(60).default(0),
    ftAtt: stat(60).default(0),
    notes: z.string().trim().max(1000).nullish(),
  })
  .superRefine((g, ctx) => {
    const erro = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (g.fgMade > g.fgAtt) erro('fgMade', 'Cestas não podem passar das tentativas')
    if (g.threeMade > g.threeAtt) erro('threeMade', 'Bolas de três certas não podem passar das tentativas')
    if (g.ftMade > g.ftAtt) erro('ftMade', 'Lances livres certos não podem passar das tentativas')
    if (g.threeMade > g.fgMade || g.threeAtt > g.fgAtt) erro('threeAtt', 'Os arremessos de três fazem parte dos arremessos de quadra')
    // Com os arremessos anotados, os pontos precisam bater: 2 por cesta, 1 a mais em cada bola de três, 1 por lance livre.
    if (g.fgAtt + g.ftAtt > 0 && g.points !== 2 * g.fgMade + g.threeMade + g.ftMade) {
      erro('points', `Com esses arremessos, os pontos são ${2 * g.fgMade + g.threeMade + g.ftMade}`)
    }
    if (g.teamScore != null && g.points > g.teamScore) erro('points', 'Os seus pontos não podem passar do placar do time')
  })

const COLUMNS = `id, to_char(played_on, 'YYYY-MM-DD') AS "playedOn", opponent, team_score AS "teamScore", opp_score AS "oppScore",
  minutes, points, rebounds, assists, steals, blocks, turnovers, fg_made AS "fgMade", fg_att AS "fgAtt",
  three_made AS "threeMade", three_att AS "threeAtt", ft_made AS "ftMade", ft_att AS "ftAtt", notes`

const values = (g: z.infer<typeof gameSchema>) => [
  g.playedOn, g.opponent ?? null, g.teamScore ?? null, g.oppScore ?? null, g.minutes ?? null, g.points, g.rebounds, g.assists,
  g.steals, g.blocks, g.turnovers, g.fgMade, g.fgAtt, g.threeMade, g.threeAtt, g.ftMade, g.ftAtt, g.notes ?? null,
]

const pct = (made: number, att: number) => (att ? Math.round((made / att) * 1000) / 10 : null)

export function gamesRouter(db: Database) {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json(await many(db, `SELECT ${COLUMNS} FROM games WHERE user_id = $1 ORDER BY played_on DESC, id DESC LIMIT 500`, [currentUser(req)]))
  })

  /**
   * Treino × jogo: aproveitamento nos jogos e nos treinos dos últimos 90 dias, no geral, de três e de lance livre.
   * No treino, "de três" são os exercícios com "três" no nome, e lance livre os que começam por "Lance livre".
   */
  router.get('/comparison', async (req, res) => {
    const userId = currentUser(req)
    const [jogos, treino] = await Promise.all([
      one<Record<string, number>>(
        db,
        `SELECT COUNT(*)::int AS games, COALESCE(SUM(points), 0)::int AS points, COALESCE(SUM(rebounds), 0)::int AS rebounds,
                COALESCE(SUM(assists), 0)::int AS assists, COALESCE(SUM(fg_made), 0)::int AS "fgMade", COALESCE(SUM(fg_att), 0)::int AS "fgAtt",
                COALESCE(SUM(three_made), 0)::int AS "threeMade", COALESCE(SUM(three_att), 0)::int AS "threeAtt",
                COALESCE(SUM(ft_made), 0)::int AS "ftMade", COALESCE(SUM(ft_att), 0)::int AS "ftAtt"
         FROM games WHERE user_id = $1 AND played_on >= current_date - 90`,
        [userId],
      ),
      one<Record<string, number>>(
        db,
        `SELECT COALESCE(SUM(se.makes), 0)::float8 AS made, COALESCE(SUM(se.attempts), 0)::float8 AS att,
                COALESCE(SUM(se.makes) FILTER (WHERE e.name ILIKE '%três%'), 0)::float8 AS "threeMade",
                COALESCE(SUM(se.attempts) FILTER (WHERE e.name ILIKE '%três%'), 0)::float8 AS "threeAtt",
                COALESCE(SUM(se.makes) FILTER (WHERE e.name ILIKE 'lance livre%'), 0)::float8 AS "ftMade",
                COALESCE(SUM(se.attempts) FILTER (WHERE e.name ILIKE 'lance livre%'), 0)::float8 AS "ftAtt"
         FROM session_entries se JOIN practice_sessions s ON s.id = se.session_id JOIN exercises e ON e.id = se.exercise_id
         WHERE s.user_id = $1 AND s.performed_at >= now() - interval '90 days'
           AND se.makes IS NOT NULL AND se.attempts IS NOT NULL`,
        [userId],
      ),
    ])
    const j = jogos!
    const t = treino!
    const media = (total: number) => (j.games ? Math.round((total / j.games) * 10) / 10 : null)
    res.json({
      games: j.games,
      averages: { points: media(j.points), rebounds: media(j.rebounds), assists: media(j.assists) },
      shooting: {
        overall: { game: pct(j.fgMade, j.fgAtt), practice: pct(t.made, t.att), gameAttempts: j.fgAtt, practiceAttempts: t.att },
        three: { game: pct(j.threeMade, j.threeAtt), practice: pct(t.threeMade, t.threeAtt), gameAttempts: j.threeAtt, practiceAttempts: t.threeAtt },
        freeThrow: { game: pct(j.ftMade, j.ftAtt), practice: pct(t.ftMade, t.ftAtt), gameAttempts: j.ftAtt, practiceAttempts: t.ftAtt },
      },
    })
  })

  router.post('/', async (req, res) => {
    const game = parse(gameSchema, req.body)
    const row = await one(
      db,
      `INSERT INTO games (user_id, played_on, opponent, team_score, opp_score, minutes, points, rebounds, assists, steals, blocks,
         turnovers, fg_made, fg_att, three_made, three_att, ft_made, ft_att, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING ${COLUMNS}`,
      [currentUser(req), ...values(game)],
    )
    res.status(201).json(row)
  })

  router.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const game = parse(gameSchema, req.body)
    const row = await one(
      db,
      `UPDATE games SET played_on = $1, opponent = $2, team_score = $3, opp_score = $4, minutes = $5, points = $6, rebounds = $7,
         assists = $8, steals = $9, blocks = $10, turnovers = $11, fg_made = $12, fg_att = $13, three_made = $14, three_att = $15,
         ft_made = $16, ft_att = $17, notes = $18
       WHERE id = $19 AND user_id = $20 RETURNING ${COLUMNS}`,
      [...values(game), id, currentUser(req)],
    )
    if (!row) throw notFound('Jogo')
    res.json(row)
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { rowCount } = await db.query('DELETE FROM games WHERE id = $1 AND user_id = $2', [id, currentUser(req)])
    if (!rowCount) throw notFound('Jogo')
    res.status(204).end()
  })

  return router
}
