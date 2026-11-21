import { one, type Queryable } from '../../db/index.js'

export interface UserRow {
  id: number; name: string; email: string; isAdmin: boolean; createdAt: Date; tokenVersion: number; avatarUrl: string | null; blocked: boolean
}
export type CredentialRow = UserRow & { passwordHash: string }
export interface PendingRegistration { name: string; email: string; passwordHash: string }

const USER_COLUMNS = `id, name, email, is_admin AS "isAdmin", created_at AS "createdAt", token_version AS "tokenVersion", avatar_url AS "avatarUrl", blocked`

export async function updateAvatar(db: Queryable, userId: number, avatarUrl: string | null) {
  return (await db.query('UPDATE users SET avatar_url = $2 WHERE id = $1 RETURNING id', [userId, avatarUrl])).rowCount > 0
}

export function findUser(db: Queryable, id: number) {
  return one<UserRow>(db, `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])
}

export function credentialsByEmail(db: Queryable, email: string) {
  return one<CredentialRow>(db, `SELECT ${USER_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE lower(email) = $1`, [email])
}

export async function emailExists(db: Queryable, email: string) {
  return Boolean(await one(db, 'SELECT 1 FROM users WHERE lower(email) = $1', [email]))
}

export function resetRecipient(db: Queryable, email: string) {
  return one<{ id: number; email: string }>(db, 'SELECT id, email FROM users WHERE lower(email) = $1', [email])
}

export function credentialsById(db: Queryable, id: number, lock = false) {
  return one<CredentialRow>(db,
    `SELECT ${USER_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE id = $1${lock ? ' FOR UPDATE' : ''}`, [id])
}

export function findPendingRegistration(db: Queryable, tokenHash: string) {
  return one<PendingRegistration>(db,
    'SELECT name, email, password_hash AS "passwordHash" FROM pending_registrations WHERE token_hash = $1 AND expires_at > now()', [tokenHash])
}

export async function saveRegistration(db: Queryable, tokenHash: string, pending: PendingRegistration, hours: number) {
  await db.query('DELETE FROM pending_registrations WHERE expires_at <= now()')
  await db.query(`INSERT INTO pending_registrations (token_hash, name, email, password_hash, expires_at)
    VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5::int))`,
  [tokenHash, pending.name, pending.email, pending.passwordHash, hours])
}

export async function activateRegistration(tx: Queryable, tokenHash: string, pending: PendingRegistration) {
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [pending.email])
  if (!(await tx.query('DELETE FROM pending_registrations WHERE token_hash = $1', [tokenHash])).rowCount) return undefined
  await tx.query('DELETE FROM pending_registrations WHERE email = $1', [pending.email])
  return one<UserRow>(tx, `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
    ON CONFLICT (lower(email)) DO NOTHING RETURNING ${USER_COLUMNS}`, [pending.name, pending.email, pending.passwordHash])
}

export async function saveResetLink(db: Queryable, tokenHash: string, userId: number, minutes: number) {
  await db.query('DELETE FROM password_reset_tokens WHERE expires_at <= now()')
  await db.query(`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
    VALUES ($1, $2, now() + make_interval(mins => $3::int))`, [tokenHash, userId, minutes])
}

export function resetLinkOwner(tx: Queryable, tokenHash: string) {
  return one<{ userId: number }>(tx, 'SELECT user_id AS "userId" FROM password_reset_tokens WHERE token_hash = $1', [tokenHash])
}

export function consumeResetLink(tx: Queryable, tokenHash: string) {
  return one<{ userId: number; valid: boolean }>(tx,
    'DELETE FROM password_reset_tokens WHERE token_hash = $1 RETURNING user_id AS "userId", expires_at > now() AS valid', [tokenHash])
}

export async function clearResetLinks(tx: Queryable, userId: number) {
  await tx.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId])
}

export function updatePassword(tx: Queryable, userId: number, passwordHash: string) {
  return one<UserRow>(tx, `UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING ${USER_COLUMNS}`, [passwordHash, userId])
}

export async function revokeTokens(db: Queryable, userId: number) {
  await db.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId])
}

export const recordLogin = (tx: Queryable, id: number) => tx.query('UPDATE users SET last_login_at = now() WHERE id = $1', [id])
