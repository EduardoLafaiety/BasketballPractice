import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { z } from 'zod'
import { assertProductionSecret } from '../src/config.js'
import type { Database, Queryable } from '../src/db/index.js'
import { MAX_ARRAY_ITEMS, parse } from '../src/lib/validate.js'
import { GOAL_KINDS } from '../src/routes/goals.js'
import { ZONES } from '../src/routes/sessions.js'
import { TEST_KINDS } from '../src/routes/tests.js'
import { startApi } from './http.js'

const { api, db, register } = await startApi()

const backup = (extra: object) => ({ format: 'basketball-practice', version: 1, ...extra })

describe('Entrada que o Postgres recusaria vira 400', () => {
  it('id acima do maior integer, na URL e no corpo', async () => {
    const { token } = await register()
    const [exercise] = (await api('GET', '/exercises', undefined, token)).body
    const grande = 2147483648

    for (const [method, path] of [
      ['GET', `/exercises/${grande}`],
      ['GET', `/workouts/${grande}`],
      ['GET', `/sessions/${grande}`],
      ['DELETE', `/goals/${grande}`],
      ['DELETE', `/tests/${grande}`],
      ['GET', '/sessions/1e30'],
    ]) {
      assert.equal((await api(method, path, undefined, token)).status, 400, path)
    }
    // O limite é exato: o maior integer é um id válido, só não existe.
    assert.equal((await api('GET', '/sessions/2147483647', undefined, token)).status, 404)

    const session = { performedAt: '2026-01-01', entries: [] }
    assert.equal((await api('POST', '/sessions', { ...session, workoutId: grande }, token)).status, 400)
    assert.equal((await api('POST', '/sessions', { ...session, entries: [{ exerciseId: grande }] }, token)).status, 400)
    assert.equal((await api('POST', '/workouts', { name: 'Treino', exercises: [{ exerciseId: grande }] }, token)).status, 400)
    assert.equal(
      (await api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 1, exerciseId: grande }, token)).status,
      400,
    )
    assert.equal(
      (await api('POST', '/data/import', backup({ sessions: [{ performedAt: '2026-01-01', entries: [{ exerciseId: grande, exerciseName: exercise.name }] }] }), token)).status,
      400,
    )
  })

  it('offset enorme e datas fora do que o banco guarda', async () => {
    const { token } = await register()
    for (const query of ['offset=2147483648', 'offset=1e30', 'to=9999-12-31', 'from=9999-12-31', 'from=0100-01-01']) {
      assert.equal((await api('GET', `/sessions?${query}`, undefined, token)).status, 400, query)
    }
    assert.equal((await api('GET', '/stats/summary?to=9999-12-31', undefined, token)).status, 400)
    assert.equal((await api('GET', '/stats/zones?to=9999-12-31', undefined, token)).status, 400)
    assert.equal((await api('GET', '/sessions?offset=2147483647', undefined, token)).status, 200)
    // Nas pontas aceitas, com o fuso mais distante, a data calculada ainda cabe no banco.
    assert.equal((await api('GET', '/stats/summary?to=2100-12-31&tzOffset=840', undefined, token)).status, 200)
    assert.equal((await api('GET', '/sessions?from=1900-01-01&tzOffset=-840', undefined, token)).status, 200)

    for (const performedAt of ['9999-12-31T23:59:59-14:00', '9999-12-31', '0001-01-01']) {
      assert.equal((await api('POST', '/sessions', { performedAt, entries: [] }, token)).status, 400, performedAt)
    }
    assert.equal((await api('POST', '/sessions', { performedAt: '2100-12-31', entries: [] }, token)).status, 201)
    assert.equal((await api('POST', '/tests', { kind: 'sprint', value: 3, performedAt: '9999-12-31' }, token)).status, 400)
  })

  it('caractere nulo em qualquer texto', async () => {
    const { token } = await register()
    const nulo = 'a\u0000b'
    const [exercise] = (await api('GET', '/exercises', undefined, token)).body

    const pedidos: [string, string, object][] = [
      ['POST', '/exercises', { name: nulo, category: 'drible', metric: 'tempo' }],
      ['POST', '/exercises', { name: 'Nome', category: 'drible', metric: 'tempo', description: nulo }],
      ['POST', '/workouts', { name: nulo, exercises: [] }],
      ['POST', '/workouts', { name: 'Treino', exercises: [{ exerciseId: exercise.id, notes: nulo }] }],
      ['POST', '/sessions', { performedAt: '2026-01-01', notes: nulo, entries: [] }],
      ['POST', '/sessions', { performedAt: '2026-01-01', entries: [{ exerciseId: exercise.id, notes: nulo }] }],
      ['POST', '/goals', { title: nulo, kind: 'sessoes_total', target: 1 }],
      ['POST', '/tests', { kind: 'sprint', value: 3, performedAt: '2026-01-01', notes: nulo }],
      ['POST', '/data/import', backup({ sessions: [{ performedAt: '2026-01-01', notes: nulo, entries: [] }] })],
      ['POST', '/data/import', backup({ exercises: [{ id: 1, name: nulo, category: 'drible', metric: 'tempo' }] })],
    ]
    for (const [method, path, body] of pedidos) {
      const resposta = await api(method, path, body, token)
      assert.equal(resposta.status, 400, `${path} ${JSON.stringify(body)}`)
    }
    const cadastro = await api('POST', '/auth/register', { name: nulo, email: 'nulo@example.com', password: 'senha-segura' })
    assert.equal(cadastro.status, 400)
    assert.deepEqual(cadastro.body.details, { name: ['Caractere inválido'] })
    // A mesma sequência escrita como texto comum não é um caractere nulo.
    assert.equal((await api('POST', '/exercises', { name: 'barra \\u0000', category: 'drible', metric: 'tempo' }, token)).status, 201)
  })

  it('corpo aninhado a milhares de níveis não estoura a pilha ao procurar o caractere nulo', async () => {
    const { token } = await register()
    const fundo = '['.repeat(30000) + ']'.repeat(30000)
    assert.equal((await api('POST', '/exercises', fundo, token)).status, 400)
  })
})

