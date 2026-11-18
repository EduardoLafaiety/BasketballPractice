import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import pg from 'pg'
import { createApp } from '../src/app.js'
import { fromPool, isDatabaseUnavailable, openDatabase, type Database } from '../src/db/index.js'
import { migrate } from '../src/db/migrations.js'
import { caixaDeEmails, criarConta } from './caixa.js'
import { seed } from '../src/db/seed.js'
import { createBackupService } from '../src/modules/data/backup.service.js'

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
  const caixa = caixaDeEmails()
  const urlDoBanco = () => {
    const url = new URL(ADMIN_URL!)
    url.pathname = `/${BANCO}`
    return url.toString()
  }

  before(async () => {
    await admin(`CREATE DATABASE ${BANCO}`)
    db = await openDatabase(urlDoBanco())
    const folga = { maximo: 100_000, janelaMs: 60_000 }
    const server = createApp(db, {
      limiteTentativas: folga,
      limiteConta: folga,
      limiteCadastros: folga,
      limiteRecuperacao: folga,
      limiteEnvios: folga,
      maxImports: 2,
      emails: caixa.emails,
      segundoPlano: caixa.segundoPlano,
    }).listen(0)
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
    const { token, user } = await criarConta(api, caixa, { name: 'Atleta', email, password: 'senha-segura' })
    return { token, id: user.id, email }
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

  it('contas serializam mudanças cruzadas de administrador e revalidam o autor', { timeout: 20_000 }, async () => {
    const a = await conta(), b = await conta()
    await db.query('UPDATE users SET is_admin = true WHERE id = ANY($1)', [[a.id, b.id]])
    const lock = new pg.Client({ connectionString: urlDoBanco() })
    await lock.connect()
    try {
      await lock.query('SELECT pg_advisory_lock(4247)')
      const pending = Promise.all([
        api('PATCH', `/admin/users/${b.id}`, { isAdmin: false }, a.token),
        api('PATCH', `/admin/users/${a.id}`, { isAdmin: false }, b.token),
      ])
      try {
        let waiting = 0
        for (let attempt = 0; attempt < 100; attempt++) {
          waiting = (await admin("SELECT 1 FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock' AND query LIKE '%pg_advisory_xact_lock(4247)%'", [BANCO])).rows.length
          if (waiting === 2) break
          await espera(20)
        }
        assert.equal(waiting, 2, 'os dois pedidos passaram no middleware e aguardam a trava de alteração')
      } finally { await lock.query('SELECT pg_advisory_unlock(4247)') }
      assert.deepEqual((await pending).map((r) => r.status).sort(), [200, 403])
      assert.equal((await db.query('SELECT id FROM users WHERE id = ANY($1) AND is_admin', [[a.id, b.id]])).rows.length, 1)
    } finally {
      await lock.end()
      await db.query('UPDATE users SET is_admin = false WHERE id = ANY($1)', [[a.id, b.id]])
    }
  })

  it('contas serializam trocas de senha e não aceitam novamente a senha antiga', { timeout: 20_000 }, async () => {
    const user = await conta()
    const passwords = ['senha-primeira-na-quadra', 'senha-segunda-na-quadra']
    let pending!: Promise<Awaited<ReturnType<typeof api>>[]>
    await db.transaction(async (tx) => {
      await tx.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [user.id])
      pending = Promise.all(passwords.map((newPassword) => api('PUT', '/auth/password', { currentPassword: 'senha-segura', newPassword }, user.token)))
      let waiting = 0
      for (let attempt = 0; attempt < 100; attempt++) {
        waiting = (await admin("SELECT 1 FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock' AND (query LIKE '%FROM users WHERE id =%' OR query LIKE 'UPDATE users SET password_hash%')", [BANCO])).rows.length
        if (waiting === 2) break
        await espera(20)
      }
      assert.equal(waiting, 2, 'ambos os pedidos autenticados aguardam a conta antes de alterar credenciais')
    })
    const responses = await pending
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 403])
    const winner = responses.findIndex((r) => r.status === 200)
    assert.equal((await api('POST', '/auth/login', { email: user.email, password: passwords[winner] })).status, 200)
    assert.equal((await api('POST', '/auth/login', { email: user.email, password: 'senha-segura' })).status, 401)
    assert.equal((await api('GET', '/auth/me', undefined, user.token)).status, 401)
  })

  it('programas serializam reinício, conclusão e saída por conta', { timeout: 20_000 }, async () => {
    const owner = await conta(), other = await conta()
    const path = '/programs/arremesso-30'
    assert.equal((await api('POST', `${path}/start`, {}, owner.token)).status, 201)
    const lock = new pg.Client({ connectionString: urlDoBanco() })
    await lock.connect()
    try {
      for (const [method, suffix, expected] of [['POST', '/start', 201], ['POST', '/days/1/complete', 201], ['DELETE', '', 204]] as const) {
        await lock.query('SELECT pg_advisory_lock(4244, $1::int)', [owner.id])
        let finished = false
        const pending = api(method, path + suffix, method === 'POST' ? {} : undefined, owner.token).finally(() => { finished = true })
        try {
          // Outra conta continua progredindo enquanto a conta sob teste aguarda sua trava.
          assert.equal((await api('POST', `${path}/start`, {}, other.token)).status, 201)
          let waiting = false
          for (let attempt = 0; attempt < 100; attempt++) {
            waiting = (await admin("SELECT 1 FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock' AND query LIKE '%pg_advisory_xact_lock(4244,%'", [BANCO])).rows.length > 0
            if (waiting) break
            await espera(20)
          }
          assert.equal(waiting, true, method + suffix)
          assert.equal(finished, false, method + suffix)
        } finally { await lock.query('SELECT pg_advisory_unlock(4244, $1::int)', [owner.id]) }
        assert.equal((await pending).status, expected)
      }
    } finally { await lock.end() }
    assert.equal((await api('GET', path, undefined, owner.token)).body.status.started, false)
  })

  it('programas serializam dois reinícios e recusam conclusão duplicada sem erro interno', async () => {
    const { token } = await conta()
    const path = '/programs/arremesso-30'
    const starts = await Promise.all([1, 2].map(() => api('POST', `${path}/start`, {}, token)))
    assert.deepEqual(starts.map((r) => r.status), [201, 201])
    const completions = await Promise.all([1, 2].map(() => api('POST', `${path}/days/1/complete`, {}, token)))
    assert.deepEqual(completions.map((r) => r.status).sort(), [201, 409])
    const program = await api('GET', path, undefined, token)
    assert.equal(program.body.status.done, 1)
    assert.equal(program.body.days.filter((day: { state: string }) => day.state === 'done').length, 1)
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

  it('backup mantém um retrato consistente enquanto sessão e preferências são editadas', { timeout: 20_000 }, async () => {
    const { token, id } = await conta()
    const exerciseId = (await api('GET', '/exercises', undefined, token)).body[0].id
    const input = { performedAt: new Date().toISOString(), notes: 'Antes', entries: [{ exerciseId, makes: 1, attempts: 2 }] }
    const created = await api('POST', '/sessions', input, token)
    assert.equal(created.status, 201)
    assert.equal((await api('PUT', '/settings', { theme: 'claro' }, token)).status, 200)
    let signal!: () => void
    let release!: () => void
    const paused = new Promise<void>((resolve) => { signal = resolve })
    const gate = new Promise<void>((resolve) => { release = resolve })
    let stop = true
    const snapshotDb: Database = {
      ...db,
      transaction: (fn) => db.transaction((tx) => fn({
        query: async (sql, params) => {
          if (stop && sql.includes('FROM session_entries se JOIN')) {
            stop = false; signal(); await gate
          }
          return tx.query(sql, params)
        },
      })),
    }
    const exporting = createBackupService(snapshotDb).exportBackup(id)
    try {
      await paused
      const updated = await api('PUT', `/sessions/${created.body.id}`, { ...input, notes: 'Depois', entries: [{ exerciseId, makes: 3, attempts: 4 }] }, token)
      assert.equal(updated.status, 200)
      assert.equal((await api('PUT', '/settings', { theme: 'escuro' }, token)).status, 200)
    } finally { release() }
    const snapshot = JSON.parse(JSON.stringify(await exporting))
    assert.equal(snapshot.sessions[0].notes, 'Antes')
    assert.equal(snapshot.sessions[0].entries[0].makes, 1)
    assert.equal(snapshot.settings.theme, 'claro')
    const latest = await api('GET', '/data/export', undefined, token)
    assert.equal(latest.status, 200)
    assert.equal(latest.body.sessions[0].notes, 'Depois')
    assert.equal(latest.body.sessions[0].entries[0].makes, 3)
    assert.equal(latest.body.settings.theme, 'escuro')
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

    it('erro de SQL não descarta a conexão, inclusive por uma rota que espera o erro', async () => {
      await comUmaConexao(async (alvo) => {
        const antes = await backend(alvo)
        await assert.rejects(alvo.query('SELECT 1/0'), { code: '22012' })
        assert.equal(await backend(alvo), antes)
      })

      const { token } = await conta()
      const exercicio = (await api('POST', '/exercises', { name: 'Em uso', category: 'drible', metric: 'tempo' }, token)).body.id
      assert.equal((await api('POST', '/workouts', { name: 'Treino', exercises: [{ exerciseId: exercicio }] }, token)).status, 201)
      const pids = async () =>
        (await admin(`SELECT pid FROM pg_stat_activity WHERE datname = $1 ORDER BY pid`, [BANCO])).rows.map((r) => r.pid)
      const antes = await pids()
      for (let i = 0; i < 3; i++) assert.equal((await api('DELETE', `/exercises/${exercicio}`, undefined, token)).status, 409)
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

  describe('Contas', () => {
    const SENHA = 'senha-segura'

    it('excluir a própria conta passa pelo RESTRICT de verdade: exercício próprio em treino e sessão', async () => {
      const { token, id } = await conta()
      const outra = await conta()
      const exercicio = (await api('POST', '/exercises', { name: 'Floater', category: 'finalizacao', metric: 'acertos' }, token)).body.id
      assert.equal((await api('POST', '/workouts', { name: 'Treino', exercises: [{ exerciseId: exercicio }] }, token)).status, 201)
      assert.equal((await api('POST', '/sessions', { performedAt: '2026-10-20', entries: [{ exerciseId: exercicio, makes: 1, attempts: 2 }] }, token)).status, 201)

      assert.equal((await api('DELETE', '/auth/me', { password: SENHA }, token)).status, 204)
      for (const tabela of ['exercises', 'workouts', 'practice_sessions']) {
        assert.equal((await db.query(`SELECT 1 FROM ${tabela} WHERE user_id = $1`, [id])).rows.length, 0, tabela)
      }
      assert.equal((await api('GET', '/auth/me', undefined, token)).status, 401)
      assert.equal((await api('GET', '/auth/me', undefined, outra.token)).status, 200)
    })

    it('o mesmo link de recuperação em conexões simultâneas: só um pedido troca a senha', async () => {
      const { email } = await conta()
      await api('POST', '/auth/forgot-password', { email })
      const token = await caixa.ultimoToken(email)
      const respostas = await Promise.all(
        Array.from({ length: 8 }, (_, i) => api('POST', '/auth/reset-password', { token, password: `tentativa-numero-${i}` })),
      )
      assert.equal(respostas.filter((r) => r.status === 200).length, 1)
      assert.equal(respostas.filter((r) => r.status === 400).length, 7)
    })

    it('o mesmo link de ativação em conexões simultâneas: só uma conta nasce', async () => {
      const email = `ativa-${Date.now()}@example.com`
      await api('POST', '/auth/register', { name: 'Atleta', email, password: SENHA })
      const token = await caixa.ultimoToken(email)
      const respostas = await Promise.all(Array.from({ length: 8 }, () => api('POST', '/auth/confirm', { token, password: SENHA })))
      assert.equal(respostas.filter((r) => r.status === 201).length, 1)
      assert.equal(respostas.filter((r) => r.status === 400).length, 7)
      assert.equal((await db.query('SELECT 1 FROM users WHERE email = $1', [email])).rows.length, 1)
    })

    // Corrida: o deadlock só aparece quando os dois pedidos se cruzam, por isso repete. Sem a ordem das travas, dá 500.
    it('dois links do mesmo e-mail ativados ao mesmo tempo: uma conta só, sem deadlock', async () => {
      for (let i = 0; i < 12; i++) {
        const email = `duas-${i}-${Date.now()}@example.com`
        await api('POST', '/auth/register', { name: 'Primeira', email, password: SENHA })
        const primeiro = await caixa.ultimoToken(email)
        await api('POST', '/auth/register', { name: 'Segunda', email, password: SENHA })
        const segundo = await caixa.ultimoToken(email)
        const respostas = await Promise.all([primeiro, segundo].map((token) => api('POST', '/auth/confirm', { token, password: SENHA })))
        assert.deepEqual(respostas.map((r) => r.status).sort(), [201, 400])
        assert.equal((await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [email])).rows.length, 1)
      }
    })

    it('dois links da mesma conta usados ao mesmo tempo: um vale, sem deadlock', async () => {
      for (let i = 0; i < 12; i++) {
        const { email } = await conta()
        await api('POST', '/auth/forgot-password', { email })
        const primeiro = await caixa.ultimoToken(email)
        await api('POST', '/auth/forgot-password', { email })
        const segundo = await caixa.ultimoToken(email)
        const respostas = await Promise.all(
          [primeiro, segundo].map((token, j) => api('POST', '/auth/reset-password', { token, password: `senha-nova-numero-${j}` })),
        )
        assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 400])
      }
    })

    it('a troca de senha trava a conta antes dos links, na ordem da recuperação (sem deadlock)', async () => {
      const { email, token, id } = await conta()
      await api('POST', '/auth/forgot-password', { email })
      await caixa.ultimoToken(email)

      let troca: ReturnType<typeof api> | undefined
      await db.transaction(async (tx) => {
        await tx.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [id])
        troca = api('PUT', '/auth/password', { currentPassword: SENHA, newPassword: 'senha-da-troca-boa' }, token)
        for (let i = 0; i < 200; i++) {
          const presas = await admin(`SELECT 1 FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock'`, [BANCO], urlDoBanco())
          if (presas.rows.length) break
          await espera(25)
        }
        // A troca está parada na conta e ainda não pode ter tocado nos links: é isso que evita a trava cruzada.
        await db.query('SELECT 1 FROM password_reset_tokens WHERE user_id = $1 FOR UPDATE NOWAIT', [id])
      })
      assert.equal((await troca!).status, 200)
    })

    it('os dois últimos administradores se excluindo ao mesmo tempo: um fica', async () => {
      await db.query('UPDATE users SET is_admin = false')
      const a = await conta()
      const b = await conta()
      await db.query('UPDATE users SET is_admin = true WHERE id = ANY($1)', [[a.id, b.id]])
      try {
        const respostas = await Promise.all([a, b].map(({ token }) => api('DELETE', '/auth/me', { password: SENHA }, token)))
        assert.deepEqual(respostas.map((r) => r.status).sort(), [204, 409])
        assert.equal((await db.query('SELECT 1 FROM users WHERE is_admin')).rows.length, 1)
      } finally {
        await db.query('UPDATE users SET is_admin = false')
      }
    })

    it('sair em conexões simultâneas não perde nenhuma revogação', async () => {
      const { token, id } = await conta()
      const antes = (await db.query<{ v: number }>('SELECT token_version AS v FROM users WHERE id = $1', [id])).rows[0].v
      await Promise.all(Array.from({ length: 5 }, () => api('POST', '/auth/logout', undefined, token)))
      assert.equal((await api('GET', '/auth/me', undefined, token)).status, 401)
      assert.ok((await db.query<{ v: number }>('SELECT token_version AS v FROM users WHERE id = $1', [id])).rows[0].v > antes)
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
    assert.equal(await codigo(`INSERT INTO exercises (name, category, metric) VALUES ('Lance livre', 'arremesso', 'acertos')`), '23505')
  })

  it('entrada que antes virava erro do banco agora é 400', async () => {
    const { token } = await conta()
    for (const [method, path, body] of [
      ['GET', '/sessions/2147483648'],
      ['GET', '/sessions?offset=99999999999999999999'],
      ['POST', '/sessions', { performedAt: '9999-12-31T23:59:59-14:00', entries: [] }],
      ['POST', '/exercises', { name: 'a\u0000b', category: 'drible', metric: 'tempo' }],
    ] as [string, string, unknown?][]) {
      assert.equal((await api(method, path, body, token)).status, 400, path)
    }
  })
})
