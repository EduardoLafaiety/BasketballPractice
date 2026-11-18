import assert from 'node:assert/strict'
import { it } from 'node:test'
import type { Database, Queryable } from '../src/db/index.js'
import { createBackupService } from '../src/modules/data/backup.service.js'
import { importSchema } from '../src/modules/data/backup.schema.js'
import { startApi } from './http.js'

let failWorkout = false
const { api, db, register } = await startApi({}, (real: Database): Database => ({
  ...real,
  transaction: (fn) => real.transaction((tx) => {
    const wrapped: Queryable = {
      query: (sql, params) => {
        if (failWorkout && sql.includes('INSERT INTO workout_exercises')) throw new Error('Falha simulada nos itens do treino')
        return tx.query(sql, params)
      },
    }
    return fn(wrapped)
  }),
}))

it('falha na edição do treino desfaz nome, descrição e itens, e outra conta não pode editá-lo', async () => {
  const owner = await register(), other = await register()
  const exerciseId = (await api('GET', '/exercises', undefined, owner.token)).body[0].id
  const input = { name: 'Original', description: 'bp-rotina:1', exercises: [{ exerciseId, sets: 2, targetSeconds: 120, notes: 'Antes' }] }
  const created = await api('POST', '/workouts', input, owner.token)
  assert.equal(created.status, 201)
  const path = `/workouts/${created.body.id}`
  const edited = { ...input, name: 'Novo nome', description: 'Nova descrição', exercises: [{ exerciseId, sets: 4, targetSeconds: 240, notes: 'Depois' }] }
  failWorkout = true
  try { assert.equal((await api('PUT', path, edited, owner.token)).status, 500) }
  finally { failWorkout = false }
  assert.deepEqual((await api('GET', path, undefined, owner.token)).body, created.body)
  assert.equal((await api('PUT', path, edited, other.token)).status, 404)
  assert.equal((await api('DELETE', path, undefined, other.token)).status, 404)
  const saved = await api('PUT', path, edited, owner.token)
  assert.equal(saved.status, 200)
  assert.equal(saved.body.name, edited.name)
  assert.equal(saved.body.exercises[0].targetSeconds, 240)
})

it('contrato v1 remapeia referências, preserva a rotina e reimporta sem duplicar pelo serviço', async () => {
  const { id } = await register()
  const backups = createBackupService(db)
  const ref = { exerciseId: 123456, exerciseName: 'Controle de bola pessoal' }
  const input = importSchema.parse({
    format: 'basketball-practice', version: 1,
    exercises: [{ id: ref.exerciseId, name: ref.exerciseName, category: 'drible', metric: 'tempo' }],
    workouts: [{ name: 'Rotina segunda', description: 'bp-rotina:1', exercises: [{ ...ref, sets: 2, targetSeconds: 300, notes: 'Controle' }] }],
    sessions: [{ performedAt: '2026-11-18T12:00:00Z', durationMinutes: 5, workoutName: 'Rotina segunda', entries: [{ ...ref, seconds: 300 }] }],
    settings: { theme: 'escuro' }, extras: { programs: [{ programId: 'ignorado' }] },
  })
  assert.deepEqual((await backups.importBackup(id, input)).created, { exercises: 1, workouts: 1, sessions: 1 })
  const exported = JSON.parse(JSON.stringify(await backups.exportBackup(id)))
  assert.equal(exported.version, 1)
  assert.equal(exported.workouts[0].description, 'bp-rotina:1')
  assert.equal(exported.workouts[0].exercises[0].targetSeconds, 300)
  assert.notEqual(exported.workouts[0].exercises[0].exerciseId, ref.exerciseId)
  assert.equal(exported.sessions[0].entries[0].exerciseId, exported.exercises[0].id)
  assert.equal(exported.settings.theme, 'escuro')
  assert.deepEqual(exported.extras.programs, [])
  const second = await backups.importBackup(id, importSchema.parse(exported))
  assert.deepEqual(second, { created: { exercises: 0, workouts: 0, sessions: 0 }, skipped: { sessions: 1 } })
})

it('uma sessão inválida no fim do backup desfaz exercícios novos e alterações de treinos', async () => {
  const { token } = await register()
  const exercise = (await api('GET', '/exercises', undefined, token)).body[0]
  const created = await api('POST', '/workouts', { name: 'Preservado', exercises: [{ exerciseId: exercise.id, targetSeconds: 120 }] }, token)
  const before = (await api('GET', '/data/export', undefined, token)).body
  const response = await api('POST', '/data/import', {
    format: 'basketball-practice', version: 1,
    exercises: [{ id: 999, name: 'Não deve permanecer', category: 'drible', metric: 'tempo' }],
    workouts: [{ name: 'Preservado', exercises: [{ exerciseName: exercise.name, targetSeconds: 500 }] }],
    sessions: [{ performedAt: '2026-11-18', durationMinutes: 0, entries: [] }],
  }, token)
  assert.equal(response.status, 400)
  const after = (await api('GET', '/data/export', undefined, token)).body
  for (const key of ['exercises', 'workouts', 'sessions', 'settings']) assert.deepEqual(after[key], before[key])
  assert.deepEqual((await api('GET', `/workouts/${created.body.id}`, undefined, token)).body, created.body)
})
