import { many, one, type Queryable } from './index.js'

/** Compartilhada por administração HTTP, exclusão pessoal e ferramenta operacional. */
export async function lockAdminMembership(tx: Queryable) {
  await tx.query('SELECT pg_advisory_xact_lock(4247)')
}

export async function isAdmin(db: Queryable, id: number) {
  return Boolean((await one<{ isAdmin: boolean }>(db, 'SELECT is_admin AS "isAdmin" FROM users WHERE id = $1', [id]))?.isAdmin)
}

export function adminIds(db: Queryable) {
  return many<{ id: number }>(db, 'SELECT id FROM users WHERE is_admin ORDER BY id')
}

export function tokenVersion(db: Queryable, id: number) {
  return one<{ version: number }>(db, 'SELECT token_version AS version FROM users WHERE id = $1', [id])
}
