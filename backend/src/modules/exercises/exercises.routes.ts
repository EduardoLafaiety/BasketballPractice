import { Router } from 'express'
import type { Database } from '../../db/index.js'
import { idParam, parse } from '../../lib/validate.js'
import { currentUser } from '../../middleware/auth.js'
import { exerciseSchema, listQuery } from './exercise.schema.js'
import { createExercise, deleteExercise, getExercise, listExercises, updateExercise } from './exercise.service.js'

export function exercisesRouter(db: Database) {
  const router = Router()
  router.get('/', async (req, res) => {
    res.json(await listExercises(db, currentUser(req), parse(listQuery, req.query)))
  })
  router.get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await getExercise(db, currentUser(req), id))
  })
  router.post('/', async (req, res) => {
    res.status(201).json(await createExercise(db, currentUser(req), parse(exerciseSchema, req.body)))
  })
  router.put('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    res.json(await updateExercise(db, currentUser(req), id, req.body))
  })
  router.delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params)
    await deleteExercise(db, currentUser(req), id)
    res.status(204).end()
  })
  return router
}
