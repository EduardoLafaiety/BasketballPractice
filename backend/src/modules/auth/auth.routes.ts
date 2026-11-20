import { Router, type Request } from 'express'
import type { Database } from '../../db/index.js'
import { parse } from '../../lib/validate.js'
import { currentUser, requireAuth } from '../../middleware/auth.js'
import { limitarEnvios, limitarTentativas, type LimiteTentativas } from '../../middleware/rate-limit.js'
import { avatarSchema, changeSchema, confirmSchema, deleteSchema, forgotSchema, loginSchema, registerSchema, resetSchema } from './auth.schema.js'
import { createAuthService, FORGOT_RECEIVED, REGISTER_RECEIVED, type AuthServiceOptions } from './auth.service.js'

export interface AuthOptions extends Omit<AuthServiceOptions, 'podeEnviar'> {
  billingAccess?: (id: number) => Promise<{ required: boolean; hasAccess: boolean }>
  limiteSenhaAtual: LimiteTentativas
  limiteEnvios: LimiteTentativas
}

export function authRouter(db: Database, { limiteSenhaAtual, limiteEnvios, billingAccess, ...options }: AuthOptions) {
  const router = Router()
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() })
  const accounts = createAuthService(db, { ...options, podeEnviar: limitarEnvios(limiteEnvios) })
  const auth = requireAuth(db)
  const decorate = async <T extends { id: number }>(user: T) => billingAccess ? { ...user, billing: await billingAccess(user.id) } : user
  const session = async <T extends { user: { id: number } }>(result: T) => ({ ...result, user: await decorate(result.user) })
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
    res.status(201).json(await session(await accounts.confirm(parse(confirmSchema, req.body))))
  })
  router.post('/login', async (req, res) => {
    res.json(await session(await accounts.login(parse(loginSchema, req.body))))
  })
  router.post('/forgot-password', async (req, res) => {
    const body = parse(forgotSchema, req.body)
    res.status(202).json({ message: FORGOT_RECEIVED })
    accounts.dispatchReset(body.email)
  })
  router.post('/reset-password', async (req, res) => {
    res.json(await session(await accounts.resetPassword(parse(resetSchema, req.body))))
  })
  router.get('/me', auth, async (req, res) => {
    res.json(await decorate(await accounts.getMe(currentUser(req))))
  })
  const limitAvatar = limitarTentativas({ maximo: 20, janelaMs: 3600_000, chave: req => String(currentUser(req)) })
  router.put('/avatar', auth, limitAvatar, async (req, res) => {
    const { image } = parse(avatarSchema, req.body)
    res.json(await accounts.setAvatar(currentUser(req), image))
  })
  router.delete('/avatar', auth, limitAvatar, async (req, res) => {
    res.json(await accounts.setAvatar(currentUser(req), null))
  })
  router.post('/logout', auth, async (req, res) => {
    await accounts.logout(currentUser(req))
    res.status(204).end()
  })
  router.put('/password', auth, senhaAtual, async (req, res) => {
    res.json(await session(await accounts.changePassword(currentUser(req), parse(changeSchema, req.body))))
  })
  router.delete('/me', auth, senhaAtual, async (req, res) => {
    const { password } = parse(deleteSchema, req.body)
    await accounts.deleteMe(currentUser(req), password)
    res.status(204).end()
  })
  return router
}
