import { many, one, type Queryable } from '../../db/index.js'

export type AdminUser = {
  id: number
  name: string
  email: string
  isAdmin: boolean
  createdAt: Date
  workouts: number
  sessions: number
  lastSessionAt: Date | null
  blocked: boolean
  lastLoginAt: Date | null
  paidUntil: Date | null
  plan: string | null
  subscriptionStatus: string | null
}

const USER_SUMMARY = `
  SELECT u.id, u.name, u.email, u.is_admin AS "isAdmin", u.created_at AS "createdAt",
         (SELECT count(*)::int FROM workouts w WHERE w.user_id = u.id) AS workouts,
         (SELECT count(*)::int FROM practice_sessions s WHERE s.user_id = u.id) AS sessions,
         (SELECT max(s.performed_at) FROM practice_sessions s WHERE s.user_id = u.id) AS "lastSessionAt",
         u.blocked, u.last_login_at AS "lastLoginAt",
         (SELECT max(p.paid_until) FROM billing_payments p JOIN billing_subscriptions b ON b.id = p.subscription_id WHERE b.user_id = u.id AND p.status = 'approved') AS "paidUntil",
         (SELECT b.plan FROM billing_subscriptions b WHERE b.user_id = u.id ORDER BY b.created_at DESC, b.id DESC LIMIT 1) AS plan,
         (SELECT b.status FROM billing_subscriptions b WHERE b.user_id = u.id ORDER BY b.created_at DESC, b.id DESC LIMIT 1) AS "subscriptionStatus"
  FROM users u`

export function listUsers(db: Queryable) {
  return many<AdminUser>(db, USER_SUMMARY + ' ORDER BY u.created_at DESC')
}

export function findUserSummary(db: Queryable, id: number) {
  return one<AdminUser>(db, USER_SUMMARY + ' WHERE u.id = $1', [id])
}

export async function changeRole(tx: Queryable, id: number, isAdmin: boolean) {
  return one<{ id: number }>(tx, 'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id', [isAdmin, id])
}

export function findUserByEmail(tx: Queryable, email: string) {
  return one<{ id: number; name: string; isAdmin: boolean }>(tx,
    'SELECT id, name, is_admin AS "isAdmin" FROM users WHERE lower(email) = $1', [email])
}

export const audit = (tx: Queryable, actor: number, target: number, action: string) => tx.query(
  'INSERT INTO admin_audit (actor_id, target_id, action) VALUES ($1, $2, $3)', [actor, target, action])

export const history = (tx: Queryable, id: number) => many<{ id: number; action: string; actorName: string | null; createdAt: Date }>(tx,
  `SELECT a.id, a.action, u.name AS "actorName", a.created_at AS "createdAt" FROM admin_audit a
   LEFT JOIN users u ON u.id = a.actor_id WHERE a.target_id = $1 ORDER BY a.created_at DESC, a.id DESC LIMIT 20`, [id])

export const updateName = (tx: Queryable, id: number, name: string) => tx.query('UPDATE users SET name = $2 WHERE id = $1', [id, name])
export const blockUser = (tx: Queryable, id: number, blocked: boolean) => tx.query('UPDATE users SET blocked = $2, token_version = token_version + 1 WHERE id = $1', [id, blocked])
export const revokeSessions = (tx: Queryable, id: number) => tx.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [id])
export const provisioningCredentials = (tx: Queryable, email: string) => one<{ id: number; passwordHash: string }>(tx, 'SELECT id, password_hash AS "passwordHash" FROM users WHERE lower(email) = $1 FOR UPDATE', [email])
export const provisionExisting = (tx: Queryable, id: number, name: string, hash: string, changed: boolean) => tx.query('UPDATE users SET name = $2, is_admin = true, blocked = false, password_hash = $3, token_version = token_version + $4 WHERE id = $1', [id, name, hash, changed ? 1 : 0])
export const provisionNew = (tx: Queryable, name: string, email: string, hash: string) => tx.query('INSERT INTO users (name,email,password_hash,is_admin) VALUES ($1,$2,$3,true)', [name, email, hash])
export const clearPending = (tx: Queryable, email: string) => tx.query('DELETE FROM pending_registrations WHERE lower(email) = $1', [email])
export const clearResetLinks = (tx: Queryable, id: number) => tx.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [id])
