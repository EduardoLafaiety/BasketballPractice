import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import { config } from '../src/config.js'
import { criarConta } from './caixa.js'
import { startApi } from './http.js'

const { api, register, db, baseUrl, caixa } = await startApi()

describe('Autenticação', () => {
  it('aceita só o formato "Bearer <token>"', async () => {
    const { token } = await register()
    assert.equal((await api('GET', '/auth/me', undefined, token)).status, 200)

    for (const header of [token, `Basic ${token}`, `Token ${token}`, 'Bearer', 'Bearer ']) {
      const response = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: header } })
      assert.equal(response.status, 401, `Authorization: ${header.slice(0, 12)}`)
    }
    assert.equal((await fetch(`${baseUrl}/auth/me`)).status, 401)
  })

  it('compara o e-mail sem diferenciar maiúsculas no login e no cadastro', async () => {
    const credentials = { name: 'Caixa', email: 'Caixa.Alta@Example.com', password: 'senha-segura' }
    const created = await criarConta(api, caixa, credentials)
    assert.equal(created.user.email, 'caixa.alta@example.com')

    const login = await api('POST', '/auth/login', { email: '  CAIXA.ALTA@example.COM ', password: 'senha-segura' })
    assert.equal(login.status, 200)
    assert.equal(login.body.user.id, created.user.id)

    // A segunda tentativa, em outra caixa de letras, não cria outro pedido de ativação.
    assert.equal((await api('POST', '/auth/register', { ...credentials, email: 'caixa.alta@EXAMPLE.com' })).status, 202)
    await caixa.terminar()
    assert.match(caixa.para('caixa.alta@example.com').at(-1)!.subject, /já tem conta/)
  })

  it('não revela se o e-mail existe e nunca devolve o hash da senha', async () => {
    const { email } = await register()
    const wrongPassword = await api('POST', '/auth/login', { email, password: 'errada-123' })
    const unknownEmail = await api('POST', '/auth/login', { email: 'ninguem@example.com', password: 'errada-123' })
    assert.equal(wrongPassword.status, 401)
    assert.deepEqual(unknownEmail, wrongPassword)

    const login = await api('POST', '/auth/login', { email, password: 'senha-segura' })
    const me = await api('GET', '/auth/me', undefined, login.body.token)
    for (const user of [login.body.user, me.body]) {
      assert.equal(user.passwordHash, undefined)
      assert.equal(user.password_hash, undefined)
    }
  })

  it('recusa cadastro com senha curta, nome curto ou e-mail inválido', async () => {
    const valid = { name: 'Atleta', email: 'valido@example.com', password: 'senha-segura' }
    for (const [field, value] of [
      ['password', '1234567'],
      ['name', 'A'],
      ['email', 'sem-arroba'],
    ] as const) {
      const response = await api('POST', '/auth/register', { ...valid, [field]: value })
      assert.equal(response.status, 400, field)
      assert.ok(response.body.details[field], field)
    }
  })

  it('bloqueia o token de quem teve a conta excluída', async () => {
    const { token, id } = await register()
    await db.query('DELETE FROM users WHERE id = $1', [id])

    assert.equal((await api('GET', '/auth/me', undefined, token)).status, 401)
    assert.equal((await api('POST', '/sessions', { performedAt: '2026-10-20' }, token)).status, 401)
    assert.equal((await api('GET', '/sessions', undefined, token)).status, 401)
  })

  it('recusa token vencido', async () => {
    const { id } = await register()
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 1 }, config.jwtSecret, { subject: String(id) })
    assert.equal((await api('GET', '/sessions', undefined, expired)).status, 401)
  })
})

