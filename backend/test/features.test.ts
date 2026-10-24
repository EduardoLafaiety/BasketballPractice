import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.js'
import { generatePlan } from '../src/routes/plans.js'
import { streaks } from '../src/routes/stats.js'
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

const exercise = async (name: string) =>
  (await api('GET', '/exercises')).body.find((e: { name: string }) => e.name === name) as { id: number; name: string }

before(async () => {
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
  const register = await api(
    'POST',
    '/auth/register',
    { name: 'Atleta', email: 'ferramentas@example.com', password: 'senha-segura' },
    '',
  )
  token = register.body.token
})

after(async () => {
  server.close()
  await db.close()
})

describe('Sequência de dias', () => {
  it('conta a sequência atual até ontem e guarda a melhor', () => {
    assert.deepEqual(streaks([], '2026-10-24'), { current: 0, best: 0 })
    assert.deepEqual(streaks(['2026-10-22', '2026-10-23'], '2026-10-24'), { current: 2, best: 2 })
    assert.deepEqual(streaks(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-20'], '2026-10-24'), {
      current: 0,
      best: 3,
    })
    assert.deepEqual(streaks(['2026-10-24', '2026-10-23', '2026-10-23'], '2026-10-24'), { current: 2, best: 2 })
  })
})

describe('Gerador de treino', () => {
  const catalog = [
    { id: 1, name: 'A', category: 'arremesso', metric: 'acertos' },
    { id: 2, name: 'B', category: 'arremesso', metric: 'acertos' },
    { id: 3, name: 'D', category: 'drible', metric: 'tempo' },
    { id: 4, name: 'C', category: 'condicionamento', metric: 'tempo' },
  ]

  it('respeita o tempo total, o foco e a semente', () => {
    const plan = generatePlan(catalog, { minutes: 45, focus: ['arremesso'], warmup: true, seed: 7 })
    assert.equal(plan.reduce((t, b) => t + b.minutes, 0), 45)
    assert.ok(['drible', 'condicionamento'].includes(plan[0].category))
    assert.ok(plan.slice(1).every((b) => b.category === 'arremesso'))
    assert.ok(plan.every((b) => b.minutes >= 5))
    assert.deepEqual(plan, generatePlan(catalog, { minutes: 45, focus: ['arremesso'], warmup: true, seed: 7 }))
  })
})

