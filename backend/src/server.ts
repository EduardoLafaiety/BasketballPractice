import { createApp } from './app.js'
import { config } from './config.js'
import { openDatabase } from './db/index.js'
import { createPushSender, startReminderScheduler } from './lib/push.js'

if (!config.email.provider) {
  console.warn('[e-mail] EMAIL_PROVIDER vazio: confirmação de cadastro e recuperação de senha NÃO serão enviadas. Ninguém consegue ativar conta nova.')
}
const db = await openDatabase(config.databaseUrl)
// Lembretes por Web Push: o agendador roda enquanto a API estiver de pé (veja PUSH_CRON_SECRET para o plano que dorme).
const pushSender = createPushSender(config.push)
if (!pushSender) console.warn('[push] VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou VAPID_SUBJECT vazios: lembretes por notificação desligados.')
const stopReminders = pushSender ? startReminderScheduler(db, pushSender) : () => {}
const server = createApp(db, { push: { publicKey: config.push.publicKey, send: pushSender, cronSecret: config.push.cronSecret } }).listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}/api`)
})

function shutdown() {
  stopReminders()
  server.close(async () => {
    await db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
