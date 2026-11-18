import { Router, type Request } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser, requireAuth } from '../../middleware/auth.js'
import { limitarEnvios, limitarTentativas, type LimiteTentativas } from '../../middleware/rate-limit.js'
import { changeSchema, confirmSchema, deleteSchema, forgotSchema, loginSchema, registerSchema, resetSchema } from './auth.schema.js'
import { createAuthService, FORGOT_RECEIVED, REGISTER_RECEIVED, type AuthServiceOptions } from './auth.service.js'

export interface AuthOptions extends Omit<AuthServiceOptions, 'podeEnviar'> {
  limiteSenhaAtual: LimiteTentativas
  limiteEnvios: LimiteTentativas
}

export function authRouter(db: Database, { limiteSenhaAtual, limiteEnvios, ...options }: AuthOptions) {
  const router = Router()
  const accounts = createAuthService(db, { ...options, podeEnviar: limitarEnvios(limiteEnvios) })
  const auth = requireAuth(db)
  const senhaAtual = limitarTentativas({
    ...limiteSenhaAtual,
    chave: (req: Request) => String(currentUser(req)),
    conta: (status) => status === 403,
  })
  router.post('/register', async (req, res) => {
    const pending = await accounts.prepareRegistration(parse(registerSchema, req.body))
    res.status(202).json({ message: REGISTER_RECEIVED })
    accounts.dispatchRegistration(pending)
  })
  router.post('/confirm', async (req, res) => {
    res.status(201).json(await accounts.confirm(parse(confirmSchema, req.body)))
  })
  router.post('/login', async (req, res) => {
    res.json(await accounts.login(parse(loginSchema, req.body)))
  })
  router.post('/forgot-password', async (req, res) => {
    const body = parse(forgotSchema, req.body)
    res.status(202).json({ message: FORGOT_RECEIVED })
    accounts.dispatchReset(body.email)
  })
  router.post('/reset-password', async (req, res) => {
    res.json(await accounts.resetPassword(parse(resetSchema, req.body)))
  })
  router.get('/me', auth, async (req, res) => {
    res.json(await accounts.getMe(currentUser(req)))
  })
  router.post('/logout', auth, async (req, res) => {
    await accounts.logout(currentUser(req))
    res.status(204).end()
  })
  router.put('/password', auth, senhaAtual, async (req, res) => {
    res.json(await accounts.changePassword(currentUser(req), parse(changeSchema, req.body)))
  })
  router.delete('/me', auth, senhaAtual, async (req, res) => {
    const { password } = parse(deleteSchema, req.body)
    await accounts.deleteMe(currentUser(req), password)
    res.status(204).end()
  })
  return router
}