describe('Ferramentas na API', () => {
  it('registra arremessos por zona, sequência e cansaço', async () => {
    const freeThrow = await exercise('Lance livre')
    const created = await api('POST', '/sessions', {
      performedAt: '2026-10-20T18:00:00-03:00',
      durationMinutes: 30,
      fatigue: 4,
      entries: [{ exerciseId: freeThrow.id, makes: 12, attempts: 20, bestStreak: 6 }],
      shots: [
        { zone: 'lance_livre', makes: 8, attempts: 10 },
        { zone: 'tres_topo', makes: 4, attempts: 10 },
      ],
    })
    assert.equal(created.status, 201)
    assert.equal(created.body.fatigue, 4)
    assert.equal(created.body.entries[0].bestStreak, 6)
    assert.equal(created.body.shots.length, 2)

    const listed = (await api('GET', '/sessions')).body[0]
    assert.deepEqual(listed.shots, created.body.shots)

    const badStreak = await api('POST', '/sessions', {
      performedAt: '2026-10-20',
      entries: [{ exerciseId: freeThrow.id, makes: 3, attempts: 5, bestStreak: 4 }],
    })
    assert.equal(badStreak.status, 400)
    const repeatedZone = await api('POST', '/sessions', {
      performedAt: '2026-10-20',
      shots: [
        { zone: 'garrafao', makes: 1, attempts: 1 },
        { zone: 'garrafao', makes: 1, attempts: 2 },
      ],
    })
    assert.equal(repeatedZone.status, 400)

    const zones = (await api('GET', '/stats/zones')).body
    assert.equal(zones.length, 12)
    assert.deepEqual(
      zones.find((z: { zone: string }) => z.zone === 'lance_livre'),
      { zone: 'lance_livre', makes: 8, attempts: 10, percentage: 80 },
    )
    assert.equal(zones.find((z: { zone: string }) => z.zone === 'garrafao').percentage, null)

    const summary = (await api('GET', '/stats/summary')).body
    assert.equal(summary.totals.averageFatigue, 4)
    assert.equal(summary.byExercise[0].bestStreak, 6)
    assert.equal(summary.byWeek[0].percentage, 60)
  })

  it('calcula sequência e conquistas no fuso do atleta', async () => {
    // 22h em Brasília de 20/10 já é 21/10 em UTC: com tzOffset=180 conta como um dia só.
    await api('POST', '/sessions', { performedAt: '2026-10-20T22:00:00-03:00', durationMinutes: 10 })
    const progress = (await api('GET', '/stats/progress?tzOffset=180')).body
    assert.equal(progress.streak.best, 1)
    assert.equal(progress.totals.sessions, 2)
    const first = progress.achievements.find((a: { id: string }) => a.id === 'primeira-sessao')
    assert.equal(first.unlocked, true)
    assert.equal(progress.achievements.find((a: { id: string }) => a.id === '7-dias').unlocked, false)
    assert.equal((await api('GET', '/stats/progress?tzOffset=9999')).status, 400)
  })

  it('cria metas e calcula o progresso', async () => {
    const freeThrow = await exercise('Lance livre')
    const pct = await api('POST', '/goals', {
      title: '70% nos lances livres',
      kind: 'aproveitamento',
      target: 70,
      exerciseId: freeThrow.id,
    })
    assert.equal(pct.status, 201)
    assert.equal(pct.body.exerciseName, 'Lance livre')
    assert.equal(typeof pct.body.current, 'number')

    assert.equal((await api('POST', '/goals', { title: 'Demais', kind: 'aproveitamento', target: 120 })).status, 400)
    assert.equal(
      (await api('POST', '/goals', { title: 'Errado', kind: 'sessoes_semana', target: 3, exerciseId: freeThrow.id })).status,
      400,
    )

    const total = await api('POST', '/goals', { title: '2 sessões', kind: 'sessoes_total', target: 2, deadline: '2026-12-31' })
    assert.equal(total.body.current, 0)
    assert.equal(total.body.deadline, '2026-12-31')
    await api('POST', '/sessions', { performedAt: new Date().toISOString(), durationMinutes: 20 })
    await api('POST', '/sessions', { performedAt: new Date().toISOString(), durationMinutes: 20 })
    const goals = (await api('GET', '/goals?tzOffset=180')).body
    const updated = goals.find((g: { id: number }) => g.id === total.body.id)
    assert.equal(updated.current, 2)
    assert.equal(updated.achieved, true)

    assert.equal((await api('DELETE', `/goals/${pct.body.id}`)).status, 204)
    assert.equal((await api('DELETE', `/goals/${pct.body.id}`)).status, 404)
  })

  it('registra testes físicos', async () => {
    assert.ok((await api('GET', '/tests/kinds')).body.some((k: { kind: string }) => k.kind === 'impulsao'))
    const created = await api('POST', '/tests', { kind: 'impulsao', value: 55.5, performedAt: '2026-10-01' })
    assert.equal(created.status, 201)
    assert.equal(created.body.value, 55.5)
    assert.equal((await api('POST', '/tests', { kind: 'voo', value: 1, performedAt: '2026-10-01' })).status, 400)
    assert.equal((await api('GET', '/tests?kind=impulsao')).body.length, 1)
  })

  it('salva preferências com padrões', async () => {
    const initial = (await api('GET', '/settings')).body
    assert.deepEqual(initial, {
      theme: 'sistema',
      reminders: { enabled: false, time: '18:00', days: [1, 2, 3, 4, 5] },
      metronomeBpm: 90,
    })
    const saved = await api('PUT', '/settings', { theme: 'escuro', reminders: { enabled: true, time: '07:30', days: [6] } })
    assert.equal(saved.status, 200)
    assert.equal((await api('GET', '/settings')).body.reminders.time, '07:30')
    assert.equal((await api('PUT', '/settings', { reminders: { time: '25:00' } })).status, 400)
  })

  it('lista modelos de rotina e gera treinos', async () => {
    const templates = (await api('GET', '/plans/templates')).body
    assert.ok(templates.length >= 3)
    assert.ok(templates.every((t: { days: Record<string, unknown[]> }) => Object.keys(t.days).length === 7))
    assert.ok(templates[0].days['1'][0].exerciseId > 0)

    const plan = await api('POST', '/plans/generate', { minutes: 30, focus: ['drible'], seed: 1 })
    assert.equal(plan.status, 200)
    assert.equal(plan.body.minutes, 30)
    assert.equal((await api('POST', '/plans/generate', { minutes: 5 })).status, 400)
  })

  it('exporta e importa os dados sem duplicar', async () => {
    const custom = await api('POST', '/exercises', { name: 'Floater', category: 'finalizacao', metric: 'acertos' })
    await api('POST', '/workouts', { name: 'Rotina de sábado', description: 'bp-rotina:6', exercises: [{ exerciseId: custom.body.id }] })
    await api('POST', '/sessions', {
      performedAt: '2026-10-10T10:00:00Z',
      entries: [{ exerciseId: custom.body.id, makes: 3, attempts: 4 }],
      shots: [{ zone: 'garrafao', makes: 3, attempts: 4 }],
    })

    const exported = (await api('GET', '/data/export')).body
    assert.equal(exported.format, 'basketball-practice')
    assert.equal(exported.exercises.length, 1)
    assert.equal(exported.settings.theme, 'escuro')

    // Reimportar na mesma conta não cria nada novo.
    const again = await api('POST', '/data/import', exported)
    assert.equal(again.status, 200)
    assert.equal(again.body.created.sessions, 0)
    assert.equal(again.body.created.exercises, 0)
    assert.equal(again.body.skipped.sessions, exported.sessions.length)

    // Numa conta nova, recria o exercício personalizado e liga as sessões a ele.
    const other = await api('POST', '/auth/register', { name: 'Outra', email: 'outra@example.com', password: 'senha-segura' }, '')
    const imported = await api('POST', '/data/import', exported, other.body.token)
    assert.equal(imported.status, 200)
    assert.equal(imported.body.created.exercises, 1)
    assert.equal(imported.body.created.sessions, exported.sessions.length)
    assert.equal(imported.body.created.goals, exported.goals.length)
    const otherSessions = (await api('GET', '/sessions?limit=200', undefined, other.body.token)).body
    const floater = otherSessions.find((s: { entries: { exerciseName: string }[] }) => s.entries[0]?.exerciseName === 'Floater')
    assert.ok(floater)
    assert.notEqual(floater.entries[0].exerciseId, custom.body.id)
    assert.deepEqual(floater.shots, [{ zone: 'garrafao', makes: 3, attempts: 4 }])

    assert.equal((await api('POST', '/data/import', { format: 'outro', version: 1 })).status, 400)
  })
})
