import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import type { Database } from './db/index.js'
import { createEmailSender, type EmailSender } from './lib/email.js'
import { createPushSender, type PushSender } from './lib/push.js'
import { requireAdmin, requireAuth } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { emailDoLogin, limitarTentativas, type LimiteTentativas } from './middleware/rate-limit.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { dataRouter } from './modules/data/data.routes.js'
import { exercisesRouter } from './modules/exercises/exercises.routes.js'
import { plansRouter } from './modules/plans/plans.routes.js'
import { programsRouter } from './modules/programs/programs.routes.js'
import { pushCronRouter, pushRouter } from './modules/push/push.routes.js'
import { sessionsRouter } from './modules/sessions/sessions.routes.js'
import { settingsRouter } from './modules/settings/settings.routes.js'
import { stylesRouter } from './modules/styles/styles.routes.js'
import { workoutsRouter } from './modules/workouts/workouts.routes.js'
import { routineRouter } from './modules/routine/routine.routes.js'
import { observabilidade, type ObservarHttp } from './middleware/observabilidade.js'
import { createBillingService, type BillingOptions } from './modules/billing/billing.service.js'
import { billingRouter, billingWebhook, requireBillingAccess } from './modules/billing/billing.routes.js'

export interface AppOptions {
  billing?: BillingOptions
  observarHttp?: ObservarHttp
  limiteTentativas?: LimiteTentativas
  limiteConta?: LimiteTentativas
  limiteCadastros?: LimiteTentativas
  limiteRecuperacao?: LimiteTentativas
  limiteEnvios?: LimiteTentativas
  maxImports?: number
  emails?: EmailSender
  /** Recebe cada envio em segundo plano; os testes usam para esperar o e-mail sair. */
  segundoPlano?: (tarefa: Promise<void>) => void
  /** Web Push: chave pública VAPID, quem envia (null = desligado) e o segredo do agendador externo. */
  push?: { publicKey: string; send: PushSender | null; cronSecret?: string }
}

export function createApp(
  db: Database,
  {
    limiteTentativas = { maximo: config.authAttempts, janelaMs: 15 * 60_000 },
    limiteConta = { maximo: config.accountAttempts, janelaMs: 15 * 60_000 },
    limiteCadastros = { maximo: config.registrationsPerHour, janelaMs: 60 * 60_000 },
    limiteRecuperacao = { maximo: config.recoveryRequestsPerHour, janelaMs: 60 * 60_000 },
    limiteEnvios = { maximo: config.emailsPerAddressPerHour, janelaMs: 60 * 60_000 },
    maxImports = config.maxImports,
    emails = createEmailSender(config.email),
    segundoPlano,
    observarHttp = process.env.NODE_ENV === 'production' ? (evento) => console.info(JSON.stringify(evento)) : undefined,
    push = { publicKey: config.push.publicKey, send: createPushSender(config.push), cronSecret: config.push.cronSecret },
    billing: billingOptions = { ...config.billing, appUrl: config.appUrl },
  }: AppOptions = {},
) {
  const app = express()
  const auth = requireAuth(db)
  const billing = createBillingService(db, billingOptions)
  const paid = requireBillingAccess(billing)

  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)
  app.use(observabilidade(observarHttp))
  // Não deixa respostas autenticadas (nem recusas) serem reutilizadas após sair ou vencer o acesso.
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() })
  // Cabeçalhos de segurança; a API só responde JSON, então a política de conteúdo pode ser a mais fechada.
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } }))
  // Respostas comprimidas (gzip/brotli): desempenho, backup e listas chegam bem menores.
  app.use(compression())
  app.use(cors({ origin: config.corsOrigins }))
  // Restaurar um backup também grava treinos/sessões: exige pagamento antes de ler o arquivo grande.
  // A exportação dos próprios dados continua disponível ao titular mesmo sem assinatura.
  app.post('/api/data/import', auth, paid)
  // O backup importado pode ter anos de sessões; o resto da API fica no limite pequeno.
  app.use('/api/data/import', express.json({ limit: '10mb' }))
  app.use('/api/auth/avatar', express.json({ limit: '400kb' }))
  app.use(express.json({ limit: '100kb' }))
  app.use('/api/billing/webhook', billingWebhook(billing))
  const billingLimit = limitarTentativas({ maximo: 20, janelaMs: 60_000 })
  app.use('/api/billing', auth, billingLimit, billingRouter(billing))

  app.get('/api/live', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ status: 'ok' })
  })

  app.get('/api/health', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    try {
      await db.query('SELECT 1')
      res.json({ status: 'ok' })
    } catch {
      res.status(503).json({ status: 'unavailable', error: 'Banco de dados indisponível' })
    }
  })

  // Login e cadastro: cada IP tem um número limitado de tentativas erradas.
  const tentativas = limitarTentativas(limiteTentativas)
  // Trocar de IP não renova os palpites contra uma conta, e o IP não cria contas sem fim.
  // Qualquer um pode esgotar o limite de uma conta alheia; a saída do dono é recuperar a senha, que zera a contagem.
  const porConta = limitarTentativas({
    ...limiteConta,
    chave: emailDoLogin,
    conta: (status) => status === 401,
    mensagem: (minutos) => `Muitas tentativas nesta conta. Recupere a senha para entrar agora ou tente de novo em ${minutos} min.`,
  })
  const cadastros = limitarTentativas({ ...limiteCadastros, conta: (status) => status === 202 })
  // Recuperar a senha tem contagem própria: quem estourou o limite do login ainda precisa conseguir sair por aqui.
  const recuperacoes = limitarTentativas({ ...limiteRecuperacao, conta: (status) => status === 202 })
  const links = limitarTentativas(limiteTentativas)
  app.use('/api/auth/login', tentativas, porConta)
  app.use('/api/auth/register', tentativas, cadastros)
  app.use('/api/auth/forgot-password', recuperacoes)
  app.use(['/api/auth/confirm', '/api/auth/reset-password'], links)
  app.use(
    '/api/auth',
    authRouter(db, {
      emails,
      appUrl: config.appUrl,
      limiteSenhaAtual: limiteConta,
      limiteEnvios,
      segundoPlano,
      aoRedefinirSenha: porConta.liberar,
      billingAccess: billing.access,
    }),
  )
  app.use('/api/exercises', auth, paid, exercisesRouter(db))
  app.use('/api/workouts', auth, paid, workoutsRouter(db))
  app.use('/api/routine', auth, paid, routineRouter(db))
  app.use('/api/sessions', auth, paid, sessionsRouter(db))
  app.use('/api/plans', auth, paid, plansRouter(db))
  app.use('/api/programs', auth, paid, programsRouter(db))
  app.use('/api/push/run', pushCronRouter(db, { secret: push.cronSecret ?? '', send: push.send }))
  app.use('/api/push', auth, paid, pushRouter(db, push))
  app.use('/api/styles', auth, paid, stylesRouter(db))
  app.use('/api/settings', auth, settingsRouter(db))
  app.use('/api/data', auth, dataRouter(db, { maxImports }))
  app.use('/api/admin', auth, requireAdmin(db), adminRouter(db))

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
