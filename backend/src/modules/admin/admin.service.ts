import type { Database, Queryable } from '../../db/index.js'
import { adminIds, isAdmin, lockAdminMembership } from '../../db/account-access.js'
import { deleteUser } from '../../db/users.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import * as repository from './admin.repository.js'
import { effectiveAdmin, ownerEmail, ownersOnly } from '../../lib/admin-owners.js'

async function requireAdmin(db: Queryable, actorId: number) {
  if (!await isAdmin(db, actorId)) throw new HttpError(403, 'Acesso restrito a administradores')
}

function rejectSelf(actorId: number, id: number, action: string) {
  if (id === actorId) throw new HttpError(400, `Você não pode ${action} a própria conta`)
}

export async function listUsers(db: Queryable, actorId: number) {
  await requireAdmin(db, actorId)
  return (await repository.listUsers(db)).map(user => ({ ...user, isAdmin: effectiveAdmin(user.email, user.isAdmin) }))
}

export function changeRole(db: Database, actorId: number, id: number, role: boolean) {
  return db.transaction(async (tx) => {
    await lockAdminMembership(tx)
    await requireAdmin(tx, actorId)
    rejectSelf(actorId, id, 'alterar o papel de')
    const target = await repository.findUserSummary(tx, id)
    if (target && ownersOnly() && (!ownerEmail(target.email) || !role)) throw new HttpError(403, 'A administração é exclusiva dos dois responsáveis pelo site.')
    if (!await repository.changeRole(tx, id, role)) throw notFound('Usuário')
    return repository.findUserSummary(tx, id)
  })
}

export function removeUser(db: Database, actorId: number, id: number) {
  return db.transaction(async (tx) => {
    await lockAdminMembership(tx)
    await requireAdmin(tx, actorId)
    rejectSelf(actorId, id, 'excluir')
    const target = await repository.findUserSummary(tx, id)
    if (!target) throw notFound('Usuário')
    if (effectiveAdmin(target.email, target.isAdmin) || ownerEmail(target.email)) throw new HttpError(403, 'As contas dos responsáveis estão protegidas.')
    await repository.audit(tx, actorId, id, 'deleted')
    if (!await deleteUser(tx, id)) throw notFound('Usuário')
  })
}

/** Entrada operacional: permite criar o primeiro administrador, sem remover o último. */
export function setAdminByEmail(db: Database, email: string, role: boolean) {
  if (ownersOnly() && (!ownerEmail(email) || !role)) throw new HttpError(403, 'A administração é exclusiva dos dois responsáveis pelo site.')
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

export async function userDetail(db: Queryable, actorId: number, id: number) {
  await requireAdmin(db, actorId)
  const user = await repository.findUserSummary(db, id)
  if (!user) throw notFound('Usuário')
  return { ...user, isAdmin: effectiveAdmin(user.email, user.isAdmin), audit: await repository.history(db, id) }
}

export function updateUser(db: Database, actorId: number, id: number, input: { name?: string; blocked?: boolean; isAdmin?: boolean }) {
  if (input.isAdmin !== undefined) return changeRole(db, actorId, id, input.isAdmin)
  return db.transaction(async tx => {
    await lockAdminMembership(tx)
    await requireAdmin(tx, actorId)
    const user = await repository.findUserSummary(tx, id)
    if (!user) throw notFound('Usuário')
    if (id === actorId || effectiveAdmin(user.email, user.isAdmin) || ownerEmail(user.email)) throw new HttpError(403, 'As contas dos responsáveis estão protegidas.')
    if (input.name !== undefined && input.name !== user.name) {
      await repository.updateName(tx, id, input.name)
      await repository.audit(tx, actorId, id, 'name_changed')
    }
    if (input.blocked !== undefined && input.blocked !== user.blocked) {
      await repository.blockUser(tx, id, input.blocked)
      await repository.audit(tx, actorId, id, input.blocked ? 'blocked' : 'unblocked')
    }
    return repository.findUserSummary(tx, id)
  })
}

export function revokeUserSessions(db: Database, actorId: number, id: number) {
  return db.transaction(async tx => {
    await lockAdminMembership(tx)
    await requireAdmin(tx, actorId)
    const user = await repository.findUserSummary(tx, id)
    if (!user) throw notFound('Usuário')
    if (id === actorId || effectiveAdmin(user.email, user.isAdmin) || ownerEmail(user.email)) throw new HttpError(403, 'As contas dos responsáveis estão protegidas.')
    await repository.revokeSessions(tx, id)
    await repository.audit(tx, actorId, id, 'sessions_revoked')
  })
}
