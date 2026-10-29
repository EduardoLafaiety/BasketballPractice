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

function fromPool(pool: pg.Pool): Database {
  return {
    async query(sql, params) {
      const result = await pool.query(sql, params)
      return { rows: result.rows, rowCount: result.rowCount ?? 0 }
    },
    async transaction(fn) {
      const client = await pool.connect()
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
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
}

export async function prepareDatabase(db: Database) {
  await migrate(db)
  await seed(db)
  return db
}

export async function openDatabase(connectionString: string) {
  // Datas sempre em UTC, independente do fuso do servidor.
  const pool = new pg.Pool({ connectionString, options: '-c TimeZone=UTC' })
  pool.on('error', (error) => console.error('Erro em conexão ociosa do Postgres', error))
  return prepareDatabase(fromPool(pool))
}
