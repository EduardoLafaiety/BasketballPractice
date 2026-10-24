import { Router } from 'express'
import { z } from 'zod'
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
  warmup: z.boolean().default(true),
  seed: z.number().int().optional(),
})

type ExerciseRow = { id: number; name: string; category: string; metric: string }

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
    'SELECT id, name, category, metric FROM exercises WHERE user_id IS NULL OR user_id = $1 ORDER BY id',
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
  const blocks: (ExerciseRow & { minutes: number })[] = []

  let remaining = input.minutes
  if (input.warmup && remaining >= 20) {
    const options = exercises.filter((e) => e.category === 'drible' || e.category === 'condicionamento')
    if (options.length) {
      const warmup = pick(options)
      used.add(warmup.id)
      blocks.push({ ...warmup, minutes: 5 })
      remaining -= 5
    }
  }

  const minutes = splitMinutes(remaining)
  // Começa por uma categoria aleatória e alterna entre as do foco para variar o treino.
  let category = Math.floor(rand() * focus.length)
  for (const duration of minutes) {
    const ofCategory = exercises.filter((e) => e.category === focus[category % focus.length])
    const fresh = ofCategory.filter((e) => !used.has(e.id))
    const options = fresh.length ? fresh : ofCategory.length ? ofCategory : exercises
    const chosen = pick(options)
    used.add(chosen.id)
    blocks.push({ ...chosen, minutes: duration })
    category++
  }

  return blocks.map(({ id, name, category, metric, minutes }) => ({ exerciseId: id, name, category, metric, minutes }))
}

export function plansRouter(db: Database) {
  const router = Router()

  // Modelos com os ids dos exercícios já resolvidos; nomes que sumiram do catálogo são ignorados.
  router.get('/templates', async (req, res) => {
    const exercises = await visibleExercises(db, currentUser(req))
    // Ordenados por id, o catálogo vem antes: um exercício do atleta com o mesmo nome não o substitui.
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
