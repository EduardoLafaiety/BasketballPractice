import assert from 'node:assert/strict'
import { it } from 'node:test'
import { startApi } from './http.js'
import type { EventoHttp } from '../src/middleware/observabilidade.js'

const eventos: EventoHttp[] = []
let indisponivel = false
const { api, register, baseUrl } = await startApi({ observarHttp: (e) => eventos.push(e) }, (db) => ({
  ...db,
  query: (sql, params) => {
    if (indisponivel) return Promise.reject(Object.assign(new Error('segredo-do-banco'), { code: 'ECONNREFUSED' }))
    return db.query(sql, params)
  },
}))

it('liveness funciona sem banco e readiness sinaliza indisponibilidade sem cache', async () => {
  indisponivel = true
  try {
    const live = await fetch(`${baseUrl}/live`)
    assert.equal(live.status, 200)
    assert.equal(live.headers.get('cache-control'), 'no-store')
    assert.match(live.headers.get('x-request-id')!, /^[a-f0-9-]{36}$/)
    const health = await fetch(`${baseUrl}/health`)
    assert.equal(health.status, 503)
    assert.equal(health.headers.get('cache-control'), 'no-store')
    assert.doesNotMatch(await health.text(), /segredo/)
  } finally { indisponivel = false }
  assert.equal((await api('GET', '/health')).status, 200)
})

it('telemetria omite caminho arbitrário, query, corpo, token e e-mail', async () => {
  await fetch(`${baseUrl}/segredo-pessoal?email=privado@example.com`, { method: 'POST', body: 'senha-secreta', headers: { Authorization: 'Bearer token-secreto' } })
  const evento = eventos.at(-1)!
  assert.equal(evento.recurso, 'unmatched')
  assert.equal(evento.status, 404)
  assert.deepEqual(Object.keys(evento).sort(), ['duracaoMs', 'evento', 'metodo', 'recurso', 'requestId', 'status'])
  assert.doesNotMatch(JSON.stringify(eventos), /segredo|privado|senha|Bearer/)
})

it('projeção de progresso pagina, isola contas e preserva os insumos das fórmulas sem notas', async () => {
  const owner = await register(), other = await register()
  const exerciseId = (await api('GET', '/exercises', undefined, owner.token)).body[0].id
  for (const day of [1, 2]) {
    assert.equal((await api('POST', '/sessions', {
      performedAt: `2026-11-0${day}T12:00:00Z`, durationMinutes: 30, notes: 'Nota privada '.repeat(100),
      entries: [{ exerciseId, makes: 10, attempts: 20, bestStreak: 7 }, { exerciseId, makes: 5, bestStreak: 3 }],
      shots: [{ zone: 'tres_topo', makes: 3, attempts: 8 }],
    }, owner.token)).status, 201)
  }
  const raw = (await api('GET', '/sessions?limit=1&offset=1', undefined, owner.token)).body[0]
  const result = await api('GET', '/sessions/progress?limit=1&offset=1', undefined, owner.token)
  assert.equal(result.status, 200)
  assert.equal(result.body.length, 1)
  const compact = result.body[0]
  assert.equal(compact.id, raw.id)
  assert.equal(compact.performedAt, raw.performedAt)
  assert.equal(compact.durationMinutes, raw.durationMinutes)
  assert.equal(compact.makes, 15)
  assert.equal(compact.bestStreak, 7)
  assert.deepEqual(compact.entries, [{ exerciseId }, { exerciseId }])
  assert.deepEqual(compact.shots, raw.shots)
  assert.ok(JSON.stringify(compact).length < JSON.stringify(raw).length / 2)
  assert.equal(compact.notes, undefined)
  assert.deepEqual((await api('GET', '/sessions/progress', undefined, other.token)).body, [])
  assert.equal((await api('GET', '/sessions/progress?limit=201', undefined, owner.token)).status, 400)
  assert.equal((await api('GET', '/sessions/progress')).status, 401)
})

it('simula recuperação por exportação e importação em outra conta sem duplicar sessões', async () => {
  const source = await register(), target = await register()
  const custom = await api('POST', '/exercises', { name: 'Recuperação controle', category: 'drible', metric: 'tempo', description: 'Pessoal' }, source.token)
  assert.equal(custom.status, 201)
  const workout = await api('POST', '/workouts', { name: 'Segunda recuperada', description: 'bp-rotina:1', exercises: [{ exerciseId: custom.body.id, targetSeconds: 300 }] }, source.token)
  assert.equal(workout.status, 201)
  assert.equal((await api('POST', '/sessions', { workoutId: workout.body.id, performedAt: '2026-11-01T12:00:00Z', durationMinutes: 5, notes: 'Recuperar este registro', entries: [{ exerciseId: custom.body.id, seconds: 300 }] }, source.token)).status, 201)
  const backup = (await api('GET', '/data/export', undefined, source.token)).body
  const imported = await api('POST', '/data/import', backup, target.token)
  assert.equal(imported.status, 200)
  assert.deepEqual(imported.body.created, { exercises: 1, workouts: 1, sessions: 1 })
  const restored = (await api('GET', '/data/export', undefined, target.token)).body
  assert.equal(restored.sessions[0].notes, backup.sessions[0].notes)
  assert.equal(restored.workouts[0].description, 'bp-rotina:1')
  assert.equal(restored.sessions[0].entries[0].exerciseId, restored.exercises[0].id)
  assert.notEqual(restored.exercises[0].id, backup.exercises[0].id)
  assert.equal((await api('POST', '/data/import', backup, target.token)).body.skipped.sessions, 1)
  assert.deepEqual((await api('GET', '/data/export', undefined, source.token)).body.sessions, backup.sessions)
})
