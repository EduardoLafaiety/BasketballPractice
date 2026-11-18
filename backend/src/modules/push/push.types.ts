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

