import type { AddressInfo } from 'node:net'
import { after } from 'node:test'
import { createApp, type AppOptions } from '../src/app.js'
import type { Database } from '../src/db/index.js'
import { caixaDeEmails, criarConta } from './caixa.js'
import { openTestDatabase } from './pglite.js'

export type ApiResponse = { status: number; body: any }
export type Api = (method: string, path: string, body?: unknown, token?: string) => Promise<ApiResponse>

/**
 * Sobe a API inteira numa porta livre com um banco PGlite novo; fecha tudo ao fim do arquivo de teste.
 * Os testes erram senha de propósito várias vezes, então o limite de tentativas fica alto, salvo pedido.
 */
export async function startApi(options: AppOptions = {}, envolver: (db: Database) => Database = (db) => db) {
  const folga = { maximo: 1000, janelaMs: 60_000 }
  const db = await openTestDatabase()
  const caixa = caixaDeEmails()
  const server = createApp(envolver(db), {
    limiteTentativas: folga,
    limiteConta: folga,
    limiteCadastros: folga,
    limiteRecuperacao: folga,
    limiteEnvios: folga,
    emails: caixa.emails,
    segundoPlano: caixa.segundoPlano,
    ...options,
  }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`

  after(async () => {
    server.close()
    await caixa.terminar()
    await db.close()
  })

  /** `body` como string vai cru (para testar JSON malformado); objetos vão em JSON. */
  const api: Api = async (method, path, body, token) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null }
  }

  let users = 0
  /** Cadastra e ativa um atleta novo e devolve o token e o id. */
  const register = async (name = 'Atleta') => {
    const email = `atleta${++users}-${Date.now()}@example.com`
    const { token, user } = await criarConta(api, caixa, { name, email, password: 'senha-segura' })
    return { token, id: user.id, email }
  }

  return { api, db, register, baseUrl, caixa }
}
