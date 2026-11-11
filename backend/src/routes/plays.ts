import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { idParam, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

// Coordenadas no sistema do desenho da quadra: 500 de largura; 470 de altura na meia quadra e 940 na inteira.
export const COURT_SIZE = { meia: { width: 500, height: 470 }, inteira: { width: 500, height: 940 } } as const

const coordinate = z.number().finite().min(0).max(940)

const pieceSchema = z.object({
  kind: z.enum(['ataque', 'defesa', 'bola']),
  x: coordinate,
  y: coordinate,
  label: z.string().trim().max(3).nullish(),
})

const arrowSchema = z.object({
  kind: z.enum(['movimento', 'passe', 'drible', 'bloqueio']),
  x1: coordinate,
  y1: coordinate,
  x2: coordinate,
  y2: coordinate,
})

export const playSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    court: z.enum(['meia', 'inteira']),
    pieces: z.array(pieceSchema).max(20),
    arrows: z.array(arrowSchema).max(40),
    notes: z.string().trim().max(1000).nullish(),
  })
  .superRefine((play, ctx) => {
    const { width, height } = COURT_SIZE[play.court]
    const fora = (x: number, y: number) => x > width || y > height
    if (play.pieces.some((p) => fora(p.x, p.y)) || play.arrows.some((a) => fora(a.x1, a.y1) || fora(a.x2, a.y2))) {
      ctx.addIssue({ code: 'custom', message: 'Desenho fora da quadra', path: ['pieces'] })
    }
  })

const MAX_PLAYS = 200
const COLUMNS = `id, name, court, data, created_at AS "createdAt", updated_at AS "updatedAt"`

type Row = { id: number; name: string; court: string; data: { pieces: unknown[]; arrows: unknown[]; notes?: string | null }; createdAt: string; updatedAt: string }
const toPlay = ({ data, ...row }: Row) => ({ ...row, pieces: data.pieces, arrows: data.arrows, notes: data.notes ?? null })

export function playsRouter(db: Database) {
  const router = Router()

  router.get('/', async (req, res) => {
    const rows = await many<Row>(db, `SELECT ${COLUMNS} FROM plays WHERE user_id = $1 ORDER BY updated_at DESC, id DESC`, [currentUser(req)])
    res.json(rows.map(toPlay))
  })

  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const row = await one<Row>(db, `SELECT ${COLUMNS} FROM plays WHERE id = $1 AND user_id = $2`, [id, currentUser(req)])
    if (!row) throw notFound('Jogada')
    res.json(toPlay(row))
  })

  router.post('/', async (req, res) => {
    const userId = currentUser(req)
    const play = parse(playSchema, req.body)
    const { n } = (await one<{ n: number }>(db, 'SELECT COUNT(*)::int AS n FROM plays WHERE user_id = $1', [userId]))!
    if (n >= MAX_PLAYS) throw new HttpError(400, `Limite de ${MAX_PLAYS} jogadas salvas`)
    const row = await one<Row>(
      db,
      `INSERT INTO plays (user_id, name, court, data) VALUES ($1, $2, $3, $4::jsonb) RETURNING ${COLUMNS}`,
      [userId, play.name, play.court, JSON.stringify({ pieces: play.pieces, arrows: play.arrows, notes: play.notes ?? null })],
    )
    res.status(201).json(toPlay(row!))
  })

  router.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const play = parse(playSchema, req.body)
    const row = await one<Row>(
      db,
      `UPDATE plays SET name = $1, court = $2, data = $3::jsonb, updated_at = now() WHERE id = $4 AND user_id = $5 RETURNING ${COLUMNS}`,
      [play.name, play.court, JSON.stringify({ pieces: play.pieces, arrows: play.arrows, notes: play.notes ?? null }), id, currentUser(req)],
    )
    if (!row) throw notFound('Jogada')
    res.json(toPlay(row))
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { rowCount } = await db.query('DELETE FROM plays WHERE id = $1 AND user_id = $2', [id, currentUser(req)])
    if (!rowCount) throw notFound('Jogada')
    res.status(204).end()
  })

  return router
}
