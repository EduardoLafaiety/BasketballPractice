import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import pg from 'pg'
import { createApp } from '../src/app.js'
import { fromPool, isDatabaseUnavailable, openDatabase, type Database } from '../src/db/index.js'
import { migrate } from '../src/db/migrations.js'
import { seed } from '../src/db/seed.js'

// O que o PGlite não reproduz: conexões de verdade, travas entre conexões e os códigos de erro do Postgres.
// Roda só com TEST_POSTGRES_URL, a URL de um banco de administração (o `postgres`, nunca o de desenvolvimento):
// TEST_POSTGRES_URL=postgres://basketball:basketball@localhost:5433/postgres npm test
const ADMIN_URL = process.env.TEST_POSTGRES_URL
const BANCO = `basketball_teste_${process.pid}`

const admin = (sql: string, params?: unknown[], url = ADMIN_URL) => {
  const client = new pg.Client({ connectionString: url })
  return client
    .connect()
    .then(() => client.query(sql, params))
    .finally(() => client.end())
}

describe('Postgres de verdade', { skip: ADMIN_URL ? false : 'defina TEST_POSTGRES_URL para rodar' }, () => {
  let db: Database
  let baseUrl: string
  let close: () => Promise<void>
  const urlDoBanco = () => {
    const url = new URL(ADMIN_URL!)
    url.pathname = `/${BANCO}`
    return url.toString()
  }

  before(async () => {
    await admin(`CREATE DATABASE ${BANCO}`)
    db = await openDatabase(urlDoBanco())
    const folga = { maximo: 100_000, janelaMs: 60_000 }
    const server = createApp(db, { limiteTentativas: folga, limiteConta: folga, limiteCadastros: folga, maxImports: 2 }).listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
    close = () => new Promise((resolve) => server.close(() => resolve()))
  })

  after(async () => {
    await close()
    await db.close()
    await admin(`DROP DATABASE IF EXISTS ${BANCO} WITH (FORCE)`)
  })

  const api = async (method: string, path: string, body?: unknown, token?: string) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null }
  }

  let contas = 0
  const conta = async () => {
    const email = `pg${++contas}-${Date.now()}@example.com`
    const { body } = await api('POST', '/auth/register', { name: 'Atleta', email, password: 'senha-segura' })
    return { token: body.token as string, id: body.user.id as number }
  }

  const sessoes = (quantas: number, ano = 2000) =>
    Array.from({ length: quantas }, (_, i) => ({ performedAt: new Date(Date.UTC(ano, 0, 1) + i * 3_600_000).toISOString(), entries: [] }))
  const backup = (sessions: unknown[]) => ({ format: 'basketball-practice', version: 1, sessions })
  const quantasSessoes = async (userId: number) =>
    (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM practice_sessions WHERE user_id = $1', [userId])).rows[0].n
  const espera = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  it('a conexão cai no meio de uma importação: 5xx, nada gravado pela metade e a API segue no ar', async () => {
    const { token, id } = await conta()
    const importacao = api('POST', '/data/import', backup(sessoes(8000)), token)
    // Espera a importação estar mesmo gravando antes de derrubar as conexões.
    for (let i = 0; i < 100; i++) {
      const { rows } = await admin(
        `SELECT 1 FROM pg_stat_activity WHERE datname = $1 AND query LIKE 'INSERT INTO practice_sessions%'`,
        [BANCO],
      )
      if (rows.length) break
      await espera(50)
    }
    await admin(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [BANCO])

    const resposta = await importacao
    assert.ok(resposta.status >= 500 && resposta.status < 600, `respondeu ${resposta.status}`)
    assert.equal(resposta.status, 503)
    // Nenhum pedido seguinte recebe uma conexão quebrada do pool.
    for (let i = 0; i < 15; i++) assert.equal((await api('GET', '/health')).status, 200)
    assert.equal(await quantasSessoes(id), 0)
    assert.equal((await api('POST', '/data/import', backup(sessoes(3)), token)).status, 200)
    assert.equal(await quantasSessoes(id), 3)
  })

  it('o mesmo backup enviado duas vezes ao mesmo tempo não duplica', async () => {
    const { token, id } = await conta()
    const corpo = backup(sessoes(500))
    const [a, b] = await Promise.all([api('POST', '/data/import', corpo, token), api('POST', '/data/import', corpo, token)])
    assert.deepEqual([a.status, b.status], [200, 200])
    assert.equal(a.body.created.sessions + b.body.created.sessions, 500)
    assert.equal(a.body.skipped.sessions + b.body.skipped.sessions, 500)
    assert.equal(await quantasSessoes(id), 500)
  })

  it('a trava da importação é por atleta: um espera o outro só na mesma conta', async () => {
    const dono = await conta()
    const outro = await conta()
    const trava = new pg.Client({ connectionString: urlDoBanco() })
    await trava.connect()
    try {
      await trava.query('SELECT pg_advisory_lock(4243, $1::int)', [dono.id])
      let terminou = false
      const presa = api('POST', '/data/import', backup(sessoes(1)), dono.token).then((r) => {
        terminou = true
        return r
      })
      assert.equal((await api('POST', '/data/import', backup(sessoes(1)), outro.token)).status, 200)
      await espera(200)
      assert.equal(terminou, false, 'a importação da conta travada precisa esperar')
      await trava.query('SELECT pg_advisory_unlock(4243, $1::int)', [dono.id])
      assert.equal((await presa).status, 200)
    } finally {
      await trava.end()
    }
  })

  it('importações em massa não tiram a vez de outro atleta', async () => {
    const outro = await conta()
    const contas = await Promise.all(Array.from({ length: 10 }, () => conta()))
    const importacoes = contas.map((u) => api('POST', '/data/import', backup(sessoes(2000)), u.token))
    await espera(300)
    const t0 = performance.now()
    assert.equal((await api('GET', '/sessions?limit=20', undefined, outro.token)).status, 200)
    const ms = performance.now() - t0
    const status = (await Promise.all(importacoes)).map((r) => r.status)
    assert.ok(ms < 2000, `outro atleta esperou ${Math.round(ms)} ms`)
    assert.equal(status.filter((s) => s === 200).length + status.filter((s) => s === 503).length, 10, String(status))
    assert.ok(status.filter((s) => s === 503).length >= 1, String(status))
  })

  it('as conexões do pool saem com os limites de tempo', async () => {
    const valor = async (nome: string) => (await db.query<Record<string, string>>(`SHOW ${nome}`)).rows[0][nome]
    assert.equal(await valor('statement_timeout'), '30s')
    assert.equal(await valor('idle_in_transaction_session_timeout'), '1min')
    assert.equal(await valor('TimeZone'), 'UTC')

    // Consulta longa demais é erro de banco indisponível, e a conexão continua servindo.
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.query(`SET LOCAL statement_timeout = '50ms'`)
        await tx.query('SELECT pg_sleep(2)')
      }),
      (erro) => isDatabaseUnavailable(erro),
    )
    assert.equal(await valor('statement_timeout'), '30s')
  })

  it('migração e seed esperam a trava de outra instância além do limite de tempo das consultas', async () => {
    // Conexões com um limite curtíssimo: sem o SET LOCAL das migrações, a espera pela trava viraria erro.
    const pool = new pg.Pool({ connectionString: urlDoBanco(), statement_timeout: 100 })
    const apertado = fromPool(pool)
    const trava = new pg.Client({ connectionString: urlDoBanco() })
    await trava.connect()
    try {
      for (const etapa of [migrate, seed]) {
        await trava.query('SELECT pg_advisory_lock(4242)')
        const emCurso = etapa(apertado)
        await espera(400)
        await trava.query('SELECT pg_advisory_unlock(4242)')
        await emCurso
      }
    } finally {
      await trava.end()
      await apertado.close()
    }
  })

  it('as conexões abrem antes do primeiro pedido e continuam abertas com o pool ocioso', async () => {
    const url = new URL(urlDoBanco())
    url.searchParams.set('application_name', 'teste_aquecimento')
    const abertas = async () =>
      (await admin(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = 'teste_aquecimento'`)).rows[0].n
    const aquecido = await openDatabase(url.toString())
    try {
      assert.equal(await abertas(), 10)
      // Passa do tempo que o pg usa para fechar conexão ociosa acima do mínimo (10 s).
      await espera(10_500)
      assert.equal(await abertas(), 10)
    } finally {
      await aquecido.close()
    }
  })

  describe('reaproveitamento da conexão', () => {
    const backend = async (alvo: Database) => (await alvo.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid
    const comUmaConexao = async (fn: (alvo: Database, pool: pg.Pool) => Promise<void>) => {
      const pool = new pg.Pool({ connectionString: urlDoBanco(), max: 1 })
      pool.on('error', () => {})
      try {
        await fn(fromPool(pool), pool)
      } finally {
        await pool.end()
      }
    }

    it('erro de SQL não descarta a conexão, inclusive pela rota de cadastro repetido', async () => {
      await comUmaConexao(async (alvo) => {
        const antes = await backend(alvo)
        await assert.rejects(alvo.query('SELECT 1/0'), { code: '22012' })
        assert.equal(await backend(alvo), antes)
      })

      const email = `repetido-${Date.now()}@example.com`
      const cadastro = { name: 'Atleta', email, password: 'senha-segura' }
      assert.equal((await api('POST', '/auth/register', cadastro)).status, 201)
      const pids = async () =>
        (await admin(`SELECT pid FROM pg_stat_activity WHERE datname = $1 ORDER BY pid`, [BANCO])).rows.map((r) => r.pid)
      const antes = await pids()
      for (let i = 0; i < 3; i++) assert.equal((await api('POST', '/auth/register', cadastro)).status, 409)
      assert.deepEqual(await pids(), antes)
    })

    it('conexão derrubada no meio da consulta: erro para quem pediu, processo no ar e conexão nova', async () => {
      await comUmaConexao(async (alvo, pool) => {
        const antes = await backend(alvo)
        const presa = assert.rejects(alvo.query('SELECT pg_sleep(30)'), (erro) => isDatabaseUnavailable(erro))
        for (let i = 0; i < 100; i++) {
          if ((await admin(`SELECT 1 FROM pg_stat_activity WHERE pid = $1 AND wait_event = 'PgSleep'`, [antes])).rows.length) break
          await espera(20)
        }
        await admin('SELECT pg_terminate_backend($1)', [antes])
        await presa
        assert.notEqual(await backend(alvo), antes)
        assert.equal(pool.totalCount, 1)
      })
    })
  })

  it('com o pool cheio, o pedido desiste em 503 em vez de esperar para sempre', async () => {
    const { token } = await conta()
    const presas = Array.from({ length: 10 }, () => db.transaction((tx) => tx.query('SELECT pg_sleep(6)')))
    await espera(200)
    const t0 = performance.now()
    const resposta = await fetch(`${baseUrl}/sessions`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(resposta.status, 503)
    assert.equal(resposta.headers.get('retry-after'), '5')
    assert.ok(performance.now() - t0 < 5800, 'desistiu antes de uma conexão ficar livre')
    await Promise.all(presas)
    assert.equal((await api('GET', '/sessions', undefined, token)).status, 200)
  })

  it('apagar exercício ligado a meta dá 409, com o código que o Postgres responde (23503)', async () => {
    const { token, id } = await conta()
    const exercicio = (await api('POST', '/exercises', { name: 'Com meta', category: 'arremesso', metric: 'acertos' }, token)).body
    await api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 5, exerciseId: exercicio.id }, token)
    const recusa = await api('DELETE', `/exercises/${exercicio.id}`, undefined, token)
    assert.equal(recusa.status, 409)
    assert.match(recusa.body.error, /meta/)
    assert.equal((await api('GET', '/goals', undefined, token)).body.length, 1)

    // A cascata da conta apaga meta e exercício juntos, sem o RESTRICT barrar.
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM users WHERE id = $1', [id])
    })
    assert.equal((await db.query('SELECT 1 FROM exercises WHERE id = $1', [exercicio.id])).rows.length, 0)
  })

  it('o banco recusa o que a API também recusaria (violação de CHECK e de UNIQUE)', async () => {
    const { id } = await conta()
    const codigo = async (sql: string, params: unknown[] = []) => {
      try {
        await db.query(sql, params)
        return 'aceitou'
      } catch (erro) {
        return (erro as { code: string }).code
      }
    }
    assert.equal(await codigo(`INSERT INTO practice_sessions (user_id, performed_at, duration_minutes) VALUES ($1, now(), -1)`, [id]), '23514')
    assert.equal(await codigo(`INSERT INTO goals (user_id, title, kind, target) VALUES ($1, 'x', 'inventada', 1)`, [id]), '23514')
    assert.equal(await codigo(`INSERT INTO physical_tests (user_id, kind, value, performed_at) VALUES ($1, 'inventado', 1, now())`, [id]), '23514')
    assert.equal(await codigo(`INSERT INTO exercises (name, category, metric) VALUES ('Lance livre', 'arremesso', 'acertos')`), '23505')
  })

  it('somas além do integer chegam como número no driver pg', async () => {
    const { token, id } = await conta()
    const exercicio = (await api('GET', '/exercises', undefined, token)).body[0].id
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO practice_sessions (user_id, performed_at, duration_minutes) VALUES ($1, now(), 2000000000), ($1, now(), 2000000000) RETURNING id`,
      [id],
    )
    for (const row of rows) {
      await db.query('INSERT INTO session_entries (session_id, exercise_id, attempts, makes) VALUES ($1, $2, 2000000000, 2000000000)', [row.id, exercicio])
    }
    const resumo = await api('GET', '/stats/summary', undefined, token)
    assert.equal(resumo.status, 200)
    assert.strictEqual(resumo.body.totals.minutes, 4_000_000_000)
    assert.strictEqual(resumo.body.shooting.makes, 4_000_000_000)
    const progresso = await api('GET', '/stats/progress', undefined, token)
    assert.equal(progresso.status, 200)
    assert.strictEqual(progresso.body.totals.makes, 4_000_000_000)
  })

  it('entrada que antes virava erro do banco agora é 400', async () => {
    const { token } = await conta()
    for (const [method, path, body] of [
      ['GET', '/sessions/2147483648'],
      ['GET', '/sessions?offset=99999999999999999999'],
      ['GET', '/stats/summary?to=9999-12-31'],
      ['POST', '/sessions', { performedAt: '9999-12-31T23:59:59-14:00', entries: [] }],
      ['POST', '/exercises', { name: 'a\u0000b', category: 'drible', metric: 'tempo' }],
    ] as [string, string, unknown?][]) {
      assert.equal((await api(method, path, body, token)).status, 400, path)
    }
  })
})
