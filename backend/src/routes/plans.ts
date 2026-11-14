import { Router } from 'express'
import { z } from 'zod'
import { LEVELS } from '../db/catalog.js'
import { many, type Database, type Queryable } from '../db/index.js'
import { HttpError } from '../lib/http-error.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { CATEGORIES } from './exercises.js'

const generateSchema = z.object({
  minutes: z.number().int().min(10).max(180),
  focus: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length).default([]),
  level: z.enum(LEVELS).optional(),
  warmup: z.boolean().default(true),
  seed: z.number().int().optional(),
  // Exercícios a evitar (a rotina semanal passa os já usados nos outros dias); só se repetem se não houver outro da categoria.
  exclude: z.array(z.number().int()).max(500).default([]),
})

type ExerciseRow = { id: number; name: string; category: string; metric: string; level?: string | null; warmup?: boolean; position?: number | null }

// Gerador pseudoaleatório com semente (mulberry32): a mesma semente gera o mesmo treino.
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const visibleExercises = (db: Queryable, userId: number) =>
  many<ExerciseRow>(
    db,
    `SELECT id, name, category, metric, level, warmup, position FROM exercises WHERE user_id IS NULL OR user_id = $1
     ORDER BY id`,
    [userId],
  )

/** Divide `total` minutos em blocos de ~10 min (nenhum menor que 5). */
function splitMinutes(total: number) {
  const count = Math.max(1, Math.round(total / 10))
  const base = Math.floor(total / count)
  return Array.from({ length: count }, (_, i) => base + (i < total - base * count ? 1 : 0))
}

export function generatePlan(exercises: ExerciseRow[], input: z.infer<typeof generateSchema>) {
  const rand = random(input.seed ?? Math.floor(Math.random() * 2 ** 31))
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)]
  const focus = input.focus.length ? input.focus : [...CATEGORIES]
  const used = new Set<number>(input.exclude)
  const warmups: (ExerciseRow & { minutes: number })[] = []
  const main: (ExerciseRow & { minutes: number })[] = []
  // Exercício do atleta não tem nível e serve para todos; o aquecimento nunca entra na parte principal.
  const ofLevel = exercises.filter((e) => !input.level || !e.level || e.level === input.level)
  const pool = ofLevel.filter((e) => !e.warmup)

  let remaining = input.minutes
  if (input.warmup && remaining >= 20) {
    const options = ofLevel.filter((e) => e.warmup)
    // O geral é sorteado, então dá para preferir o que ainda não saiu; o específico segue a ordem da lista e não pula nada.
    const generalAll = options.filter((e) => e.category === 'condicionamento')
    const general = generalAll.some((e) => !used.has(e.id)) ? generalAll.filter((e) => !used.has(e.id)) : generalAll
    // O aquecimento específico segue a ordem da lista: no arremesso, sempre de perto para longe da cesta.
    const specific = options.filter((e) => e.category !== 'condicionamento' && focus.includes(e.category as (typeof focus)[number]))
    const chosen = [general.length ? pick(general) : undefined, ...specific.slice(0, remaining >= 45 ? 2 : 1)].filter((e) => e !== undefined)
    for (const warmup of chosen.length ? chosen : options.slice(0, 1)) {
      used.add(warmup.id)
      warmups.push({ ...warmup, minutes: 3 })
      remaining -= 3
    }
  }

  const minutes = splitMinutes(remaining)
  // Começa por uma categoria aleatória e alterna entre as do foco para variar o treino.
  let category = Math.floor(rand() * focus.length)
  for (const duration of minutes) {
    const ofCategory = pool.filter((e) => e.category === focus[category % focus.length])
    const fresh = ofCategory.filter((e) => !used.has(e.id))
    const options = fresh.length ? fresh : ofCategory.length ? ofCategory : pool.length ? pool : exercises
    const chosen = pick(options)
    used.add(chosen.id)
    main.push({ ...chosen, minutes: duration })
    category++
  }

  // Do mais simples ao mais difícil: a posição do catálogo é a progressão; o que é do atleta fica no fim.
  const progression = (a: ExerciseRow, b: ExerciseRow) => (a.position ?? Infinity) - (b.position ?? Infinity) || 0
  const blocks = [...warmups.sort(progression), ...main.sort(progression)]

  return blocks.map(({ id, name, category, metric, minutes }) => ({ exerciseId: id, name, category, metric, minutes }))
}

export function plansRouter(db: Database) {
  const router = Router()

  router.post('/generate', async (req, res) => {
    const body = parse(generateSchema, req.body)
    const exercises = await visibleExercises(db, currentUser(req))
    if (!exercises.length) throw new HttpError(400, 'Nenhum exercício disponível')
    const blocks = generatePlan(exercises, body)
    res.json({ minutes: blocks.reduce((total, block) => total + block.minutes, 0), blocks })
  })

  return router
}
