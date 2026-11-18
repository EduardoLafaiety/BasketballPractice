import assert from 'node:assert/strict'
import { it } from 'node:test'
import type { Database, Queryable } from '../src/db/index.js'
import { generateUserPlan } from '../src/modules/plans/plan.service.js'
import { generateSchema } from '../src/modules/plans/plan.schema.js'
import { startApi } from './http.js'

let failRestart = false
const { api, db, register } = await startApi({}, (real: Database): Database => ({
  ...real,
  transaction: (fn) => real.transaction((tx) => {
    const wrapped: Queryable = {
      query: (sql, params) => {
        if (failRestart && sql.includes('INSERT INTO user_programs')) throw new Error('Falha simulada no reinício')
        return tx.query(sql, params)
      },
    }
    return fn(wrapped)
  }),
}))

it('falha ao reiniciar o programa preserva início, progresso e vínculo da sessão', async () => {
  const { token } = await register()
  const path = '/programs/arremesso-30'
  assert.equal((await api('POST', `${path}/start`, {}, token)).status, 201)
  const session = await api('POST', '/sessions', { performedAt: '2026-11-18', entries: [] }, token)
  assert.equal(session.status, 201)
  assert.equal((await api('POST', `${path}/days/1/complete`, { sessionId: session.body.id }, token)).status, 201)
  const before = (await api('GET', path, undefined, token)).body
  failRestart = true
  try { assert.equal((await api('POST', `${path}/start`, {}, token)).status, 500) }
  finally { failRestart = false }
  assert.deepEqual((await api('GET', path, undefined, token)).body, before)
  assert.equal((await api('GET', `/sessions/${session.body.id}`, undefined, token)).status, 200)
  const linked = await db.query<{ session_id: number }>('SELECT session_id FROM program_days_done WHERE session_id = $1', [session.body.id])
  assert.equal(linked.rows[0].session_id, session.body.id)
})

it('serviço de planos mantém semente e usa somente catálogo e exercícios da própria conta', async () => {
  const a = await register(), b = await register()
  const custom = { name: 'Controle exclusivo', category: 'drible', metric: 'tempo' }
  const own = await api('POST', '/exercises', custom, a.token)
  const foreign = await api('POST', '/exercises', { ...custom, name: 'Exercício de outra conta' }, b.token)
  assert.equal(own.status, 201); assert.equal(foreign.status, 201)
  const input = generateSchema.parse({ minutes: 40, focus: ['drible'], warmup: false, seed: 7 })
  const first = await generateUserPlan(db, a.id, input)
  assert.deepEqual(await generateUserPlan(db, a.id, input), first)
  assert.equal(first.minutes, 40)
  assert.ok(first.blocks.every((block) => block.exerciseId !== foreign.body.id))
  const visible = new Set((await api('GET', '/exercises', undefined, a.token)).body.map((e: { id: number }) => e.id))
  assert.ok(first.blocks.every((block) => visible.has(block.exerciseId)))
  const [only] = (await db.query('SELECT id, name, category, metric FROM exercises WHERE id = $1', [own.body.id])).rows
  const single: Queryable = { query: async <T>() => ({ rows: [only] as T[], rowCount: 1 }) }
  assert.ok((await generateUserPlan(single, a.id, input)).blocks.every((block) => block.exerciseId === own.body.id))
  const empty: Queryable = { query: async () => ({ rows: [], rowCount: 0 }) }
  await assert.rejects(generateUserPlan(empty, a.id, input), { status: 400, message: 'Nenhum exercício disponível' })
})

it('exercício próprio pode ser editado; catálogo e conta alheia permanecem protegidos', async () => {
  const a = await register(), b = await register()
  const body = { name: 'Antes', category: 'drible', metric: 'tempo' }
  const exercise = await api('POST', '/exercises', body, a.token)
  const path = `/exercises/${exercise.body.id}`
  assert.equal((await api('PUT', path, { ...body, name: 'Não permitido' }, b.token)).status, 404)
  assert.equal((await api('DELETE', path, undefined, b.token)).status, 404)
  const saved = await api('PUT', path, { ...body, name: 'Depois' }, a.token)
  assert.equal(saved.status, 200)
  assert.equal(saved.body.name, 'Depois')
  assert.equal(saved.body.custom, true)
  assert.equal('ownerId' in saved.body, false)
  const catalog = (await api('GET', '/exercises', undefined, a.token)).body.find((e: { custom: boolean }) => !e.custom)
  assert.equal((await api('PUT', `/exercises/${catalog.id}`, body, a.token)).status, 403)
  assert.equal((await api('DELETE', `/exercises/${catalog.id}`, undefined, a.token)).status, 403)
})
