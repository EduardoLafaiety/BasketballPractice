import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { describe, it } from 'node:test'
import type pg from 'pg'
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
