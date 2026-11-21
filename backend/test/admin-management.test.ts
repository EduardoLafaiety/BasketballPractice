import assert from 'node:assert/strict'
import { it } from 'node:test'
import { startApi } from './http.js'
import { provisionOwners } from '../src/modules/admin/admin.provision.js'
import { ADMIN_OWNERS, effectiveAdmin } from '../src/lib/admin-owners.js'
import { verifyPassword } from '../src/lib/password.js'
import { criarConta } from './caixa.js'
import { createAdminAccount } from '../src/modules/admin/admin.service.js'

process.env.ADMIN_OWNERS_ONLY = 'true'
const credentials = Object.fromEntries(ADMIN_OWNERS.map((owner, i) => [owner.email, `test-only-owner-password-${i}-NOT-PRODUCTION`]))
const billing = { enabled: true, accessToken: '', webhookSecret: '', collectorId: '', liveMode: false, appUrl: 'http://teste.local' }

it('o comando individual de criação também restringe os e-mails e mantém o acesso sem pagamento do responsável', async () => {
  const { api, db } = await startApi({ billing })
  await assert.rejects(createAdminAccount(db, { name:'Outra pessoa',email:'fora-da-lista@example.com',password:'senha-de-teste-segura' }), {status:403})
  const owner=ADMIN_OWNERS[1]
  await createAdminAccount(db, {...owner,password:credentials[owner.email]})
  const login=await api('POST','/auth/login',{email:owner.email,password:credentials[owner.email]})
  assert.equal(login.status,200)
  assert.equal(login.body.user.isAdmin,true)
  assert.equal((await api('GET','/exercises',undefined,login.body.token)).status,200)
  assert.equal((await api('GET','/admin/users',undefined,login.body.token)).status,200)
})

it('só os dois responsáveis provisionados acessam a administração e ficam isentos da assinatura', async () => {
  const { api, db, register, caixa } = await startApi({ billing })
  const registered = await criarConta(api, caixa, { name: 'Agatha', email: ADMIN_OWNERS[0].email, password: 'senha-segura' })
  assert.equal(registered.user.isAdmin, false, 'cadastrar o e-mail não concede admin')
  assert.equal((await api('GET', '/admin/users', undefined, registered.token)).status, 403)
  await assert.rejects(provisionOwners(db, credentials), { status: 409 })
  await provisionOwners(db, credentials, true)
  assert.equal((await api('GET', '/auth/me', undefined, registered.token)).status, 401, 'provisionamento revoga o token anterior')
  let ownerToken = ''
  for (const owner of ADMIN_OWNERS) {
    const login = await api('POST', '/auth/login', { email: owner.email, password: credentials[owner.email] })
    assert.equal(login.status, 200)
    assert.equal(login.body.user.isAdmin, true)
    const token = login.body.token
    ownerToken = token
    assert.equal((await api('GET', '/admin/users', undefined, token)).status, 200)
    assert.equal((await api('GET', '/exercises', undefined, token)).status, 200)
    const other = await register()
    assert.equal((await api('PATCH', `/admin/users/${other.id}`, { isAdmin: true }, token)).status, 403)
  }
  const outsider = await register()
  await db.query('UPDATE users SET is_admin = true WHERE id = $1', [outsider.id])
  assert.equal((await api('GET', '/auth/me', undefined, outsider.token)).body.isAdmin, false)
  assert.equal((await api('GET', '/admin/users', undefined, outsider.token)).status, 403)
  assert.equal((await api('GET', '/exercises', undefined, outsider.token)).status, 402)
  assert.equal((await api('PATCH', `/admin/users/${outsider.id}`, { blocked: true }, ownerToken)).status, 200, 'papel legado fora da lista não impede gerenciar a conta')
  assert.equal(effectiveAdmin('agatha.lafaietyy@gmail.com.evil.example', true), false)
})

