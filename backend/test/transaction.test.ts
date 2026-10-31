import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { describe, it } from 'node:test'
import pg from 'pg'
import { fromPool, isDatabaseUnavailable } from '../src/db/index.js'

// O PGlite não tem conexão para cair: aqui o client imita o do pg, que emite 'error' quando a conexão morre.
// O caminho real está em postgres.test.ts, com pg_terminate_backend.
function fakePool(falhaEm: (sql: string) => Error | null = () => null) {
  const client = Object.assign(new EventEmitter(), {
    sql: [] as string[],
    released: [] as unknown[],
    async query(sql: string) {
      client.sql.push(sql)
      const falha = falhaEm(sql)
      if (falha) throw falha
      return { rows: [], rowCount: 0 }
    },
    release(error?: unknown) {
      client.released.push(error)
    },
  })
  return { client, db: fromPool({ connect: async () => client } as unknown as pg.Pool) }
}

describe('Transação com a conexão caindo', () => {
  it("o 'error' do client durante a transação não vira exceção sem dono", async () => {
    const { client, db } = fakePool()
    const queda = new Error('Connection terminated unexpectedly')
    // Sem listener, o emit de 'error' lança aqui dentro e o teste falha com a queda, não com o erro abaixo.
    await assert.rejects(
      db.transaction(async () => {
        client.emit('error', queda)
        throw new Error('consulta falhou')
      }),
      /consulta falhou/,
    )
    assert.deepEqual(client.released, [queda], 'a conexão que caiu sai do pool')
    assert.equal(client.listenerCount('error'), 0, 'o listener não fica preso no client devolvido')
  })

  it('o ROLLBACK que falha não troca o erro original nem devolve a conexão ao pool', async () => {
    const morta = new Error('not queryable')
    const { client, db } = fakePool((sql) => (sql === 'ROLLBACK' ? morta : null))
    await assert.rejects(
      db.transaction(async () => {
        throw new Error('o erro de verdade')
      }),
      /o erro de verdade/,
    )
    assert.deepEqual(client.released, [morta])
  })

  it('erro comum desfaz com ROLLBACK e a conexão, que segue boa, volta ao pool', async () => {
    const { client, db } = fakePool()
    await assert.rejects(
      db.transaction(async () => {
        throw new Error('dados ruins')
      }),
    )
    assert.deepEqual(client.sql, ['BEGIN', 'ROLLBACK'])
    assert.deepEqual(client.released, [undefined])
  })

  it('COMMIT que falha também desfaz e descarta o que precisa', async () => {
    const { client, db } = fakePool((sql) => (sql === 'COMMIT' || sql === 'ROLLBACK' ? new Error('caiu') : null))
    await assert.rejects(db.transaction(async () => 1), /caiu/)
    assert.equal(client.released.length, 1)
    assert.ok(client.released[0] instanceof Error)
  })

  it('consulta fora de transação: erro de SQL devolve a conexão ao pool; os demais a descartam', async () => {
    const erroDoBanco = (severity: string) => Object.assign(new pg.DatabaseError('falhou', 0, 'error'), { severity })
    const repetido = erroDoBanco('ERROR')
    for (const [falha, liberada] of [
      [repetido, undefined],
      [erroDoBanco('FATAL'), 'descarta'],
      [new Error('Connection terminated unexpectedly'), 'descarta'],
    ] as const) {
      const { client, db } = fakePool(() => falha)
      await assert.rejects(db.query('SELECT 1'), (erro) => erro === falha)
      assert.deepEqual(client.released, [liberada && falha])
      assert.equal(client.listenerCount('error'), 0)
    }
  })

  it("o 'error' do client durante uma consulta não vira exceção sem dono e descarta a conexão", async () => {
    const queda = new Error('Connection terminated unexpectedly')
    const { client, db } = fakePool(() => {
      client.emit('error', queda)
      return null
    })
    await db.query('SELECT 1')
    assert.deepEqual(client.released, [queda])
  })

  it('reconhece falhas do banco, mas não erros de dados', () => {
    for (const erro of [
      { code: '57014' },
      { code: '57P01' },
      { code: '08006' },
      { code: 'ECONNREFUSED' },
      new Error('timeout exceeded when trying to connect'),
      new Error('Connection terminated unexpectedly'),
    ]) {
      assert.equal(isDatabaseUnavailable(erro), true, JSON.stringify(erro))
    }
    for (const erro of [{ code: '23505' }, { code: '22003' }, new Error('qualquer outra'), null]) {
      assert.equal(isDatabaseUnavailable(erro), false, JSON.stringify(erro))
    }
  })
})
