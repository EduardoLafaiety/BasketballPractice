import assert from 'node:assert/strict'
import { it } from 'node:test'
import { startApi } from './http.js'
import { compareSessions } from '../src/modules/sessions/session.comparison.js'

const { api, db, register } = await startApi()
it('compara no banco com janelas locais, pesos corretos, filtro e isolamento entre contas', async () => {
  const { token, id } = await register()
  const other = await register()
  const exercises = (await api('GET', '/exercises', undefined, token)).body
  const a = exercises[0].id, b = exercises[1].id
  const create = (date: string, makes: number, attempts: number, exerciseId = a, auth = token) => api('POST', '/sessions', {
    performedAt: date, durationMinutes: 20, entries: [{ exerciseId, makes, attempts }],
  }, auth)
  await create('2026-11-18T10:00:00-03:00', 1, 1)
  await create('2026-11-12T00:00:00-03:00', 1, 9)
  await create('2026-11-11T23:59:00-03:00', 2, 2)
  await create('2026-11-18T11:00:00-03:00', 3, 4, b)
  await create('2026-11-19T00:00:00-03:00', 50, 50)
  await create('2026-11-18T12:00:00-03:00', 100, 100, a, other.token)
  const result = await compareSessions(db, id, { days: 7, tzOffset: 180, exerciseId: a }, new Date('2026-11-18T12:00:00-03:00'))
  assert.deepEqual(result.atual, { frequencia: 2, diasAtivos: 2, minutos: 0, acertos: 2, tentativas: 10, repeticoes: 0, segundos: 0, aproveitamento: 20 })
  assert.equal(result.anterior.aproveitamento, 100)
  assert.equal(result.exercicios.length, 2)
  const all = await compareSessions(db, id, { days: 7, tzOffset: 180 }, new Date('2026-11-18T12:00:00-03:00'))
  assert.equal(all.atual.frequencia, 3)
  assert.equal(all.atual.minutos, 60)
  assert.equal((await api('GET', '/sessions/comparison?days=14', undefined, token)).status, 400)
  assert.equal((await api('GET', '/sessions/comparison?exerciseId=2147483648', undefined, token)).status, 400)
})
