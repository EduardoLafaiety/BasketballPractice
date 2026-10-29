import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import { startApi } from './http.js'

const { api, register, db } = await startApi()

let token = ''
let freeThrow = 0
before(async () => {
  token = (await register()).token
  const catalog = (await api('GET', '/exercises', undefined, token)).body
  freeThrow = catalog.find((e: { name: string }) => e.name === 'Lance livre').id
})

const session = (extra: Record<string, unknown> = {}) => ({ performedAt: '2026-10-20', ...extra })

describe('Erros HTTP', () => {
  it('responde 400 para JSON malformado e 404 para rota inexistente', async () => {
    const malformed = await api('POST', '/auth/login', '{"email": ')
    assert.deepEqual([malformed.status, malformed.body.error], [400, 'JSON inválido'])
    assert.equal((await api('GET', '/nao-existe', undefined, token)).status, 404)
  })

  it('responde 413 (e não erro interno) para corpo grande demais', async () => {
    const response = await api('POST', '/sessions', session({ notes: 'x'.repeat(200_000) }), token)
    assert.equal(response.status, 413)
  })

  it('recusa id que não é inteiro positivo', async () => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      assert.equal((await api('GET', `/sessions/${id}`, undefined, token)).status, 400, id)
    }
  })
})

describe('Sessões', () => {
  it('recusa números impossíveis', async () => {
    const invalid: [string, Record<string, unknown>][] = [
      ['nota 6', { rating: 6 }],
      ['cansaço 0', { fatigue: 0 }],
      ['duração de mais de um dia', { durationMinutes: 1441 }],
      ['tentativas negativas', { entries: [{ exerciseId: freeThrow, attempts: -1 }] }],
      ['sequência maior que os acertos', { entries: [{ exerciseId: freeThrow, attempts: 10, makes: 3, bestStreak: 4 }] }],
      ['zona com mais acertos que tentativas', { shots: [{ zone: 'tres_topo', makes: 3, attempts: 2 }] }],
      ['zona repetida', { shots: [{ zone: 'tres_topo', makes: 1, attempts: 2 }, { zone: 'tres_topo', makes: 1, attempts: 2 }] }],
      ['zona que não existe', { shots: [{ zone: 'meio_da_quadra', makes: 1, attempts: 2 }] }],
      ['exercício que não existe', { entries: [{ exerciseId: 999999, attempts: 1, makes: 1 }] }],
    ]
    for (const [label, extra] of invalid) {
      assert.equal((await api('POST', '/sessions', session(extra), token)).status, 400, label)
    }
    assert.equal((await api('GET', '/sessions', undefined, token)).body.length, 0, 'nada foi gravado')
  })

  it('ao editar, troca os exercícios e as zonas em vez de somar', async () => {
    const created = await api(
      'POST',
      '/sessions',
      session({
        entries: [{ exerciseId: freeThrow, attempts: 10, makes: 5 }],
        shots: [{ zone: 'garrafao', makes: 4, attempts: 5 }],
      }),
      token,
    )
    const updated = await api(
      'PUT',
      `/sessions/${created.body.id}`,
      session({
        performedAt: '2026-10-21',
        rating: 5,
        entries: [{ exerciseId: freeThrow, attempts: 20, makes: 18 }],
        shots: [{ zone: 'tres_topo', makes: 2, attempts: 6 }],
      }),
      token,
    )
    assert.equal(updated.status, 200)
    assert.equal(updated.body.rating, 5)
    assert.deepEqual(
      updated.body.entries.map((e: { attempts: number; makes: number }) => [e.attempts, e.makes]),
      [[20, 18]],
    )
    assert.deepEqual(updated.body.shots, [{ zone: 'tres_topo', makes: 2, attempts: 6 }])

    const summary = (await api('GET', '/stats/summary', undefined, token)).body
    assert.deepEqual(summary.shooting, { makes: 18, attempts: 20, percentage: 90 })

    assert.equal((await api('DELETE', `/sessions/${created.body.id}`, undefined, token)).status, 204)
    assert.equal((await api('GET', `/sessions/${created.body.id}`, undefined, token)).status, 404)
    assert.equal((await api('GET', '/stats/summary', undefined, token)).body.totals.sessions, 0)
  })

  it('pagina a lista da mais recente para a mais antiga', async () => {
    const { token: own } = await register()
    for (const day of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']) {
      await api('POST', '/sessions', { performedAt: day }, own)
    }
    const days = async (query: string) =>
      (await api('GET', `/sessions?${query}`, undefined, own)).body.map((s: { performedAt: string }) => s.performedAt.slice(0, 10))

    assert.deepEqual(await days('limit=2'), ['2026-10-05', '2026-10-04'])
    assert.deepEqual(await days('limit=2&offset=2'), ['2026-10-03', '2026-10-02'])
    assert.deepEqual(await days('limit=2&offset=4'), ['2026-10-01'])
    assert.equal((await api('GET', '/sessions?limit=201', undefined, own)).status, 400)
  })
})

