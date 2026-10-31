import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import type { Database } from './db/index.js'
import { requireAdmin, requireAuth } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { emailDoLogin, limitarTentativas, type LimiteTentativas } from './middleware/rate-limit.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { dataRouter } from './routes/data.js'
import { exercisesRouter } from './routes/exercises.js'
import { goalsRouter } from './routes/goals.js'
import { newsRouter } from './routes/news.js'
import { plansRouter } from './routes/plans.js'
import { sessionsRouter } from './routes/sessions.js'
import { settingsRouter } from './routes/settings.js'
import { statsRouter } from './routes/stats.js'
import { stylesRouter } from './routes/styles.js'
import { testsRouter } from './routes/tests.js'
import { workoutsRouter } from './routes/workouts.js'

export interface AppOptions {
  limiteTentativas?: LimiteTentativas
  limiteConta?: LimiteTentativas
  limiteCadastros?: LimiteTentativas
  maxImports?: number
}

export function createApp(
  db: Database,
  {
    limiteTentativas = { maximo: config.authAttempts, janelaMs: 15 * 60_000 },
    limiteConta = { maximo: config.accountAttempts, janelaMs: 15 * 60_000 },
    limiteCadastros = { maximo: config.registrationsPerHour, janelaMs: 60 * 60_000 },
    maxImports = config.maxImports,
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
  const porConta = limitarTentativas({ ...limiteConta, chave: emailDoLogin, conta: (status) => status === 401 })
  const cadastros = limitarTentativas({ ...limiteCadastros, conta: (status) => status === 201 })
  app.use('/api/auth/login', tentativas, porConta)
  app.use('/api/auth/register', tentativas, cadastros)
  app.use('/api/auth', authRouter(db))
  app.use('/api/exercises', auth, exercisesRouter(db))
  app.use('/api/workouts', auth, workoutsRouter(db))
  app.use('/api/sessions', auth, sessionsRouter(db))
  app.use('/api/stats', auth, statsRouter(db))
  app.use('/api/goals', auth, goalsRouter(db))
  app.use('/api/tests', auth, testsRouter(db))
  app.use('/api/plans', auth, plansRouter(db))
  app.use('/api/styles', auth, stylesRouter(db))
  app.use('/api/settings', auth, settingsRouter(db))
  app.use('/api/data', auth, dataRouter(db, { maxImports }))
  app.use('/api/news', auth, newsRouter(db))
  app.use('/api/admin', auth, requireAdmin(db), adminRouter(db))

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