describe('Isolamento entre atletas', () => {
  // A cria um item de cada tipo; B tenta ler, editar, apagar e usar cada um.
  let a: { token: string }
  let b: { token: string }
  const ids = { exercise: 0, workout: 0, session: 0, goal: 0, test: 0 }

  before(async () => {
    a = await register('Dono')
    b = await register('Intruso')
    ids.exercise = (await api('POST', '/exercises', { name: 'Floater', category: 'finalizacao', metric: 'acertos' }, a.token)).body.id
    ids.workout = (await api('POST', '/workouts', { name: 'Treino A', exercises: [{ exerciseId: ids.exercise }] }, a.token)).body.id
    ids.session = (
      await api(
        'POST',
        '/sessions',
        { workoutId: ids.workout, performedAt: '2026-10-20', entries: [{ exerciseId: ids.exercise, attempts: 10, makes: 5 }] },
        a.token,
      )
    ).body.id
    ids.goal = (await api('POST', '/goals', { title: 'Meta A', kind: 'sessoes_total', target: 10 }, a.token)).body.id
    ids.test = (await api('POST', '/tests', { kind: 'impulsao', value: 50, performedAt: '2026-10-20' }, a.token)).body.id
    assert.ok(Object.values(ids).every((id) => id > 0), 'dados do atleta A criados')
  })

  it('não deixa ler, editar nem apagar dados de outro atleta (responde 404, sem confirmar que existem)', async () => {
    const attempts: [string, string, unknown?][] = [
      ['GET', `/exercises/${ids.exercise}`],
      ['PUT', `/exercises/${ids.exercise}`, { name: 'Roubado', category: 'arremesso', metric: 'acertos' }],
      ['DELETE', `/exercises/${ids.exercise}`],
      ['GET', `/workouts/${ids.workout}`],
      ['PUT', `/workouts/${ids.workout}`, { name: 'Roubado' }],
      ['DELETE', `/workouts/${ids.workout}`],
      ['GET', `/sessions/${ids.session}`],
      ['PUT', `/sessions/${ids.session}`, { performedAt: '2026-10-21' }],
      ['DELETE', `/sessions/${ids.session}`],
      ['PUT', `/goals/${ids.goal}`, { title: 'Roubada', kind: 'sessoes_total', target: 1 }],
      ['DELETE', `/goals/${ids.goal}`],
      ['DELETE', `/tests/${ids.test}`],
    ]
    for (const [method, path, body] of attempts) {
      assert.equal((await api(method, path, body, b.token)).status, 404, `${method} ${path}`)
    }

    // Nada mudou para o dono.
    assert.equal((await api('GET', `/exercises/${ids.exercise}`, undefined, a.token)).body.name, 'Floater')
    assert.equal((await api('GET', `/workouts/${ids.workout}`, undefined, a.token)).body.name, 'Treino A')
    assert.equal((await api('GET', `/sessions/${ids.session}`, undefined, a.token)).body.entries.length, 1)
    assert.equal((await api('GET', '/goals', undefined, a.token)).body[0].title, 'Meta A')
    assert.equal((await api('GET', '/tests', undefined, a.token)).body.length, 1)
  })

  it('não deixa usar exercício ou treino de outro atleta nos próprios registros', async () => {
    const workout = await api('POST', '/workouts', { name: 'Meu', exercises: [{ exerciseId: ids.exercise }] }, b.token)
    assert.equal(workout.status, 400)

    const withWorkout = await api('POST', '/sessions', { workoutId: ids.workout, performedAt: '2026-10-20' }, b.token)
    assert.equal(withWorkout.status, 400)

    const withExercise = await api(
      'POST',
      '/sessions',
      { performedAt: '2026-10-20', entries: [{ exerciseId: ids.exercise, attempts: 1, makes: 1 }] },
      b.token,
    )
    assert.equal(withExercise.status, 400)

    const goal = await api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 5, exerciseId: ids.exercise }, b.token)
    assert.equal(goal.status, 400)
  })

  it('listas, resumo, metas e backup mostram só os dados do próprio atleta', async () => {
    const exercises = (await api('GET', '/exercises', undefined, b.token)).body
    assert.ok(!exercises.some((e: { id: number }) => e.id === ids.exercise))
    assert.deepEqual((await api('GET', '/sessions', undefined, b.token)).body, [])
    assert.deepEqual((await api('GET', '/goals', undefined, b.token)).body, [])
    assert.deepEqual((await api('GET', '/tests', undefined, b.token)).body, [])
    assert.equal((await api('GET', '/stats/summary', undefined, b.token)).body.totals.sessions, 0)

    const backup = (await api('GET', '/data/export', undefined, b.token)).body
    assert.deepEqual([backup.exercises, backup.workouts, backup.sessions, backup.goals], [[], [], [], []])
  })
})
