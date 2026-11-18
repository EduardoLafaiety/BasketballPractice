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
}

const USER_SUMMARY = `
  SELECT u.id, u.name, u.email, u.is_admin AS "isAdmin", u.created_at AS "createdAt",
         (SELECT count(*)::int FROM workouts w WHERE w.user_id = u.id) AS workouts,
         (SELECT count(*)::int FROM practice_sessions s WHERE s.user_id = u.id) AS sessions,
         (SELECT max(s.performed_at) FROM practice_sessions s WHERE s.user_id = u.id) AS "lastSessionAt"
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
