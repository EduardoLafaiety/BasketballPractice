import { settingsSchema } from '../settings/settings.schema.js'
import type { PushSubscriptionRow } from './push.types.js'

export const REMINDER_WINDOW_MINUTES = 30
export type ReminderCandidate = PushSubscriptionRow & {
  userId: number; tzOffset: number; lastReminderOn: string | null; settings: unknown
}
export type DueReminder = PushSubscriptionRow & { userId: number; localDay: string }

export function reminderDue(row: ReminderCandidate, now: Date): DueReminder | null {
  const parsed = settingsSchema.safeParse(row.settings)
  if (!parsed.success || !parsed.data.reminders.enabled || !Number.isInteger(row.tzOffset) || Math.abs(row.tzOffset) > 840) return null
  const reminders = parsed.data.reminders
  const local = new Date(now.getTime() - row.tzOffset * 60_000)
  const localDay = local.toISOString().slice(0, 10)
  if (row.lastReminderOn === localDay || !reminders.days.includes(local.getUTCDay())) return null
  const [h, m] = reminders.time.split(':').map(Number)
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes() - (h * 60 + m)
  if (minutes < 0 || minutes >= REMINDER_WINDOW_MINUTES) return null
  return { id: row.id, endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth, userId: row.userId, localDay }
}
