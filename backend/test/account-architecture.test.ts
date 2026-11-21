import assert from 'node:assert/strict'
import { it } from 'node:test'
import type { Database, Queryable } from '../src/db/index.js'
import { changeRole, createAdminAccount, setAdminByEmail } from '../src/modules/admin/admin.service.js'
import { createAuthService } from '../src/modules/auth/auth.service.js'
import { startApi } from './http.js'

const PASSWORD = 'senha-segura'
const NEW_PASSWORD = 'senha-nova-na-quadra'
const options = { emails: { send: async () => {} }, appUrl: 'http://teste.local', podeEnviar: () => true }

it('login não assina token novo se a senha mudou depois da leitura das credenciais', async () => {
  const { db, register } = await startApi()
  const user = await register()
  let signal!: () => void
  let release!: () => void
  const captured = new Promise<void>((resolve) => { signal = resolve })
  const gate = new Promise<void>((resolve) => { release = resolve })
  let pause = true
  const wrapped: Database = {
    ...db,
    query: async (sql, params) => {
      const result = await db.query(sql, params)
      if (pause && sql.includes('password_hash AS "passwordHash"') && sql.includes('lower(email)')) {
        pause = false; signal(); await gate
      }
      return result
    },
  }
  const staleLogin = createAuthService(wrapped, options).login({ email: user.email, password: PASSWORD })
  // Registra o observador antes de liberar a execução para evitar rejeição sem consumidor.
  const denied = assert.rejects(staleLogin, { status: 401, message: 'E-mail ou senha incorretos' })
  try {
    await captured
    await createAuthService(db, options).changePassword(user.id, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
  } finally { release() }
  await denied
  const authenticated = await createAuthService(db, options).login({ email: user.email, password: NEW_PASSWORD })
  assert.deepEqual(Object.keys(authenticated.user).sort(), ['createdAt', 'email', 'id', 'isAdmin', 'name'])
})

it('falha ao invalidar links desfaz a mudança de senha e a revogação', async () => {
  let fail = false
  const { api, register, caixa } = await startApi({}, (real: Database): Database => ({
    ...real,
    transaction: (fn) => real.transaction((tx) => {
      const wrapped: Queryable = { query: (sql, params) => {
        if (fail && sql.includes('DELETE FROM password_reset_tokens WHERE user_id')) throw new Error('Falha simulada ao invalidar links')
        return tx.query(sql, params)
      } }
      return fn(wrapped)
    }),
  }))
  const user = await register()
  assert.equal((await api('POST', '/auth/forgot-password', { email: user.email })).status, 202)
  const link = await caixa.ultimoToken(user.email)
  fail = true
  try { assert.equal((await api('PUT', '/auth/password', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }, user.token)).status, 500) }
  finally { fail = false }
  assert.equal((await api('GET', '/auth/me', undefined, user.token)).status, 200)
  assert.equal((await api('POST', '/auth/login', { email: user.email, password: NEW_PASSWORD })).status, 401)
  assert.equal((await api('POST', '/auth/reset-password', { token: link, password: NEW_PASSWORD })).status, 200)
  assert.equal((await api('GET', '/auth/me', undefined, user.token)).status, 401)
})

it('administração revalida o papel no serviço e a ferramenta operacional preserva o último admin', async () => {
  const { db, register } = await startApi()
  const owner = await register(), target = await register()
  assert.equal((await setAdminByEmail(db, owner.email, true))?.id, owner.id)
  await assert.rejects(setAdminByEmail(db, owner.email, false), { status: 409 })
  await changeRole(db, owner.id, target.id, true)
  await setAdminByEmail(db, owner.email, false)
  await assert.rejects(changeRole(db, owner.id, target.id, false), { status: 403 })
  const admins = (await db.query<{ id: number }>('SELECT id FROM users WHERE is_admin')).rows
  assert.deepEqual(admins.map((a) => a.id), [target.id])
})

it('cria um administrador já ativo que entra com a senha, sem pagamento, e não troca a senha de conta existente', async () => {
  const { api, db } = await startApi()
  const criada = await createAdminAccount(db, { name: 'Dona do Site', email: 'Dona@Exemplo.com', password: 'senha-do-admin-123' })
  assert.equal(criada.criada, true)
  const login = await api('POST', '/auth/login', { email: 'dona@exemplo.com', password: 'senha-do-admin-123' })
  assert.equal(login.status, 200)
  assert.equal((login.body as { user: { isAdmin: boolean } }).user.isAdmin, true)
  const repetida = await createAdminAccount(db, { name: 'Outro Nome', email: 'dona@exemplo.com', password: 'outra-senha-456789' })
  assert.equal(repetida.criada, false)
  assert.equal((await api('POST', '/auth/login', { email: 'dona@exemplo.com', password: 'senha-do-admin-123' })).status, 200)
  assert.equal((await api('POST', '/auth/login', { email: 'dona@exemplo.com', password: 'outra-senha-456789' })).status, 401)
  await createAdminAccount(db, { name: 'Dona', email: 'dona@exemplo.com', password: 'outra-senha-456789', redefinirSenha: true })
  assert.equal((await api('POST', '/auth/login', { email: 'dona@exemplo.com', password: 'outra-senha-456789' })).status, 200)
  await assert.rejects(createAdminAccount(db, { name: 'X', email: 'x@y.com', password: 'curta' }), { status: 400 })
})
