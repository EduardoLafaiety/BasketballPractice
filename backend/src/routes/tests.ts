import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database } from '../db/index.js'
import { notFound } from '../lib/http-error.js'
import { idParam, isoDate, parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'

// Testes físicos periódicos. `better` diz se o valor maior ou menor é o melhor resultado.
export const TEST_KINDS = {
  impulsao: { name: 'Impulsão vertical', unit: 'cm', better: 'higher' },
  sprint: { name: 'Sprint de quadra inteira', unit: 's', better: 'lower' },
  agilidade: { name: 'Agilidade no garrafão', unit: 's', better: 'lower' },
  suicidio: { name: 'Suicídio completo', unit: 's', better: 'lower' },
  lances_1min: { name: 'Lances livres em 1 minuto', unit: 'cestas', better: 'higher' },
} as const

const kinds = Object.keys(TEST_KINDS) as [keyof typeof TEST_KINDS, ...(keyof typeof TEST_KINDS)[]]

export const testSchema = z.object({
  kind: z.enum(kinds),
  value: z.number().positive().max(100000),
  performedAt: isoDate.transform((value) => new Date(value).toISOString()),
  notes: z.string().trim().max(500).nullish(),
})

const listQuery = z.object({ kind: z.enum(kinds).optional() })

const COLUMNS = `id, kind, value, performed_at AS "performedAt", notes`

export function testsRouter(db: Database) {
  const router = Router()

  router.get('/kinds', (_req, res) => {
    res.json(Object.entries(TEST_KINDS).map(([kind, info]) => ({ kind, ...info })))
  })

  router.get('/', async (req, res) => {
    const { kind } = parse(listQuery, req.query)
    res.json(
      await many(
        db,
        `SELECT ${COLUMNS} FROM physical_tests
         WHERE user_id = $1 AND ($2::text IS NULL OR kind = $2) ORDER BY performed_at DESC, id DESC`,
        [currentUser(req), kind ?? null],
      ),
    )
  })

  router.post('/', async (req, res) => {
    const body = parse(testSchema, req.body)
    const test = await one(
      db,
      `INSERT INTO physical_tests (user_id, kind, value, performed_at, notes) VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [currentUser(req), body.kind, body.value, body.performedAt, body.notes ?? null],
    )
    res.status(201).json(test)
  })

  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    const { rowCount } = await db.query('DELETE FROM physical_tests WHERE id = $1 AND user_id = $2', [
      id,
      currentUser(req),
    ])
    if (!rowCount) throw notFound('Teste')
    res.status(204).end()
  })

  return router
}
