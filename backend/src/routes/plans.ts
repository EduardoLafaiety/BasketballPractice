import { Router } from 'express'
import { z } from 'zod'
import { LEVELS } from '../db/catalog.js'
import { many, type Database, type Queryable } from '../db/index.js'
import { HttpError } from '../lib/http-error.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { CATEGORIES } from './exercises.js'

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6

// Rotinas semanais prontas, montadas com os nomes do catálogo padrão (seed.ts).
// Dias: 0 = domingo ... 6 = sábado; dia ausente = descanso.
const TEMPLATES: { id: string; name: string; description: string; days: Partial<Record<Day, string[]>> }[] = [
  {
    id: 'iniciante-3x',
    name: 'Iniciante — 3x por semana',
    description: 'Fundamentos básicos em dias alternados, com descanso entre os treinos.',
    days: {
      1: ['Mikan drill', 'Drible estacionário', 'Lance livre'],
      3: ['Passe na parede', 'Bandeja com a mão fraca', 'Arremesso de média distância'],
      5: ['Mikan drill', 'Zigue-zague com mudança de direção', 'Lance livre'],
    },
  },
  {
    id: 'foco-arremesso',
    name: 'Foco em arremesso — 4 semanas',
    description: 'Volume alto de arremessos, do lance livre à linha de três, com finalização nos dias alternados.',
    days: {
      1: ['Lance livre', 'Arremesso de média distância', 'Arremesso de três'],
      2: ['Arremesso após drible', 'Mikan drill', 'Lance livre'],
      3: ['Lance livre', 'Arremesso de média distância', 'Arremesso de três'],
      4: ['Arremesso após drible', 'Bandeja com a mão fraca', 'Lance livre'],
      5: ['Lance livre', 'Arremesso de três', 'Arremesso após drible'],
      6: ['Arremesso de três', 'Lance livre'],
    },
  },
  {
    id: 'pre-temporada',
    name: 'Pré-temporada',
    description: 'Condicionamento, defesa e fundamentos para chegar inteiro no início da temporada.',
    days: {
      1: ['Suicídio', 'Deslizamento defensivo', 'Mikan drill'],
      2: ['Drible estacionário', 'Zigue-zague com mudança de direção', 'Lance livre'],
      3: ['Saltos na caixa', 'Closeout', 'Arremesso de média distância'],
      5: ['Suicídio', 'Drible com duas bolas', 'Arremesso após drible'],
      6: ['Saltos na caixa', 'Arremesso de três', 'Passe na parede'],
    },
  },
  {
    id: 'manejo-de-bola',
    name: 'Manejo de bola',
    description: 'Drible e passe todos os dias úteis, para ganhar confiança com as duas mãos.',
    days: {
      1: ['Drible estacionário', 'Passe na parede'],
      2: ['Drible com duas bolas', 'Zigue-zague com mudança de direção'],
      3: ['Drible estacionário', 'Bandeja com a mão fraca'],
      4: ['Drible com duas bolas', 'Passe na parede'],
      5: ['Zigue-zague com mudança de direção', 'Arremesso após drible'],
    },
  },
]

const generateSchema = z.object({
  minutes: z.number().int().min(10).max(180),
  focus: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length).default([]),
  level: z.enum(LEVELS).optional(),
  warmup: z.boolean().default(true),
  seed: z.number().int().optional(),
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

const visibleExercises = (db: Queryable, userId: number, catalogFirst = false) =>
  many<ExerciseRow>(
    db,
    `SELECT id, name, category, metric, level, warmup, position FROM exercises WHERE user_id IS NULL OR user_id = $1
     ORDER BY ${catalogFirst ? 'user_id NULLS FIRST, ' : ''}id`,
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
  const used = new Set<number>()
  const warmups: (ExerciseRow & { minutes: number })[] = []
  const main: (ExerciseRow & { minutes: number })[] = []
  // Exercício do atleta não tem nível e serve para todos; o aquecimento nunca entra na parte principal.
  const ofLevel = exercises.filter((e) => !input.level || !e.level || e.level === input.level)
  const pool = ofLevel.filter((e) => !e.warmup)

  let remaining = input.minutes
  if (input.warmup && remaining >= 20) {
    const options = ofLevel.filter((e) => e.warmup)
    const general = options.filter((e) => e.category === 'condicionamento')
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

  // Modelos com os ids dos exercícios já resolvidos; nomes que sumiram do catálogo são ignorados.
  router.get('/templates', async (req, res) => {
    // O catálogo vem antes: um exercício do atleta com o mesmo nome não o substitui, mesmo que seja mais
    // antigo que um exercício acrescentado ao catálogo depois.
    const exercises = await visibleExercises(db, currentUser(req), true)
    const byName = new Map<string, ExerciseRow>()
    for (const exercise of exercises) if (!byName.has(exercise.name)) byName.set(exercise.name, exercise)
    res.json(
      TEMPLATES.map(({ days, ...template }) => ({
        ...template,
        days: Object.fromEntries(
          ([0, 1, 2, 3, 4, 5, 6] as Day[]).map((day) => [
            day,
            (days[day] ?? []).flatMap((name) => {
              const exercise = byName.get(name)
              return exercise ? [{ exerciseId: exercise.id, name: exercise.name }] : []
            }),
          ]),
        ),
      })),
    )
  })

  router.post('/generate', async (req, res) => {
    const body = parse(generateSchema, req.body)
    const exercises = await visibleExercises(db, currentUser(req))
    if (!exercises.length) throw new HttpError(400, 'Nenhum exercício disponível')
    const blocks = generatePlan(exercises, body)
    res.json({ minutes: blocks.reduce((total, block) => total + block.minutes, 0), blocks })
  })

  return router
}
