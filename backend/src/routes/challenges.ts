import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database, type Queryable } from '../db/index.js'
import { HttpError } from '../lib/http-error.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { insertSession, tzQuery } from './sessions.js'
import { localToday } from './stats.js'

/**
 * Desafio do dia: sorteado pela data, então é o mesmo para todo mundo no mesmo dia.
 * - tentativas: um número fixo de arremessos; vale quantos caírem.
 * - tempo: quantas cestas couberem no tempo, contadas no contador ao vivo.
 */
export interface DailyChallenge {
  id: string
  title: string
  description: string
  /** Nome de um exercício do catálogo padrão; o resultado vira uma sessão dele. */
  exercise: string
  mode: 'tentativas' | 'tempo'
  attempts?: number
  seconds?: number
  /** Cestas para cumprir o desafio. */
  goal: number
}

export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'lances-20', title: '20 lances livres', description: 'Vinte lances livres seguidos, com a mesma rotina antes de cada um.', exercise: 'Lance livre', mode: 'tentativas', attempts: 20, goal: 15 },
  { id: 'media-2min', title: 'Dois minutos de média', description: 'Arremessos de média distância por dois minutos. Pegue o rebote e volte para fora do garrafão.', exercise: 'Arremesso de média distância', mode: 'tempo', seconds: 120, goal: 20 },
  { id: 'tres-25', title: '25 bolas de três', description: 'Vinte e cinco arremessos de três, cinco de cada posição: cantos, alas e topo.', exercise: 'Arremesso de três', mode: 'tentativas', attempts: 25, goal: 10 },
  { id: 'mikan-1min', title: 'Um minuto de Mikan', description: 'Bandejas alternando os lados da cesta sem deixar a bola cair, por um minuto.', exercise: 'Mikan drill', mode: 'tempo', seconds: 60, goal: 20 },
  { id: 'tabela-30', title: '30 na tabela', description: 'Trinta arremessos usando a tabela, dos dois lados da cesta, a dois passos do aro.', exercise: 'Arremesso na tabela', mode: 'tentativas', attempts: 30, goal: 20 },
  { id: 'volta-ao-mundo', title: 'Volta ao mundo', description: 'Quinze arremessos em sete pontos ao redor do garrafão, indo e voltando.', exercise: 'Volta ao mundo', mode: 'tentativas', attempts: 15, goal: 9 },
  { id: 'lance-cansado', title: 'Lance livre cansado', description: 'Corra de uma linha de fundo à outra antes de cada lance livre. Dez lances.', exercise: 'Lance livre cansado', mode: 'tentativas', attempts: 10, goal: 7 },
  { id: 'receber-3min', title: 'Três minutos de recepção', description: 'Receba (ou jogue a bola para a frente e vá buscar), arme e arremesse, por três minutos.', exercise: 'Receber e arremessar', mode: 'tempo', seconds: 180, goal: 30 },
  { id: 'dois-metros-50', title: '50 a dois metros', description: 'Cinquenta arremessos a dois metros do aro, prestando atenção na mecânica.', exercise: 'Arremesso a dois metros', mode: 'tentativas', attempts: 50, goal: 35 },
  { id: 'bandeja-1min', title: 'Um minuto de bandeja', description: 'Bandejas com a mão forte, um lado e depois o outro, por um minuto.', exercise: 'Bandeja com a mão forte', mode: 'tempo', seconds: 60, goal: 12 },
]

/** FNV-1a: o mesmo dia sempre dá o mesmo número, em qualquer servidor ou navegador. */
function hash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export const challengeFor = (day: string) => DAILY_CHALLENGES[hash(`desafio:${day}`) % DAILY_CHALLENGES.length]

/** Teto de tentativas: no modo tempo, no máximo três arremessos a cada quatro segundos. */
export const maxAttempts = (challenge: DailyChallenge) =>
  challenge.mode === 'tentativas' ? challenge.attempts! : Math.floor((challenge.seconds! * 3) / 4)

