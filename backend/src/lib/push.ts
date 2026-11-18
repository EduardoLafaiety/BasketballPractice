import webpush from 'web-push'
import type { PushConfig, PushSender } from '../modules/push/push.types.js'
export type { PushConfig, PushSender, PushMessage, PushSubscriptionRow } from '../modules/push/push.types.js'

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
        { TTL: 6 * 60 * 60, urgency: 'normal', timeout: 10_000 },
      )
      return 'ok'
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) return 'gone'
      throw error
    }
  }
}