describe('Treinos e exercícios', () => {
  it('guarda os exercícios do treino na ordem enviada e substitui ao editar', async () => {
    const { token: own } = await register()
    const catalog = (await api('GET', '/exercises', undefined, own)).body as { id: number }[]
    const [x, y, z] = catalog.map((e) => e.id)

    const created = await api('POST', '/workouts', { name: 'Ordem', exercises: [{ exerciseId: z }, { exerciseId: x }, { exerciseId: y }] }, own)
    assert.deepEqual(created.body.exercises.map((e: { exerciseId: number }) => e.exerciseId), [z, x, y])

    const updated = await api('PUT', `/workouts/${created.body.id}`, { name: 'Ordem', exercises: [{ exerciseId: y, sets: 3 }] }, own)
    assert.deepEqual(updated.body.exercises.map((e: { exerciseId: number; sets: number }) => [e.exerciseId, e.sets]), [[y, 3]])
    assert.equal((await api('GET', '/workouts', undefined, own)).body[0].exerciseCount, 1)
  })

  it('apagar um treino mantém as sessões feitas com ele, sem o vínculo', async () => {
    const { token: own } = await register()
    const workout = (await api('POST', '/workouts', { name: 'Vai sumir' }, own)).body
    const done = (await api('POST', '/sessions', { workoutId: workout.id, performedAt: '2026-10-20', durationMinutes: 30 }, own)).body
    assert.equal(done.workoutName, 'Vai sumir')

    assert.equal((await api('DELETE', `/workouts/${workout.id}`, undefined, own)).status, 204)
    const kept = (await api('GET', `/sessions/${done.id}`, undefined, own)).body
    assert.deepEqual([kept.workoutId, kept.workoutName, kept.durationMinutes], [null, null, 30])
  })

  it('o atleta edita e apaga o próprio exercício, mas não um que está em uso', async () => {
    const { token: own } = await register()
    const mine = (await api('POST', '/exercises', { name: 'Gancho', category: 'finalizacao', metric: 'acertos' }, own)).body
    const edited = await api('PUT', `/exercises/${mine.id}`, { name: 'Gancho de direita', category: 'finalizacao', metric: 'acertos' }, own)
    assert.equal(edited.body.name, 'Gancho de direita')

    const used = (await api('POST', '/exercises', { name: 'Em uso', category: 'drible', metric: 'tempo' }, own)).body
    await api('POST', '/workouts', { name: 'Usa', exercises: [{ exerciseId: used.id }] }, own)
    assert.equal((await api('DELETE', `/exercises/${used.id}`, undefined, own)).status, 409)
    assert.equal((await api('DELETE', `/exercises/${mine.id}`, undefined, own)).status, 204)
  })
})

describe('Metas, testes e preferências', () => {
  it('valida as regras de cada tipo de meta', async () => {
    const goal = (extra: Record<string, unknown>) => api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 10, ...extra }, token)
    assert.equal((await goal({ kind: 'aproveitamento', target: 101 })).status, 400)
    assert.equal((await goal({ kind: 'aproveitamento', target: 100 })).status, 201)
    assert.equal((await goal({ kind: 'sessoes_semana', exerciseId: freeThrow })).status, 400)
    assert.equal((await goal({ target: 0 })).status, 400)
    assert.equal((await goal({ deadline: '2026-02-30' })).status, 400)
    assert.equal((await goal({ deadline: '2026-12-31', exerciseId: freeThrow })).body.deadline, '2026-12-31')
  })

  it('a meta de cestas conta só o que foi feito depois de criada', async () => {
    const { token: own } = await register()
    await api('POST', '/sessions', { performedAt: '2020-01-01', entries: [{ exerciseId: freeThrow, attempts: 50, makes: 50 }] }, own)
    const goal = (await api('POST', '/goals', { title: 'Cem cestas', kind: 'cestas_total', target: 100 }, own)).body
    assert.deepEqual([goal.current, goal.achieved], [0, false])

    await api('POST', '/sessions', { performedAt: new Date().toISOString(), entries: [{ exerciseId: freeThrow, attempts: 120, makes: 100 }] }, own)
    const [updated] = (await api('GET', '/goals', undefined, own)).body
    assert.deepEqual([updated.current, updated.achieved], [100, true])
  })

  it('recusa teste físico com valor zero ou tipo desconhecido e filtra por tipo', async () => {
    const { token: own } = await register()
    assert.equal((await api('POST', '/tests', { kind: 'impulsao', value: 0, performedAt: '2026-10-20' }, own)).status, 400)
    assert.equal((await api('POST', '/tests', { kind: 'supino', value: 10, performedAt: '2026-10-20' }, own)).status, 400)
    await api('POST', '/tests', { kind: 'impulsao', value: 55.5, performedAt: '2026-10-20' }, own)
    await api('POST', '/tests', { kind: 'sprint', value: 4.2, performedAt: '2026-10-20' }, own)
    const jumps = (await api('GET', '/tests?kind=impulsao', undefined, own)).body
    assert.deepEqual(jumps.map((t: { value: number }) => t.value), [55.5])
  })

  it('recusa horário de lembrete e dias da semana inválidos', async () => {
    for (const reminders of [{ time: '24:00' }, { time: '7:00' }, { days: [7] }]) {
      assert.equal((await api('PUT', '/settings', { reminders }, token)).status, 400, JSON.stringify(reminders))
    }
    assert.equal((await api('PUT', '/settings', { metronomeBpm: 300 }, token)).status, 400)
  })

  it('ignora preferências corrompidas no banco e volta ao padrão', async () => {
    const { token: own, id } = await register()
    await db.query(`INSERT INTO user_settings (user_id, data) VALUES ($1, '{"theme": "roxo"}')`, [id])
    assert.equal((await api('GET', '/settings', undefined, own)).body.theme, 'sistema')
  })
})

