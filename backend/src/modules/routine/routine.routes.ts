import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database } from '../../db/index.js'
import { dbId, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { assertExercisesVisible } from '../exercises/exercise.repository.js'

const weekSchema = z.object({ days: z.array(z.object({
  day: z.number().int().min(0).max(6),
  exercises: z.array(z.object({ exerciseId: dbId, minutes: z.number().int().min(1).max(180) })).max(50),
})).length(7).refine((days) => new Set(days.map((d) => d.day)).size === 7, 'Informe cada dia uma vez') })

/** Contrato explícito da semana, preservando treinos antigos e vínculos com sessões. */
export function routineRouter(db: Database) {
  const router = Router()
  router.put('/', async (req, res) => {
    const { days } = parse(weekSchema, req.body)
    const userId = currentUser(req)
    const ids = await db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(4246, $1)', [userId])
      await assertExercisesVisible(tx, days.flatMap((d) => d.exercises.map((e) => e.exerciseId)), userId)
      const result: Record<number, number> = {}
      for (const { day, exercises } of days) {
        const description = `bp-rotina:${day}`
        const existing = (await many<{ id: number }>(tx, 'SELECT id FROM workouts WHERE user_id = $1 AND description = $2 ORDER BY updated_at DESC, id DESC LIMIT 1', [userId, description]))[0]
        const id = existing?.id ?? (await one<{ id: number }>(tx, 'INSERT INTO workouts (user_id, name, description) VALUES ($1, $2, $3) RETURNING id', [userId, `Rotina ${day}`, description]))!.id
        await tx.query('UPDATE workouts SET updated_at = now() WHERE id = $1', [id])
        await tx.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id])
        for (const [position, e] of exercises.entries()) await tx.query('INSERT INTO workout_exercises (workout_id, exercise_id, position, target_seconds) VALUES ($1, $2, $3, $4)', [id, e.exerciseId, position, e.minutes * 60])
        result[day] = id
      }
      return result
    })
    res.json({ ids })
  })
  return router
}
