import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import type { Database } from './db/index.js'
import { createEmailSender, type EmailSender } from './lib/email.js'
import { createPushSender, sendToUser, type PushSender } from './lib/push.js'
import { requireAdmin, requireAuth } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { emailDoLogin, limitarTentativas, type LimiteTentativas } from './middleware/rate-limit.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { cardRouter } from './routes/card.js'
import { dataRouter } from './routes/data.js'
import { exercisesRouter } from './routes/exercises.js'
import { gamesRouter } from './routes/games.js'
import { goalsRouter } from './routes/goals.js'
import { newsRouter } from './routes/news.js'
import { plansRouter } from './routes/plans.js'
import { playsRouter } from './routes/plays.js'
import { programsRouter } from './routes/programs.js'
import { pushCronRouter, pushRouter } from './routes/push.js'
import { sessionsRouter } from './routes/sessions.js'
import { settingsRouter } from './routes/settings.js'
import { socialRouter } from './routes/social.js'
import { statsRouter } from './routes/stats.js'
import { teamsRouter } from './routes/teams.js'
import { stylesRouter } from './routes/styles.js'
import { testsRouter } from './routes/tests.js'
import { workoutsRouter } from './routes/workouts.js'

export interface AppOptions {
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
    push = { publicKey: config.push.publicKey, send: createPushSender(config.push), cronSecret: config.push.cronSecret },
  }: AppOptions = {},
) {
  const app = express()
  const auth = requireAuth(db)

  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)
  // Cabeçalhos de segurança; a API só responde JSON, então a política de conteúdo pode ser a mais fechada.
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } }))
  // Respostas comprimidas (gzip/brotli): desempenho, backup e listas chegam bem menores.
  app.use(compression())
  app.use(cors({ origin: config.corsOrigin }))
  // O backup importado pode ter anos de sessões; o resto da API fica no limite pequeno.
  app.use('/api/data/import', express.json({ limit: '10mb' }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', async (_req, res) => {
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
    }),
  )
  app.use('/api/exercises', auth, exercisesRouter(db))
  app.use('/api/workouts', auth, workoutsRouter(db))
  app.use('/api/sessions', auth, sessionsRouter(db))
  app.use('/api/stats', auth, statsRouter(db))
  app.use('/api/goals', auth, goalsRouter(db))
  app.use('/api/card', auth, cardRouter(db))
  app.use('/api/tests', auth, testsRouter(db))
  app.use('/api/plans', auth, plansRouter(db))
  app.use('/api/programs', auth, programsRouter(db))
  app.use('/api/plays', auth, playsRouter(db))
  app.use('/api/games', auth, gamesRouter(db))
  // Avisos no celular (desafio recebido, aceito…) saem em segundo plano: uma falha no push não derruba o pedido.
  const notificar = push.send
    ? (userId: number, message: Parameters<PushSender>[1]) => {
        const tarefa = sendToUser(db, push.send!, userId, message).then(() => undefined, () => undefined)
        segundoPlano?.(tarefa)
      }
    : undefined
  app.use('/api/social', auth, socialRouter(db, { notificar }))
  app.use('/api/push/run', pushCronRouter(db, { secret: push.cronSecret ?? '', send: push.send }))
  app.use('/api/push', auth, pushRouter(db, push))
  app.use('/api/teams', auth, teamsRouter(db))
  app.use('/api/styles', auth, stylesRouter(db))
  app.use('/api/settings', auth, settingsRouter(db))
  app.use('/api/data', auth, dataRouter(db, { maxImports }))
  app.use('/api/news', auth, newsRouter(db))
  app.use('/api/admin', auth, requireAdmin(db), adminRouter(db))

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
