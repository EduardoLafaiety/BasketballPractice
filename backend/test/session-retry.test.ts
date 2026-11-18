import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { it } from 'node:test'
import { PROGRAMS } from '../src/db/programs.js'
import { startApi } from './http.js'

const { api, register } = await startApi()
const input = () => ({ clientId: randomUUID(), performedAt: new Date().toISOString(), durationMinutes: 10, entries: [] })

it('reenvio após perder a resposta não duplica a sessão nem o dia do programa', async () => {
  const { token } = await register()
  const program = PROGRAMS[0].id
  await api('POST', `/programs/${program}/start`, {}, token)
  const body = { ...input(), program: { id: program, day: 1 }, tzOffset: 180 }
  const first = await api('POST', '/sessions', body, token)
  const again = await api('POST', '/sessions', body, token)
  assert.equal(first.status, 201)
  assert.equal(again.status, 201)
  assert.equal(first.body.id, again.body.id)
  assert.equal((await api('GET', '/sessions', undefined, token)).body.length, 1)
  assert.equal((await api('GET', `/programs/${program}`, undefined, token)).body.status.done, 1)
})

it('dia indisponível desfaz toda a sessão; a mesma chave pode ser usada após corrigir', async () => {
  const { token } = await register()
  const program = PROGRAMS[0].id
  const body = { ...input(), program: { id: program, day: 1 } }
  assert.equal((await api('POST', '/sessions', body, token)).status, 409)
  assert.equal((await api('GET', '/sessions', undefined, token)).body.length, 0)
  await api('POST', `/programs/${program}/start`, {}, token)
  assert.equal((await api('POST', '/sessions', body, token)).status, 201)
  const next = { ...input(), program: { id: program, day: 2 } }
  assert.equal((await api('POST', '/sessions', next, token)).status, 409)
  assert.equal((await api('GET', '/sessions', undefined, token)).body.length, 1)
})

it('a chave de uma conta não retorna a sessão de outra conta', async () => {
  const a = await register(), b = await register()
  const body = input()
  const first = await api('POST', '/sessions', body, a.token)
  const other = await api('POST', '/sessions', body, b.token)
  assert.equal(other.status, 201)
  assert.notEqual(first.body.id, other.body.id)
})