it('bloquear revoga tokens, impede login e redefinição não libera conta bloqueada; desbloquear exige novo login', async () => {
  const { api, db, register, caixa } = await startApi()
  await provisionOwners(db, credentials)
  const admin = (await api('POST', '/auth/login', { email: ADMIN_OWNERS[0].email, password: credentials[ADMIN_OWNERS[0].email] })).body.token
  const user = await register()
  assert.equal((await api('PATCH', `/admin/users/${user.id}`, { blocked: true }, user.token)).status, 403)
  assert.equal((await api('POST', `/admin/users/${user.id}/revoke-sessions`, {}, user.token)).status, 403)
  assert.equal((await api('PATCH', `/admin/users/${user.id}`, { blocked: true }, admin)).status, 200)
  assert.equal((await api('GET', '/auth/me', undefined, user.token)).status, 401)
  assert.equal((await api('POST', '/auth/login', { email: user.email, password: 'senha-segura' })).status, 401)
  await api('POST', '/auth/forgot-password', { email: user.email })
  const link = await caixa.ultimoToken(user.email)
  assert.equal((await api('POST', '/auth/reset-password', { token: link, password: 'nova-senha-segura' })).status, 400)
  assert.equal((await api('PATCH', `/admin/users/${user.id}`, { blocked: false }, admin)).status, 200)
  assert.equal((await api('GET', '/auth/me', undefined, user.token)).status, 401)
  const login = await api('POST', '/auth/login', { email: user.email, password: 'senha-segura' })
  assert.equal(login.status, 200)
  assert.equal((await api('POST', `/admin/users/${user.id}/revoke-sessions`, {}, admin)).status, 204)
  assert.equal((await api('GET', '/auth/me', undefined, login.body.token)).status, 401)
  const detail = await api('GET', `/admin/users/${user.id}`, undefined, admin)
  assert.equal(detail.status, 200)
  assert.ok(detail.body.lastLoginAt)
  assert.deepEqual(detail.body.audit.map((x: { action: string }) => x.action), ['sessions_revoked', 'unblocked', 'blocked'])
  assert.ok(detail.body.audit.every((x: { actorName: string }) => x.actorName === 'Agatha Lafaiety'))
})

it('protege os responsáveis e registra edição sem expor credenciais nem permitir alterar pagamento', async () => {
  const { api, db, register } = await startApi()
  await provisionOwners(db, credentials)
  const login = (await api('POST', '/auth/login', { email: ADMIN_OWNERS[0].email, password: credentials[ADMIN_OWNERS[0].email] })).body
  const admin = login.token
  const owners = (await api('GET', '/admin/users', undefined, admin)).body
  for (const owner of owners) {
    assert.equal((await api('PATCH', `/admin/users/${owner.id}`, { blocked: true }, admin)).status, 403)
    assert.equal((await api('DELETE', `/admin/users/${owner.id}`, undefined, admin)).status, owner.id === login.user.id ? 400 : 403)
    assert.equal((await api('POST', `/admin/users/${owner.id}/revoke-sessions`, undefined, admin)).status, 403)
  }
  assert.equal((await api('DELETE', '/auth/me', { password: credentials[ADMIN_OWNERS[0].email] }, admin)).status, 403)
  const target = await register()
  assert.equal((await api('PATCH', `/admin/users/${target.id}`, { paidUntil: '2099-01-01' }, admin)).status, 400)
  assert.equal((await api('PATCH', `/admin/users/${target.id}`, { name: 'Nome novo', isAdmin: false }, admin)).status, 400)
  assert.equal((await api('PATCH', `/admin/users/${target.id}`, { name: 'Nome novo' }, admin)).body.name, 'Nome novo')
  const detail = (await api('GET', `/admin/users/${target.id}`, undefined, admin)).body
  assert.equal(detail.audit[0].action, 'name_changed')
  assert.equal(detail.passwordHash, undefined)
  assert.equal(detail.tokenVersion, undefined)
  assert.equal((await api('GET', `/admin/users/${target.id}`, undefined, target.token)).status, 403)
  assert.equal((await api('GET', `/admin/users/${target.id}`)).status, 401)
  const row = (await db.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [login.user.id])).rows[0]
  assert.ok(row.password_hash.startsWith('scrypt$'))
  assert.ok(await verifyPassword(credentials[ADMIN_OWNERS[0].email], row.password_hash))
  await provisionOwners(db, credentials)
  assert.equal((await api('GET', '/auth/me', undefined, admin)).status, 200, 'execução idempotente preserva a sessão')
})
