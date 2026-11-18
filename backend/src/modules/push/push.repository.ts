import { many, one, type Queryable } from '../../db/index.js'
import type { SubscriptionInput } from './push.schema.js'
import type { PushSubscriptionRow } from './push.types.js'
import type { ReminderCandidate } from './push.model.js'

export async function lockSubscriptions(tx: Queryable, userId: number) {
  await tx.query('SELECT pg_advisory_xact_lock(4248, $1)', [userId])
}

export async function countOtherSubscriptions(tx: Queryable, userId: number, endpoint: string) {
  return (await one<{ n: number }>(tx,
    'SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE user_id = $1 AND endpoint <> $2', [userId, endpoint]))!.n
}

export async function saveSubscription(tx: Queryable, userId: number, input: SubscriptionInput) {
  await tx.query(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, tz_offset) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, tz_offset = EXCLUDED.tz_offset`,
  [userId, input.endpoint, input.keys.p256dh, input.keys.auth, input.tzOffset])
}

export async function unsubscribe(db: Queryable, userId: number, endpoint: string) {
  return (await db.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint])).rowCount
}

export function subscriptionsForUser(db: Queryable, userId: number) {
  return many<PushSubscriptionRow>(db, 'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId])
}

/** Não remove inscrição transferida ou renovada durante uma resposta lenta do provedor. */
export async function removeUnchangedSubscription(db: Queryable, userId: number, s: PushSubscriptionRow) {
  await db.query('DELETE FROM push_subscriptions WHERE id = $1 AND user_id = $2 AND endpoint = $3 AND p256dh = $4 AND auth = $5',
    [s.id, userId, s.endpoint, s.p256dh, s.auth])
}

export function reminderCandidates(db: Queryable, ids?: number[], lock = false) {
  return many<ReminderCandidate>(db,
    `SELECT p.id, p.endpoint, p.p256dh, p.auth, p.user_id AS "userId", p.tz_offset AS "tzOffset",
            to_char(p.last_reminder_on, 'YYYY-MM-DD') AS "lastReminderOn", s.data AS settings
     FROM push_subscriptions p JOIN user_settings s ON s.user_id = p.user_id
     WHERE s.data #> '{reminders,enabled}' = 'true'::jsonb
       AND ($1::int[] IS NULL OR p.id = ANY($1))${lock ? ' FOR UPDATE OF p' : ''}`, [ids ?? null])
}

export async function trainedSubscriptionIds(db: Queryable, ids: number[], now: Date) {
  return many<{ id: number }>(db,
    `SELECT DISTINCT p.id FROM push_subscriptions p JOIN practice_sessions s ON s.user_id = p.user_id
     WHERE p.id = ANY($1::int[]) AND (s.performed_at - make_interval(mins => p.tz_offset))::date = ($2::timestamptz - make_interval(mins => p.tz_offset))::date`,
    [ids, now.toISOString()])
}

export async function tryLockReminder(tx: Queryable, id: number) {
  return (await one<{ locked: boolean }>(tx, 'SELECT pg_try_advisory_xact_lock(4249, $1) AS locked', [id]))!.locked
}

export async function markReminder(tx: Queryable, id: number, localDay: string) {
  await tx.query('UPDATE push_subscriptions SET last_reminder_on = $1 WHERE id = $2', [localDay, id])
}