describe('Arrays enormes não chegam à validação', () => {
  const lista = z.object({ itens: z.array(z.number()) })

  it('o teto vale para a soma dos arrays e tem limite exato', () => {
    const itens = (n: number) => Array<number>(n).fill(0)
    assert.equal(parse(lista, { itens: itens(MAX_ARRAY_ITEMS) }).itens.length, MAX_ARRAY_ITEMS)
    assert.throws(() => parse(lista, { itens: itens(MAX_ARRAY_ITEMS + 1) }), (erro: { details: unknown }) => {
      assert.deepEqual(erro.details, { itens: ['Itens demais'] })
      return true
    })
    // Muitos arrays pequenos somam o mesmo trabalho que um grande.
    const aninhado = { itens: Array.from({ length: 1000 }, () => itens(MAX_ARRAY_ITEMS / 1000)) }
    assert.throws(() => parse(z.any(), aninhado), /Dados inválidos/)
  })

  it('a importação recusa o array acima do teto antes de validar item por item', async () => {
    const { token } = await register()
    const corpo = `{"format":"basketball-practice","version":1,"exercises":[${Array(MAX_ARRAY_ITEMS + 1).fill('0').join(',')}]}`
    const resposta = await api('POST', '/data/import', corpo, token)
    assert.equal(resposta.status, 400)
    assert.deepEqual(resposta.body.details, { exercises: ['Itens demais'] })
  })

  it('o maior backup que as regras aceitam continua passando pelo teto', async () => {
    const { token } = await register()
    const sessions = Array.from({ length: 20000 }, (_, i) => ({ performedAt: new Date(Date.UTC(2000, 0, 1) + i * 3_600_000).toISOString(), entries: [] }))
    // A última é inválida: a importação para ali, sem gravar 20 mil sessões no PGlite. O erro é o da sessão, não o do teto.
    const resposta = await api('POST', '/data/import', backup({ sessions: [...sessions, { performedAt: 'lixo', entries: [] }] }), token)
    assert.equal(resposta.status, 400)
    assert.notDeepEqual(resposta.body.details, { sessions: ['Itens demais'] })
  })
})

