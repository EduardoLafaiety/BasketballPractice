import assert from 'node:assert/strict'
import { it } from 'node:test'
import { startApi } from './http.js'
const { api, register } = await startApi()

it('salva a semana com durações e não altera nada se qualquer exercício for inválido', async () => {
  const { token } = await register()
  const exerciseId = (await api('GET', '/exercises', undefined, token)).body[0].id
  const days = Array.from({ length: 7 }, (_, day) => ({ day, exercises: day === 1 ? [{ exerciseId, minutes: 4 }] : [] }))
  const first = await api('PUT', '/routine', { days }, token)
  assert.equal(first.status, 200)
  const monday = (await api('GET', `/workouts/${first.body.ids[1]}`, undefined, token)).body
  assert.equal(monday.exercises[0].targetSeconds, 240)
  const invalid = days.map((d) => ({ ...d, exercises: [{ exerciseId: d.day === 6 ? 2147483647 : exerciseId, minutes: 7 }] }))
  assert.equal((await api('PUT', '/routine', { days: invalid }, token)).status, 400)
  const unchanged = (await api('GET', `/workouts/${first.body.ids[1]}`, undefined, token)).body
  assert.equal(unchanged.exercises[0].targetSeconds, 240)
  assert.equal((await api('GET', '/workouts', undefined, token)).body.length, 7)
})
