import type { AddressInfo } from 'node:net'
import { after } from 'node:test'
import { createApp } from '../src/app.js'
import { openTestDatabase } from './pglite.js'

export type ApiResponse = { status: number; body: any }
export type Api = (method: string, path: string, body?: unknown, token?: string) => Promise<ApiResponse>

/** Sobe a API inteira numa porta livre com um banco PGlite novo; fecha tudo ao fim do arquivo de teste. */
export async function startApi() {
  const db = await openTestDatabase()
  const server = createApp(db).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`

  after(async () => {
    server.close()
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
  /** Cadastra um atleta novo e devolve o token e o id. */
  const register = async (name = 'Atleta') => {
    const email = `atleta${++users}-${Date.now()}@example.com`
    const { body } = await api('POST', '/auth/register', { name, email, password: 'senha-segura' })
    return { token: body.token as string, id: body.user.id as number, email }
  }

  return { api, db, register, baseUrl }
}
