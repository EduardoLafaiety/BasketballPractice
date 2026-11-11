import webpush from 'web-push'
import { many, type Database } from '../db/index.js'

export interface PushConfig {
  publicKey: string
  privateKey: string
  subject: string
}

export interface PushSubscriptionRow {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushMessage {
  title: string
  body: string
  /** Caminho do site que a notificação abre ao ser tocada. */
  url?: string
  tag?: string
}

/** Envia uma mensagem a uma inscrição. Devolve 'gone' quando o navegador cancelou a inscrição (404/410). */
export type PushSender = (subscription: PushSubscriptionRow, message: PushMessage) => Promise<'ok' | 'gone'>

export const pushEnabled = (config: PushConfig) => !!(config.publicKey && config.privateKey && config.subject)

/** Envio de verdade, pelo protocolo Web Push com as chaves VAPID. */
export function createPushSender(config: PushConfig): PushSender | null {
  if (!pushEnabled(config)) return null
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return async (s, message) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(message),
        // Lembrete velho não serve: se o aparelho ficar 6 h desligado, a mensagem é descartada.
        { TTL: 6 * 60 * 60, urgency: 'normal' },
      )
      return 'ok'
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) return 'gone'
      throw error
    }
  }
}

/** Manda a mesma mensagem para todos os aparelhos do atleta; apaga as inscrições que o navegador cancelou. */
export async function sendToUser(db: Database, send: PushSender, userId: number, message: PushMessage) {
  const subscriptions = await many<PushSubscriptionRow>(db, 'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId])
  let sent = 0
  for (const s of subscriptions) {
    try {
      if ((await send(s, message)) === 'gone') await db.query('DELETE FROM push_subscriptions WHERE id = $1', [s.id])
      else sent++
    } catch (error) {
      console.warn('[push] envio falhou', (error as Error).message)
    }
  }
  return sent
}

/** Janela depois do horário escolhido em que o lembrete ainda sai (o agendador roda a cada poucos minutos). */
export const REMINDER_WINDOW_MINUTES = 30

/**
 * Lembretes devidos agora: inscrições de atletas com o lembrete ligado, no dia da semana escolhido, entre o horário e
 * 30 minutos depois (no fuso do aparelho), que ainda não receberam lembrete hoje e não treinaram hoje.
 */
export async function dueReminders(db: Database, now = new Date()) {
  const rows = await many<PushSubscriptionRow & { userId: number; tzOffset: number; lastReminderOn: string | null; settings: unknown }>(
    db,
    `SELECT p.id, p.endpoint, p.p256dh, p.auth, p.user_id AS "userId", p.tz_offset AS "tzOffset",
            to_char(p.last_reminder_on, 'YYYY-MM-DD') AS "lastReminderOn", s.data AS settings
     FROM push_subscriptions p JOIN user_settings s ON s.user_id = p.user_id
     WHERE (s.data -> 'reminders' ->> 'enabled')::boolean IS TRUE`,
  )
  const due: (PushSubscriptionRow & { userId: number; localDay: string })[] = []
  for (const r of rows) {
    const reminders = (r.settings as { reminders?: { time?: string; days?: number[] } }).reminders ?? {}
    const local = new Date(now.getTime() - r.tzOffset * 60_000)
    const localDay = local.toISOString().slice(0, 10)
    if (r.lastReminderOn === localDay) continue
    if (!(reminders.days ?? []).includes(local.getUTCDay())) continue
    const [h, m] = (reminders.time ?? '18:00').split(':').map(Number)
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes() - (h * 60 + m)
    if (minutes < 0 || minutes >= REMINDER_WINDOW_MINUTES) continue
    due.push({ id: r.id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth, userId: r.userId, localDay })
  }
  if (!due.length) return due

  // Quem já treinou hoje (no fuso de cada aparelho) não recebe.
  const trained = await many<{ id: number }>(
    db,
    `SELECT DISTINCT p.id FROM push_subscriptions p JOIN practice_sessions s ON s.user_id = p.user_id
     WHERE p.id = ANY($1::int[]) AND (s.performed_at - make_interval(mins => p.tz_offset))::date = ($2::timestamptz - make_interval(mins => p.tz_offset))::date`,
    [due.map((d) => d.id), now.toISOString()],
  )
  const skip = new Set(trained.map((t) => t.id))
  return due.filter((d) => !skip.has(d.id))
}

/** Uma rodada do agendador: manda os lembretes devidos e marca o dia de cada inscrição. */
export async function runReminders(db: Database, send: PushSender, now = new Date()) {
  const due = await dueReminders(db, now)
  let sent = 0
  for (const s of due) {
    try {
      const result = await send(s, { title: 'Hora do treino!', body: 'Sua sessão de hoje ainda não foi registrada. Bora pra quadra?', url: '/', tag: 'lembrete' })
      if (result === 'gone') await db.query('DELETE FROM push_subscriptions WHERE id = $1', [s.id])
      else {
        await db.query('UPDATE push_subscriptions SET last_reminder_on = $1 WHERE id = $2', [s.localDay, s.id])
        sent++
      }
    } catch (error) {
      console.warn('[push] lembrete não enviado', (error as Error).message)
    }
  }
  return { due: due.length, sent }
}

/** Roda o agendador a cada `everyMs` enquanto a API estiver de pé. Devolve a função que para. */
export function startReminderScheduler(db: Database, send: PushSender, everyMs = 5 * 60_000) {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      await runReminders(db, send)
    } catch (error) {
      console.error('[push] agendador falhou', error)
    } finally {
      running = false
    }
  }
  const timer = setInterval(tick, everyMs)
  timer.unref?.()
  void tick()
  return () => clearInterval(timer)
}

