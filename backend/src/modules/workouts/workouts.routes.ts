import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { idParam, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { workoutSchema } from './workout.schema.js'
import { createWorkout, deleteWorkout, getWorkout, listWorkouts, updateWorkout } from './workout.service.js'

export function workoutsRouter(db: Database) {
  const router = Router()
  router.get('/', async (req, res) => {
    res.json(await listWorkouts(db, currentUser(req)))
  })
  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await getWorkout(db, currentUser(req), id))
  })
  router.post('/', async (req, res) => {
    res.status(201).json(await createWorkout(db, currentUser(req), parse(workoutSchema, req.body)))
  })
  router.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await updateWorkout(db, currentUser(req), id, parse(workoutSchema, req.body)))
  })
  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await deleteWorkout(db, currentUser(req), id)
    res.status(204).end()
  })
  return router
}