describe('Importação de backup', () => {
  const backup = (extra: Record<string, unknown>) => ({ format: 'basketball-practice', version: 1, ...extra })

  it('é tudo ou nada: um registro inválido desfaz a importação inteira', async () => {
    const { token: own } = await register()
    const result = await api(
      'POST',
      '/data/import',
      backup({
        exercises: [{ id: 1, name: 'Importado', category: 'arremesso', metric: 'acertos' }],
        workouts: [{ name: 'Treino importado', exercises: [{ exerciseId: 1, exerciseName: 'Importado' }] }],
        sessions: [
          { performedAt: '2026-10-01', entries: [{ exerciseName: 'Lance livre', attempts: 10, makes: 5 }] },
          { performedAt: '2026-10-02', entries: [{ exerciseName: 'Lance livre', attempts: 10, makes: 11 }] },
        ],
      }),
      own,
    )
    assert.equal(result.status, 400)

    const exported = (await api('GET', '/data/export', undefined, own)).body
    assert.deepEqual([exported.exercises, exported.workouts, exported.sessions], [[], [], []])
  })

  it('recusa arquivo de outro formato ou versão', async () => {
    assert.equal((await api('POST', '/data/import', { format: 'outro-app', version: 1 }, token)).status, 400)
    assert.equal((await api('POST', '/data/import', backup({ version: 2 }), token)).status, 400)
  })

  it('recusa exercício que não está no arquivo nem no catálogo', async () => {
    const { token: own } = await register()
    const result = await api(
      'POST',
      '/data/import',
      backup({ sessions: [{ performedAt: '2026-10-01', entries: [{ exerciseName: 'Inventado', attempts: 1, makes: 1 }] }] }),
      own,
    )
    assert.equal(result.status, 400)
    assert.match(result.body.error, /Inventado/)
  })

  it('aplica nas metas importadas as mesmas regras da tela de metas', async () => {
    const { token: own } = await register()
    const result = await api(
      'POST',
      '/data/import',
      backup({ goals: [{ title: 'Meta inválida', kind: 'sessoes_semana', target: 3, exerciseName: 'Lance livre' }] }),
      own,
    )
    assert.equal(result.status, 400)
    assert.deepEqual((await api('GET', '/goals', undefined, own)).body, [])
  })

  it('recusa séries e repetições negativas nos treinos importados', async () => {
    const { token: own } = await register()
    const result = await api(
      'POST',
      '/data/import',
      backup({ workouts: [{ name: 'Negativo', exercises: [{ exerciseName: 'Lance livre', sets: -3, targetReps: 0 }] }] }),
      own,
    )
    assert.equal(result.status, 400)
  })
})

describe('Exclusão de conta pelo admin', () => {
  it('apaga um atleta com exercícios próprios em uso, treinos, sessões e metas', async () => {
    const admin = await register('Admin')
    await db.query('UPDATE users SET is_admin = true WHERE id = $1', [admin.id])
    const athlete = await register('Atleta completo')

    const own = (await api('POST', '/exercises', { name: 'Meu exercício', category: 'arremesso', metric: 'acertos' }, athlete.token)).body
    const workout = (await api('POST', '/workouts', { name: 'Meu treino', exercises: [{ exerciseId: own.id }] }, athlete.token)).body
    await api(
      'POST',
      '/sessions',
      { workoutId: workout.id, performedAt: '2026-10-20', entries: [{ exerciseId: own.id, attempts: 5, makes: 3 }] },
      athlete.token,
    )
    await api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 10, exerciseId: own.id }, athlete.token)

    assert.equal((await api('DELETE', `/admin/users/${athlete.id}`, undefined, admin.token)).status, 204)
    const left = await db.query<{ n: number }>(
      `SELECT (SELECT count(*) FROM exercises WHERE user_id = $1)
            + (SELECT count(*) FROM workouts WHERE user_id = $1)
            + (SELECT count(*) FROM practice_sessions WHERE user_id = $1)
            + (SELECT count(*) FROM goals WHERE user_id = $1) AS n`,
      [athlete.id],
    )
    assert.equal(Number(left.rows[0].n), 0)
  })
})