describe('Somas além do integer', () => {
  it('estatísticas e metas respondem o valor certo com mais de 2 bilhões de cestas', async () => {
    const { token, id } = await register()
    const [exercise] = (await api('GET', '/exercises', undefined, token)).body
    const goal = (await api('POST', '/goals', { title: 'Muitas', kind: 'cestas_total', target: 1 }, token)).body
    const minutes = (await api('POST', '/goals', { title: 'Tempo', kind: 'minutos_total', target: 1 }, token)).body
    assert.equal(goal.current, 0)
    assert.equal(minutes.current, 0)

    // Cada valor cabe em integer; só a soma passa. Pelo SQL, porque a API levaria milhares de pedidos.
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO practice_sessions (user_id, performed_at, duration_minutes) VALUES
       ($1, now(), 2000000000), ($1, now(), 2000000000) RETURNING id`,
      [id],
    )
    for (const row of rows) {
      await db.query('INSERT INTO session_entries (session_id, exercise_id, attempts, makes, reps, seconds) VALUES ($1, $2, 2000000000, 1500000000, 2000000000, 2000000000)', [row.id, exercise.id])
      await db.query(`INSERT INTO session_shots (session_id, zone, makes, attempts) VALUES ($1, 'garrafao', 1500000000, 2000000000)`, [row.id])
    }

    const summary = await api('GET', '/stats/summary', undefined, token)
    assert.equal(summary.status, 200)
    assert.equal(summary.body.totals.minutes, 4_000_000_000)
    assert.equal(summary.body.shooting.makes, 3_000_000_000)
    assert.equal(summary.body.shooting.attempts, 4_000_000_000)
    assert.equal(summary.body.shooting.percentage, 75)
    assert.equal(summary.body.byExercise[0].reps, 4_000_000_000)
    assert.equal(summary.body.byExercise[0].seconds, 4_000_000_000)
    assert.equal(summary.body.byWeek[0].minutes, 4_000_000_000)
    assert.equal(summary.body.byWeek[0].makes, 3_000_000_000)

    const zones = await api('GET', '/stats/zones', undefined, token)
    assert.equal(zones.status, 200)
    assert.equal(zones.body.find((z: { zone: string }) => z.zone === 'garrafao').makes, 3_000_000_000)

    const progress = await api('GET', '/stats/progress', undefined, token)
    assert.equal(progress.status, 200)
    assert.equal(progress.body.totals.minutes, 4_000_000_000)
    assert.equal(progress.body.totals.makes, 3_000_000_000)
    assert.equal(progress.body.totals.attempts, 4_000_000_000)
    assert.equal(progress.body.totals.bestDayMakes, 3_000_000_000)

    await api('POST', '/goals', { title: 'Aproveitamento', kind: 'aproveitamento', target: 50 }, token)
    await api('POST', '/goals', { title: 'Semana', kind: 'minutos_semana', target: 50 }, token)
    const goals = await api('GET', '/goals', undefined, token)
    assert.equal(goals.status, 200)
    const byTitle = Object.fromEntries(goals.body.map((g: { title: string; current: number }) => [g.title, g.current]))
    assert.deepEqual(byTitle, { Muitas: 3_000_000_000, Tempo: 4_000_000_000, Aproveitamento: 75, Semana: 4_000_000_000 })
  })
})

describe('Importação de backup', () => {
  const session = (notes: string, extra: object = {}) => ({ performedAt: '2026-01-01T10:00:00.000Z', notes, entries: [], ...extra })

  it('duas sessões diferentes no mesmo instante entram as duas', async () => {
    const { token } = await register()
    const resposta = await api('POST', '/data/import', backup({ sessions: [session('A'), session('B')] }), token)
    assert.deepEqual(resposta.body.created.sessions, 2)
    assert.equal(resposta.body.skipped.sessions, 0)
  })

  it('qualquer dado diferente faz a sessão do mesmo instante ser outra', async () => {
    const { token } = await register()
    const [exercise] = (await api('GET', '/exercises', undefined, token)).body
    const ref = { exerciseId: exercise.id, exerciseName: exercise.name }
    const base = session('x', { entries: [{ ...ref, makes: 1, attempts: 2 }], shots: [{ zone: 'garrafao', makes: 1, attempts: 2 }] })
    const variacoes = {
      notas: { notes: 'y' },
      duração: { durationMinutes: 30 },
      avaliação: { rating: 3 },
      cansaço: { fatigue: 3 },
      registro: { entries: [{ ...ref, makes: 2, attempts: 2 }] },
      zona: { shots: [{ zone: 'tres_topo', makes: 1, attempts: 2 }] },
    }
    assert.equal((await api('POST', '/data/import', backup({ sessions: [base] }), token)).body.created.sessions, 1)

    // Uma de cada vez, com a anterior já no banco: é contra o banco que a repetida é reconhecida.
    for (const [nome, diferenca] of Object.entries(variacoes)) {
      const resposta = await api('POST', '/data/import', backup({ sessions: [{ ...base, ...diferenca }] }), token)
      assert.equal(resposta.body.created.sessions, 1, nome)
      assert.equal(resposta.body.skipped.sessions, 0, nome)
    }
    // Reimportar tudo não cria nada: cada uma reconhece a sua.
    const todas = [base, ...Object.values(variacoes).map((diferenca) => ({ ...base, ...diferenca }))]
    const denovo = await api('POST', '/data/import', backup({ sessions: todas }), token)
    assert.equal(denovo.body.created.sessions, 0)
    assert.equal(denovo.body.skipped.sessions, todas.length)
  })

  it('sessões iguais em instantes diferentes não se confundem, em qualquer ordem no arquivo', async () => {
    const { token } = await register()
    const antes = { performedAt: '2026-01-01T10:00:00.000Z', entries: [] }
    const depois = { performedAt: '2026-01-02T10:00:00.000Z', entries: [] }
    await api('POST', '/data/import', backup({ sessions: [antes] }), token)

    const resposta = await api('POST', '/data/import', backup({ sessions: [depois, antes] }), token)
    assert.equal(resposta.body.created.sessions, 1)
    assert.equal(resposta.body.skipped.sessions, 1)
    const instantes = (await api('GET', '/sessions', undefined, token)).body.map((s: { performedAt: string }) => s.performedAt)
    assert.deepEqual(instantes, [depois.performedAt, antes.performedAt])
  })

  it('reimportar o próprio backup exportado não duplica nada', async () => {
    const { token } = await register()
    const [exercise] = (await api('GET', '/exercises', undefined, token)).body
    await api('POST', '/workouts', { name: 'Treino', exercises: [{ exerciseId: exercise.id }] }, token)
    await api('POST', '/sessions', {
      performedAt: '2026-03-01T22:15:30.123Z',
      durationMinutes: 45,
      rating: 4,
      fatigue: 2,
      notes: '  com espaços  ',
      entries: [{ exerciseId: exercise.id, attempts: 10, makes: 7, bestStreak: 3, notes: 'bom' }],
      shots: [{ zone: 'garrafao', makes: 3, attempts: 4 }],
    }, token)
    await api('POST', '/sessions', { performedAt: '2026-03-02', entries: [] }, token)

    const exportado = (await api('GET', '/data/export', undefined, token)).body
    const resposta = await api('POST', '/data/import', exportado, token)
    assert.deepEqual(resposta.body.created.sessions, 0)
    assert.equal(resposta.body.skipped.sessions, 2)
    assert.equal((await api('GET', '/sessions', undefined, token)).body.length, 2)
  })

  it('duas sessões idênticas no arquivo ficam, e importar de novo não cria uma terceira', async () => {
    const { token } = await register()
    const sessions = [session('igual'), session('igual')]
    assert.equal((await api('POST', '/data/import', backup({ sessions }), token)).body.created.sessions, 2)
    const segunda = await api('POST', '/data/import', backup({ sessions }), token)
    assert.equal(segunda.body.created.sessions, 0)
    assert.equal(segunda.body.skipped.sessions, 2)
    // Uma a mais no arquivo é uma a mais no banco.
    const terceira = await api('POST', '/data/import', backup({ sessions: [...sessions, session('igual')] }), token)
    assert.equal(terceira.body.created.sessions, 1)
    assert.equal(terceira.body.skipped.sessions, 2)
  })

  it('a sessão de outro atleta no mesmo instante não conta como repetida', async () => {
    const a = await register()
    const b = await register()
    await api('POST', '/data/import', backup({ sessions: [session('mesma')] }), a.token)
    assert.equal((await api('POST', '/data/import', backup({ sessions: [session('mesma')] }), b.token)).body.created.sessions, 1)
  })
})

/** Repassa ao banco de verdade, com um gancho antes de cada consulta da transação. */
const comGancho = (antes: (sql: string) => Promise<void> | void) => (real: Database): Database => ({
  ...real,
  query: async (sql, params) => {
    await antes(sql)
    return real.query(sql, params)
  },
  transaction: (fn) =>
    real.transaction((tx) => {
      const envolvido: Queryable = {
        query: async (sql, params) => {
          await antes(sql)
          return tx.query(sql, params)
        },
      }
      return fn(envolvido)
    }),
})

describe('Importação e o resto da API', () => {
  it('quando as preferências falham, as sessões do mesmo backup também são desfeitas', async () => {
    const quebrada = await startApi(
      {},
      comGancho((sql) => {
        if (sql.includes('INSERT INTO user_settings')) throw new Error('falha ao gravar preferências')
      }),
    )
    const { token } = await quebrada.register()
    const resposta = await quebrada.api('POST', '/data/import', backup({ sessions: [{ performedAt: '2026-01-01', entries: [] }], settings: { theme: 'escuro' } }), token)
    assert.equal(resposta.status, 500)
    assert.deepEqual((await quebrada.api('GET', '/sessions', undefined, token)).body, [])
  })

  it('passou do limite de importações simultâneas: 503 na hora, com Retry-After, e a vaga volta depois', async () => {
    let soltar = () => {}
    let avisar = () => {}
    const presa = new Promise<void>((resolve) => { avisar = resolve })
    const portao = new Promise<void>((resolve) => { soltar = resolve })
    // Só a primeira importação fica parada, já com a vaga ocupada. Antes de abrir a transação, porque o PGlite
    // tem uma conexão só: dentro dela, a parada travaria também o pedido que confere o resto da API.
    let parou = false
    const limitada = await startApi({ maxImports: 1 }, (real) => ({
      ...real,
      transaction: async (fn) => {
        if (!parou) {
          parou = true
          avisar()
          await portao
        }
        return real.transaction(fn)
      },
    }))
    const a = await limitada.register()
    const b = await limitada.register()
    const corpo = backup({ sessions: [{ performedAt: '2026-01-01', entries: [] }] })

    const primeira = limitada.api('POST', '/data/import', corpo, a.token)
    await presa
    const barrada = await fetch(`${limitada.baseUrl}/data/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b.token}` },
      body: JSON.stringify(corpo),
    })
    assert.equal(barrada.status, 503)
    assert.equal(barrada.headers.get('retry-after'), '30')
    // O limite só vale para importar: o resto da API segue respondendo.
    assert.equal((await limitada.api('GET', '/sessions', undefined, b.token)).status, 200)

    soltar()
    assert.equal((await primeira).status, 200)
    assert.equal((await limitada.api('POST', '/data/import', corpo, b.token)).status, 200)
  })

  it('a vaga também volta quando a importação falha', async () => {
    const limitada = await startApi({ maxImports: 1 })
    const { token } = await limitada.register()
    const ruim = backup({ goals: [{ title: 'x', kind: 'inexistente', target: 1 }] })
    assert.equal((await limitada.api('POST', '/data/import', ruim, token)).status, 400)
    assert.equal((await limitada.api('POST', '/data/import', backup({}), token)).status, 200)
  })
})

describe('O banco barra sozinho', () => {
  const recusa = (sql: string, params: unknown[]) => assert.rejects(db.query(sql, params), (erro: { code?: string }) => erro.code !== undefined, sql)

  it('valores negativos e nomes fora da lista', async () => {
    const { id, token } = await register()
    const [exercise] = (await api('GET', '/exercises', undefined, token)).body
    const { rows } = await db.query<{ id: number }>(`INSERT INTO practice_sessions (user_id, performed_at) VALUES ($1, now()) RETURNING id`, [id])
    const sessionId = rows[0].id

    for (const column of ['attempts', 'makes', 'reps', 'seconds']) {
      await recusa(`INSERT INTO session_entries (session_id, exercise_id, ${column}) VALUES ($1, $2, -1)`, [sessionId, exercise.id])
    }
    await recusa('UPDATE practice_sessions SET duration_minutes = -1 WHERE id = $1', [sessionId])
    await recusa(`INSERT INTO session_shots (session_id, zone, makes, attempts) VALUES ($1, 'inventada', 0, 0)`, [sessionId])
    await recusa(`INSERT INTO goals (user_id, title, kind, target) VALUES ($1, 'x', 'inventada', 1)`, [id])
    await recusa(`INSERT INTO physical_tests (user_id, kind, value, performed_at) VALUES ($1, 'inventado', 1, now())`, [id])
    await recusa(`INSERT INTO exercises (name, category, metric) VALUES ('Lance livre', 'arremesso', 'acertos')`, [])
  })

  it('o mesmo nome continua livre para o exercício do atleta', async () => {
    const { token } = await register()
    assert.equal((await api('POST', '/exercises', { name: 'Lance livre', category: 'arremesso', metric: 'acertos' }, token)).status, 201)
  })

  it('tudo o que a API aceita passa pelas regras do banco', async () => {
    const { token } = await register()
    for (const zone of ZONES) {
      const resposta = await api('POST', '/sessions', { performedAt: '2026-01-01', entries: [], shots: [{ zone, makes: 0, attempts: 0 }] }, token)
      assert.equal(resposta.status, 201, zone)
    }
    for (const kind of GOAL_KINDS) {
      assert.equal((await api('POST', '/goals', { title: `Meta ${kind}`, kind, target: 1 }, token)).status, 201, kind)
    }
    for (const kind of Object.keys(TEST_KINDS)) {
      assert.equal((await api('POST', '/tests', { kind, value: 1, performedAt: '2026-01-01' }, token)).status, 201, kind)
    }
  })

  it('os índices das chaves estrangeiras existem', async () => {
    const { rows } = await db.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_sessions_workout', 'idx_goals_exercise')`)
    assert.equal(rows.length, 2)
  })
})

