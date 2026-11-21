import { many, one, type Queryable } from './index.js'
import { effectiveAdmin } from '../lib/admin-owners.js'

/** Compartilhada por administração HTTP, exclusão pessoal e ferramenta operacional. */
export async function lockAdminMembership(tx: Queryable) {
  await tx.query('SELECT pg_advisory_xact_lock(4247)')
}

export async function isAdmin(db: Queryable, id: number) {
  const user = await one<{ isAdmin: boolean; email: string; blocked: boolean }>(db, 'SELECT is_admin AS "isAdmin", email, blocked FROM users WHERE id = $1', [id])
  return Boolean(user && !user.blocked && effectiveAdmin(user.email, user.isAdmin))
}

export function adminIds(db: Queryable) {
  return many<{ id: number }>(db, 'SELECT id FROM users WHERE is_admin ORDER BY id')
}

export function tokenVersion(db: Queryable, id: number) {
  return one<{ version: number }>(db, 'SELECT token_version AS version FROM users WHERE id = $1 AND NOT blocked', [id])
}
