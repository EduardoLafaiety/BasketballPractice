import pg from 'pg'
import { migrate } from './migrations.js'
import { seed } from './seed.js'

export type QueryResult<T> = { rows: T[]; rowCount: number }

// Conexão ou transação: tudo que executa SQL com parâmetros $1, $2...
export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>
}

export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>
  close(): Promise<void>
}

export async function one<T>(db: Queryable, sql: string, params?: unknown[]) {
  return (await db.query<T>(sql, params)).rows[0] as T | undefined
}

export async function many<T>(db: Queryable, sql: string, params?: unknown[]) {
  return (await db.query<T>(sql, params)).rows
}

// Código de erro do Postgres para violação de UNIQUE.
export const UNIQUE_VIOLATION = '23505'
// Apagar um registro ainda referenciado por uma FK com ON DELETE RESTRICT: o Postgres responde
// 23503 (foreign_key_violation); o PGlite dos testes responde 23001 (restrict_violation).
export const RESTRICT_VIOLATION = '23001'
export const FOREIGN_KEY_VIOLATION = '23503'

export const isPgError = (error: unknown, code: string) =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code

/** O DELETE falhou porque o registro ainda é usado por outra tabela. */
export const isStillReferenced = (error: unknown) =>
  isPgError(error, RESTRICT_VIOLATION) || isPgError(error, FOREIGN_KEY_VIOLATION)

/** O pedido falhou por causa do banco (consulta longa demais, pool cheio, conexão caída), não por causa dos dados. */
export function isDatabaseUnavailable(error: unknown) {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown }
  if (typeof code === 'string' && /^(57014|57P0\d|08\w{3}|ECONN\w+|ETIMEDOUT)$/.test(code)) return true
  return typeof message === 'string' && /timeout exceeded when trying to connect|Connection terminated|not queryable/.test(message)
}

// Fora do pool, ninguém escuta o client: sem este listener, uma conexão que cai aqui derruba o processo.
async function withClient<R>(pool: pg.Pool, fn: (client: pg.PoolClient, lose: (error: Error) => void) => Promise<R>) {
  const client = await pool.connect()
  let lost: Error | undefined
  const lose = (error: Error) => {
    lost ??= error
  }
  const onConnectionError = (error: Error) => {
    lose(error)
    console.error('Conexão com o Postgres caiu durante o uso', error)
  }
  client.on('error', onConnectionError)
  try {
    return await fn(client, lose)
  } finally {
    client.off('error', onConnectionError)
    // Com erro, o pool descarta a conexão em vez de entregá-la quebrada ao próximo pedido.
    client.release(lost)
  }
}

export function fromPool(pool: pg.Pool): Database {
  return {
    // Não usa pool.query: ele descarta a conexão a cada erro de SQL, e abrir outra custa muito mais que a consulta.
    query(sql, params) {
      return withClient(pool, async (client, lose) => {
        try {
          const result = await client.query(sql, params)
          return { rows: result.rows, rowCount: result.rowCount ?? 0 }
        } catch (error) {
          // Erro de SQL (e-mail repetido, por exemplo) é resposta do servidor e a conexão segue boa; FATAL a encerra.
          if (!(error instanceof pg.DatabaseError && error.severity === 'ERROR')) lose(error as Error)
          throw error
        }
      })
    },
    transaction(fn) {
      return withClient(pool, async (client, lose) => {
        try {
          await client.query('BEGIN')
          const result = await fn({
            async query(sql, params) {
              const r = await client.query(sql, params)
              return { rows: r.rows, rowCount: r.rowCount ?? 0 }
            },
          })
          await client.query('COMMIT')
          return result
        } catch (error) {
          // Em conexão morta o ROLLBACK também falha: quem chamou recebe o erro original.
          await client.query('ROLLBACK').catch(lose)
          throw error
        }
      })
    },
    close: () => pool.end(),
  }
}

export async function prepareDatabase(db: Database) {
  await migrate(db)
  await seed(db)
  return db
}

// Abrir uma conexão (processo novo no Postgres + SCRAM) pode levar segundos numa máquina ocupada; usar uma, milissegundos.
// Por isso o pool tem tamanho fixo e abre tudo antes de a API atender: um pico de pedidos não vira rajada de conexões novas.
const POOL_SIZE = 10

async function warmUp(pool: pg.Pool) {
  const opened = await Promise.allSettled(Array.from({ length: POOL_SIZE }, () => pool.connect()))
  for (const result of opened) {
    if (result.status === 'fulfilled') result.value.release()
    // A API sobe assim mesmo: a conexão que faltou é aberta quando for preciso.
    else console.warn('Conexão não aberta ao aquecer o pool', result.reason)
  }
}

export async function openDatabase(connectionString: string) {
  // Datas sempre em UTC, independente do fuso do servidor.
  const pool = new pg.Pool({
    connectionString,
    options: '-c TimeZone=UTC',
    min: POOL_SIZE,
    max: POOL_SIZE,
    keepAlive: true,
    // Com o pool cheio, o pedido desiste em vez de esperar para sempre.
    connectionTimeoutMillis: 5_000,
    // Nenhuma consulta nem transação parada prende uma conexão indefinidamente. Migrações desligam o limite.
    statement_timeout: 30_000,
    idle_in_transaction_session_timeout: 60_000,
  })
  pool.on('error', (error) => console.error('Erro em conexão ociosa do Postgres', error))
  const db = await prepareDatabase(fromPool(pool))
  await warmUp(pool)
  return db
}
