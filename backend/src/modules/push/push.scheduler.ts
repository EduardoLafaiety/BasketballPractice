import type { Database } from '../../db/index.js'
import type { PushSender } from './push.types.js'
import { runReminders } from './push.service.js'

/** Parar impede novos envios e aguarda o aparelho em andamento antes de liberar o banco. */
export function startReminderScheduler(db: Database, send: PushSender, everyMs = 5 * 60_000, now = () => new Date()) {
  let stopped = false
  let running: Promise<unknown> | undefined
  const tick = () => {
    if (stopped || running) return
    running = runReminders(db, send, now(), () => !stopped)
      .catch((error) => { console.error('[push] agendador falhou', error) })
      .finally(() => { running = undefined })
  }
  const timer = setInterval(tick, everyMs)
  timer.unref?.()
  tick()
  return async () => { stopped = true; clearInterval(timer); await running }
}