const resultSchema = z
  .object({
    makes: z.number().int().min(0).max(1000),
    attempts: z.number().int().min(0).max(1000),
    bestStreak: z.number().int().min(0).max(1000).nullish(),
    /** Duração em segundos, só para a sessão registrada. */
    seconds: z.number().int().min(1).max(3600).nullish(),
  })
  .refine((r) => r.makes <= r.attempts, { message: 'Acertos não podem ser maiores que tentativas', path: ['makes'] })
  .refine((r) => r.bestStreak == null || r.bestStreak <= r.makes, {
    message: 'A sequência não pode passar do número de acertos',
    path: ['bestStreak'],
  })

type ResultRow = { day: string; challengeId: string; makes: number; attempts: number; createdAt: string }

const RESULT_COLUMNS = `to_char(day, 'YYYY-MM-DD') AS day, challenge_id AS "challengeId", makes, attempts, created_at AS "createdAt"`

const withChallenge = (row: ResultRow) => {
  const challenge = DAILY_CHALLENGES.find((c) => c.id === row.challengeId)
  return { ...row, title: challenge?.title ?? row.challengeId, goal: challenge?.goal ?? null, completed: !!challenge && row.makes >= challenge.goal }
}

async function catalogExercise(db: Queryable, name: string) {
  const row = await one<{ id: number }>(db, 'SELECT id FROM exercises WHERE user_id IS NULL AND name = $1', [name])
  if (!row) throw new HttpError(500, `Exercício do catálogo não encontrado: ${name}`)
  return row.id
}

export function challengesRouter(db: Database) {
  const router = Router()

  router.get('/today', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const day = localToday(tzOffset)
    const challenge = challengeFor(day)
    const result = await one<ResultRow>(
      db,
      `SELECT ${RESULT_COLUMNS} FROM daily_challenge_results WHERE user_id = $1 AND day = $2`,
      [userId, day],
    )
    res.json({ day, challenge: { ...challenge, maxAttempts: maxAttempts(challenge) }, result: result ? withChallenge(result) : null })
  })

  router.post('/today', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const body = parse(resultSchema, req.body)
    const day = localToday(tzOffset)
    const challenge = challengeFor(day)
    if (body.attempts < 1) throw new HttpError(400, 'Registre pelo menos um arremesso')
    if (body.attempts > maxAttempts(challenge)) {
      throw new HttpError(400, `Este desafio vai até ${maxAttempts(challenge)} arremessos`, { attempts: ['Acima do limite do desafio'] })
    }

    const result = await db.transaction(async (tx) => {
      const exerciseId = await catalogExercise(tx, challenge.exercise)
      // O primeiro resultado do dia é o que vale: a trava evita dois envios ao mesmo tempo.
      await tx.query('SELECT pg_advisory_xact_lock(4243, $1)', [userId])
      const done = await one(tx, 'SELECT 1 FROM daily_challenge_results WHERE user_id = $1 AND day = $2', [userId, day])
      if (done) throw new HttpError(409, 'Você já fez o desafio de hoje. Volte amanhã!')

      // Vira uma sessão de treino: conta nos números, nas metas e na sequência de dias.
      const sessionId = await insertSession(tx, userId, {
        performedAt: new Date().toISOString(),
        durationMinutes: Math.max(1, Math.round((body.seconds ?? challenge.seconds ?? 60) / 60)),
        notes: `Desafio do dia: ${challenge.title}`,
        entries: [
          {
            exerciseId,
            makes: body.makes,
            attempts: body.attempts,
            bestStreak: body.bestStreak ?? null,
          },
        ],
        shots: [],
      })
      return (await one<ResultRow>(
        tx,
        `INSERT INTO daily_challenge_results (user_id, day, challenge_id, makes, attempts, session_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${RESULT_COLUMNS}`,
        [userId, day, challenge.id, body.makes, body.attempts, sessionId],
      ))!
    })
    res.status(201).json(withChallenge(result))
  })

  router.get('/history', async (req, res) => {
    const rows = await many<ResultRow>(
      db,
      `SELECT ${RESULT_COLUMNS} FROM daily_challenge_results WHERE user_id = $1 ORDER BY day DESC LIMIT 30`,
      [currentUser(req)],
    )
    res.json(rows.map(withChallenge))
  })

  return router
}
