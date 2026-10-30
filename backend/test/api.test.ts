import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.js'
import { isPgError, prepareDatabase, UNIQUE_VIOLATION } from '../src/db/index.js'
import { openTestDatabase } from './pglite.js'

const db = await openTestDatabase()
const server = createApp(db).listen(0)
let baseUrl = ''
let token = ''

async function api(method: string, path: string, body?: unknown, auth = token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

before(() => {
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})

after(async () => {
  server.close()
  await db.close()
})

describe('API', () => {
  it('responde ao health check', async () => {
    assert.deepEqual((await api('GET', '/health')).body, { status: 'ok' })
  })

  it('cadastra, faz login e bloqueia rotas sem token', async () => {
    const credentials = { name: 'Atleta', email: 'atleta@example.com', password: 'senha-segura' }
    const register = await api('POST', '/auth/register', credentials, '')
    assert.equal(register.status, 201)
    assert.equal(register.body.user.email, credentials.email)

    assert.equal((await api('POST', '/auth/register', credentials, '')).status, 409)
    assert.equal((await api('POST', '/auth/login', { ...credentials, password: 'errada123' }, '')).status, 401)

    const login = await api('POST', '/auth/login', credentials, '')
    assert.equal(login.status, 200)
    token = login.body.token

    assert.equal((await api('GET', '/exercises', undefined, '')).status, 401)
    assert.equal((await api('GET', '/auth/me')).body.name, 'Atleta')
  })

  it('cria treino, registra sessão e calcula estatísticas', async () => {
    const shooting = (await api('GET', '/exercises?category=arremesso')).body
    assert.ok(shooting.length > 0)
    const freeThrow = shooting.find((e: { name: string }) => e.name === 'Lance livre')

    const custom = await api('POST', '/exercises', { name: 'Floater', category: 'finalizacao', metric: 'acertos' })
    assert.equal(custom.status, 201)
    assert.equal(custom.body.custom, true)
    assert.equal((await api('PUT', `/exercises/${freeThrow.id}`, { name: 'X', category: 'arremesso', metric: 'acertos' })).status, 403)

    const workout = await api('POST', '/workouts', {
      name: 'Arremesso de segunda',
      exercises: [
        { exerciseId: freeThrow.id, sets: 5, targetReps: 10 },
        { exerciseId: custom.body.id, sets: 3, targetReps: 10 },
      ],
    })
    assert.equal(workout.status, 201)
    assert.equal(workout.body.exercises.length, 2)

    const session = await api('POST', '/sessions', {
      workoutId: workout.body.id,
      performedAt: '2026-10-20',
      durationMinutes: 60,
      rating: 4,
      entries: [
        { exerciseId: freeThrow.id, attempts: 50, makes: 40 },
        { exerciseId: custom.body.id, attempts: 30, makes: 15 },
      ],
    })
    assert.equal(session.status, 201)
    assert.equal(session.body.workoutName, 'Arremesso de segunda')

    const invalid = await api('POST', '/sessions', {
      performedAt: '2026-10-21',
      entries: [{ exerciseId: freeThrow.id, attempts: 5, makes: 6 }],
    })
    assert.equal(invalid.status, 400)

    const impossibleDate = await api('POST', '/sessions', { performedAt: '2026-02-31' })
    assert.equal(impossibleDate.status, 400)
    assert.deepEqual(impossibleDate.body.details, { performedAt: ['Data inválida'] })
    assert.equal((await api('GET', '/stats/summary?from=2026-13-01')).status, 400)

    assert.equal((await api('DELETE', `/exercises/${custom.body.id}`)).status, 409)

    const stats = (await api('GET', '/stats/summary?from=2026-10-01&to=2026-10-31')).body
    assert.equal(stats.totals.sessions, 1)
    assert.equal(stats.totals.minutes, 60)
    assert.deepEqual(stats.shooting, { makes: 55, attempts: 80, percentage: 68.8 })
    assert.equal(stats.byWeek[0].weekStart, '2026-10-19')

    await api('POST', '/sessions', { performedAt: '2026-10-22', notes: 'Sem exercícios' })
    const list = (await api('GET', '/sessions?from=2026-10-01&to=2026-10-31')).body
    assert.equal(list.length, 2)
    assert.equal(list[0].notes, 'Sem exercícios')
    assert.deepEqual(list[0].entries, [])
    const listed = list[1]
    assert.equal(listed.id, session.body.id)
    assert.equal(listed.entryCount, 2)
    assert.equal(listed.makes, 55)
    assert.equal(listed.attempts, 80)
    assert.deepEqual(listed.entries, session.body.entries)
    assert.equal(listed.entries[0].exerciseName, freeThrow.name)
    assert.equal(listed.entries[0].category, freeThrow.category)

    const outsideRange = (await api('GET', '/sessions?from=2026-11-01')).body
    assert.equal(outsideRange.length, 0)

    // 23h30 de 22/10 em Brasília já é 23/10 em UTC: com horário no filtro, vale o instante, não o dia UTC.
    await api('POST', '/sessions', { performedAt: '2026-10-22T23:30:00-03:00' })
    const fromLocalMidnight = encodeURIComponent('2026-10-23T00:00:00-03:00')
    assert.equal((await api('GET', `/sessions?from=${fromLocalMidnight}`)).body.length, 0)
    assert.equal((await api('GET', '/sessions?from=2026-10-23&to=2026-10-23')).body.length, 1)
  })

  it('conta dias e semanas no fuso do cliente (tzOffset)', async () => {
    const user = await api('POST', '/auth/register', { name: 'Fuso', email: 'fuso@example.com', password: 'senha-segura' }, '')
    const auth = user.body.token
    // Domingo 25/10 às 23h em Brasília = segunda 26/10 02h em UTC.
    await api('POST', '/sessions', { performedAt: '2026-10-25T23:00:00-03:00', durationMinutes: 45 }, auth)
    const brt = 'tzOffset=180'

    const sunday = (await api('GET', `/sessions?from=2026-10-25&to=2026-10-25&${brt}`, undefined, auth)).body
    assert.equal(sunday.length, 1)
    assert.equal((await api('GET', `/sessions?from=2026-10-26&${brt}`, undefined, auth)).body.length, 0)

    const summary = (await api('GET', `/stats/summary?from=2026-10-25&to=2026-10-25&${brt}`, undefined, auth)).body
    assert.equal(summary.totals.sessions, 1)
    assert.equal(summary.totals.minutes, 45)
    assert.deepEqual(summary.byWeek.map((w: { weekStart: string }) => w.weekStart), ['2026-10-19'])

    // Sem tzOffset continua valendo o dia em UTC (compatível com clientes antigos).
    const utc = (await api('GET', '/stats/summary?from=2026-10-26&to=2026-10-26', undefined, auth)).body
    assert.equal(utc.totals.sessions, 1)
    assert.equal(utc.byWeek[0].weekStart, '2026-10-26')

    assert.equal((await api('GET', '/stats/summary?tzOffset=9999', undefined, auth)).status, 400)
  })

  it('isola os dados entre usuários', async () => {
    const other = await api('POST', '/auth/register', { name: 'Outro', email: 'outro@example.com', password: 'senha-segura' }, '')
    const otherToken = other.body.token
    assert.equal((await api('GET', '/workouts', undefined, otherToken)).body.length, 0)
    assert.equal((await api('GET', '/sessions', undefined, otherToken)).body.length, 0)
    assert.equal((await api('GET', '/workouts/1', undefined, otherToken)).status, 404)
  })

  it('libera o painel admin só para administradores', async () => {
    const credentials = { name: 'Chefe', email: 'chefe@example.com', password: 'senha-segura' }
    const register = await api('POST', '/auth/register', credentials, '')
    assert.equal(register.body.user.isAdmin, false)
    const adminToken = register.body.token
    assert.equal((await api('GET', '/admin/users', undefined, adminToken)).status, 403)
    assert.equal((await api('GET', '/admin/users', undefined, '')).status, 401)

    await db.query('UPDATE users SET is_admin = true WHERE email = $1', [credentials.email])
    assert.equal((await api('GET', '/auth/me', undefined, adminToken)).body.isAdmin, true)

    const users = (await api('GET', '/admin/users', undefined, adminToken)).body
    const athlete = users.find((u: { email: string }) => u.email === 'atleta@example.com')
    assert.ok(athlete.workouts > 0 && athlete.sessions > 0)
    assert.equal(users[0].passwordHash, undefined)

    // Comum não promove ninguém; admin promove e o novo admin passa a ter acesso na hora.
    assert.equal((await api('PATCH', `/admin/users/${athlete.id}`, { isAdmin: true })).status, 403)
    const promoted = await api('PATCH', `/admin/users/${athlete.id}`, { isAdmin: true }, adminToken)
    assert.equal(promoted.body.isAdmin, true)
    assert.equal((await api('GET', '/admin/users')).status, 200)
    await api('PATCH', `/admin/users/${athlete.id}`, { isAdmin: false }, adminToken)
    assert.equal((await api('GET', '/admin/users')).status, 403)

    const self = users.find((u: { email: string }) => u.email === credentials.email)
    assert.equal((await api('PATCH', `/admin/users/${self.id}`, { isAdmin: false }, adminToken)).status, 400)
    assert.equal((await api('DELETE', `/admin/users/${self.id}`, undefined, adminToken)).status, 400)
    assert.equal((await api('PATCH', `/admin/users/${athlete.id}`, { isAdmin: 'sim' }, adminToken)).status, 400)

    const other = users.find((u: { email: string }) => u.email === 'outro@example.com')
    assert.equal((await api('DELETE', `/admin/users/${other.id}`, undefined, adminToken)).status, 204)
    assert.equal((await api('DELETE', `/admin/users/${other.id}`, undefined, adminToken)).status, 404)
    assert.equal((await api('POST', '/auth/login', { email: 'outro@example.com', password: 'senha-segura' }, '')).status, 401)
  })
})

describe('Banco de dados', () => {
  it('reaplicar migrações e seed não duplica nada', async () => {
    const before = await db.query('SELECT COUNT(*)::int AS n FROM exercises WHERE user_id IS NULL')
    await prepareDatabase(db)
    const afterRun = await db.query('SELECT COUNT(*)::int AS n FROM exercises WHERE user_id IS NULL')
    assert.deepEqual(afterRun.rows, before.rows)
    assert.deepEqual((await db.query('SELECT MAX(version) AS v FROM schema_migrations')).rows, [{ v: 5 }])
  })

  it('garante e-mail único sem diferenciar maiúsculas', async () => {
    await assert.rejects(
      db.query(`INSERT INTO users (name, email, password_hash) VALUES ('X', 'ATLETA@example.com', 'x')`),
      (error) => isPgError(error, UNIQUE_VIOLATION),
    )
  })
})
