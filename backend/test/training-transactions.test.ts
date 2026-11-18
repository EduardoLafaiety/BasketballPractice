import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { it } from 'node:test'
import type { Database, Queryable } from '../src/db/index.js'
import { createSessionSchema, sessionSchema } from '../src/modules/sessions/session.schema.js'
import { createSession, updateSession } from '../src/modules/sessions/session.service.js'
import { startApi } from './http.js'

let failQuery: ((sql: string, params?: unknown[]) => boolean) | null = null
const withFailure = (real: Database): Database => ({
  ...real,
  transaction: (fn) => real.transaction((tx) => {
    const wrapped: Queryable = {
      query: (sql, params) => {
        if (failQuery?.(sql, params)) throw new Error('Falha simulada durante a transação')
        return tx.query(sql, params)
      },
    }
    return fn(wrapped)
  }),
})
const { api, db, register } = await startApi({}, withFailure)
const base = () => ({ performedAt: new Date().toISOString(), durationMinutes: 10, entries: [], shots: [] })

it('falha ao substituir entradas desfaz cabeçalho, entradas e zonas da sessão', async () => {
  const { token } = await register()
  const exerciseId = (await api('GET', '/exercises', undefined, token)).body[0].id
  const initial = { ...base(), notes: 'Antes', entries: [{ exerciseId, makes: 2, attempts: 3 }], shots: [{ zone: 'garrafao', makes: 2, attempts: 3 }] }
  const created = await api('POST', '/sessions', initial, token)
  assert.equal(created.status, 201)
  const path = `/sessions/${created.body.id}`
  const before = (await api('GET', path, undefined, token)).body
  const edited = { ...initial, notes: 'Depois', durationMinutes: 20, entries: [{ exerciseId, makes: 4, attempts: 5 }], shots: [{ zone: 'tres_topo', makes: 4, attempts: 5 }] }
  failQuery = (sql) => sql.includes('INSERT INTO session_entries')
  try { assert.equal((await api('PUT', path, edited, token)).status, 500) }
  finally { failQuery = null }
  assert.deepEqual((await api('GET', path, undefined, token)).body, before)
  const saved = await api('PUT', path, edited, token)
  assert.equal(saved.status, 200)
  assert.equal(saved.body.notes, 'Depois')
  assert.equal(saved.body.durationMinutes, 20)
  assert.equal(saved.body.entries[0].makes, 4)
  assert.equal(saved.body.shots[0].zone, 'tres_topo')
})

it('falha depois de alterar parte da semana desfaz todos os dias e mantém seus IDs', async () => {
  const { token } = await register()
  const exerciseId = (await api('GET', '/exercises', undefined, token)).body[0].id
  const days = Array.from({ length: 7 }, (_, day) => ({ day, exercises: [{ exerciseId, minutes: 4 }] }))
  const saved = await api('PUT', '/routine', { days }, token)
  assert.equal(saved.status, 200)
  const before = await Promise.all(Object.values(saved.body.ids).map((id) => api('GET', `/workouts/${id}`, undefined, token)))
  let inserts = 0
  failQuery = (sql) => sql.includes('INSERT INTO workout_exercises') && ++inserts === 4
  try {
    const edited = days.map((day) => ({ ...day, exercises: [{ exerciseId, minutes: 7 }] }))
    assert.equal((await api('PUT', '/routine', { days: edited }, token)).status, 500)
  } finally { failQuery = null }
  const after = await Promise.all(Object.values(saved.body.ids).map((id) => api('GET', `/workouts/${id}`, undefined, token)))
  assert.deepEqual(after, before)
  assert.equal((await api('GET', '/workouts', undefined, token)).body.length, 7)
})

it('edição e exclusão recusam a sessão de outra conta, sem revelar nem alterar o registro', async () => {
  const owner = await register(), other = await register()
  const created = await api('POST', '/sessions', { ...base(), notes: 'Privada' }, owner.token)
  const path = `/sessions/${created.body.id}`
  const before = (await api('GET', path, undefined, owner.token)).body
  assert.equal((await api('PUT', path, { ...base(), workoutId: 2147483647 }, other.token)).status, 404)
  assert.equal((await api('DELETE', path, undefined, other.token)).status, 404)
  assert.deepEqual((await api('GET', path, undefined, owner.token)).body, before)
})

it('os serviços funcionam sem HTTP e reenvio não substitui o conteúdo já confirmado', async () => {
  const { id } = await register()
  const input = createSessionSchema.parse({ ...base(), clientId: randomUUID(), notes: 'Original' })
  const created = await createSession(db, id, input)
  const repeated = await createSession(db, id, { ...input, workoutId: 2147483647, notes: 'Não sobrescrever' })
  assert.equal(repeated.id, created.id)
  assert.equal(repeated.notes, 'Original')
  const edited = await updateSession(db, id, created.id, sessionSchema.parse({ ...base(), notes: 'Edição explícita' }))
  assert.equal(edited.notes, 'Edição explícita')
})
