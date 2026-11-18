import type { Database, Queryable } from '../../db/index.js'
import { adminIds, isAdmin, lockAdminMembership } from '../../db/account-access.js'
import { deleteUser } from '../../db/users.js'
import { HttpError, notFound } from '../../lib/http-error.js'
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
