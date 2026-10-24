import { PGlite, type Transaction } from '@electric-sql/pglite'
import { prepareDatabase, type Database, type Queryable } from '../src/db/index.js'

// PGlite é o Postgres compilado para WebAssembly: roda em memória, sem servidor nem Docker.
function wrap(client: PGlite | Transaction): Queryable {
  return {
    async query<T>(sql: string, params?: unknown[]) {
      // query() usa o protocolo estendido (um comando só); sem parâmetros, exec() aceita vários comandos.
      if (params?.length) {
        const result = await client.query<T>(sql, params)
        return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length }
      }
      const results = await client.exec(sql)
      const last = results.at(-1)
      return { rows: (last?.rows ?? []) as T[], rowCount: last?.affectedRows ?? last?.rows.length ?? 0 }
    },
  }
}

export async function openTestDatabase(): Promise<Database> {
  const pg = await PGlite.create()
  await pg.exec(`SET TIME ZONE 'UTC'`)
  return prepareDatabase({
    ...wrap(pg),
    transaction: (fn) => pg.transaction((tx) => fn(wrap(tx))),
    close: () => pg.close(),
  })
}
