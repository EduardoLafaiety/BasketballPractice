import type { Database, Queryable } from '../../db/index.js'
import { adminIds, isAdmin, lockAdminMembership } from '../../db/account-access.js'
import { deleteUser } from '../../db/users.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import { hashPassword } from '../../lib/password.js'
import * as repository from './admin.repository.js'

async function requireAdmin(db: Queryable, actorId: number) {
  if (!await isAdmin(db, actorId)) throw new HttpError(403, 'Acesso restrito a administradores')
}

function rejectSelf(actorId: number, id: number, action: string) {
  if (id === actorId) throw new HttpError(400, `Você não pode ${action} a própria conta`)
}

export async function listUsers(db: Queryable, actorId: number) {
  await requireAdmin(db, actorId)
  return repository.listUsers(db)
}

export function changeRole(db: Database, actorId: number, id: number, role: boolean) {
  return db.transaction(async (tx) => {
    await lockAdminMembership(tx)
    await requireAdmin(tx, actorId)
    rejectSelf(actorId, id, 'alterar o papel de')
    if (!await repository.changeRole(tx, id, role)) throw notFound('Usuário')
    return repository.findUserSummary(tx, id)
  })
}

export function removeUser(db: Database, actorId: number, id: number) {
  return db.transaction(async (tx) => {
    await lockAdminMembership(tx)
    await requireAdmin(tx, actorId)
    rejectSelf(actorId, id, 'excluir')
    if (!await deleteUser(tx, id)) throw notFound('Usuário')
  })
}

/** Entrada operacional: permite criar o primeiro administrador, sem remover o último. */
export function setAdminByEmail(db: Database, email: string, role: boolean) {
  return db.transaction(async (tx) => {
    await lockAdminMembership(tx)
    const user = await repository.findUserByEmail(tx, email.trim().toLowerCase())
    if (!user) return undefined
    if (!role && user.isAdmin && (await adminIds(tx)).length === 1) {
      throw new HttpError(409, 'Você é o único administrador. Passe o papel a outra conta antes de remover o seu.')
    }
    await repository.changeRole(tx, user.id, role)
    return user
  })
}

/**
 * Cria uma conta de administrador já ativa, sem passar por e-mail de confirmação nem pagamento (o admin tem acesso
 * interno). Se o e-mail já tem conta, ela só recebe o papel de admin; a senha só muda com redefinirSenha.
 */
export async function createAdminAccount(db: Database, input: { name: string; email: string; password: string; redefinirSenha?: boolean }) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail inválido.')
  if (name.length < 2) throw new HttpError(400, 'O nome precisa ter pelo menos 2 letras.')
  if (input.password.length < 10) throw new HttpError(400, 'A senha do administrador precisa ter pelo menos 10 caracteres.')
  return db.transaction(async (tx) => {
    await lockAdminMembership(tx)
    const passwordHash = await hashPassword(input.password)
    const existing = await repository.findUserByEmail(tx, email)
    if (existing) {
      await repository.changeRole(tx, existing.id, true)
      if (input.redefinirSenha) await tx.query('UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [passwordHash, existing.id])
      return { id: existing.id, email, criada: false }
    }
    const created = await tx.query<{ id: number }>('INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, true) RETURNING id', [name, email, passwordHash])
    return { id: created.rows[0].id, email, criada: true }
  })
}