describe('Exercício ligado a uma meta', () => {
  it('apagar responde 409 e a meta continua lá; sem a meta, apaga', async () => {
    const { token } = await register()
    const exercise = (await api('POST', '/exercises', { name: 'Meu arremesso', category: 'arremesso', metric: 'acertos' }, token)).body
    const goal = (await api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 5, exerciseId: exercise.id }, token)).body

    const recusa = await api('DELETE', `/exercises/${exercise.id}`, undefined, token)
    assert.equal(recusa.status, 409)
    assert.match(recusa.body.error, /meta/)
    assert.equal((await api('GET', '/goals', undefined, token)).body.length, 1)

    assert.equal((await api('DELETE', `/goals/${goal.id}`, undefined, token)).status, 204)
    assert.equal((await api('DELETE', `/exercises/${exercise.id}`, undefined, token)).status, 204)
  })

  it('o aviso de uso por treino não muda', async () => {
    const { token } = await register()
    const exercise = (await api('POST', '/exercises', { name: 'Outro', category: 'drible', metric: 'tempo' }, token)).body
    await api('POST', '/workouts', { name: 'Treino', exercises: [{ exerciseId: exercise.id }] }, token)
    const recusa = await api('DELETE', `/exercises/${exercise.id}`, undefined, token)
    assert.equal(recusa.status, 409)
    assert.equal(recusa.body.error, 'Exercício está em uso por treinos ou registros')
  })

  it('excluir a conta inteira continua funcionando, com meta presa a exercício próprio', async () => {
    const { token, id } = await register()
    const exercise = (await api('POST', '/exercises', { name: 'Próprio', category: 'arremesso', metric: 'acertos' }, token)).body
    await api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 5, exerciseId: exercise.id }, token)
    // Como a demonstração recria o visitante: em transação, com a cascata apagando metas e exercícios juntos.
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM users WHERE id = $1', [id])
    })
    const { rows } = await db.query('SELECT 1 FROM exercises WHERE user_id = $1', [id])
    assert.equal(rows.length, 0)
  })
})

describe('Segredo do token em produção', () => {
  const exemplo = /^JWT_SECRET=(.*)$/m.exec(readFileSync(new URL('../.env.example', import.meta.url), 'utf8').replace(/\r/g, ''))![1]

  it('recusa vazio, curto e o valor de .env.example', () => {
    assert.throws(() => assertProductionSecret(''), /32 caracteres/)
    assert.throws(() => assertProductionSecret('abc'), /32 caracteres/)
    assert.throws(() => assertProductionSecret('x'.repeat(31)), /32 caracteres/)
    assert.throws(() => assertProductionSecret(exemplo), /valor de exemplo/)
  })

  it('aceita um segredo longo', () => {
    assert.doesNotThrow(() => assertProductionSecret('f'.repeat(32) + 'outro'))
    assert.doesNotThrow(() => assertProductionSecret('x'.repeat(32)))
  })
})
