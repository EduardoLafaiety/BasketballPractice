import type { NextFunction, Request, Response } from 'express'
import type { Database } from '../db/index.js'
import { isAdmin, tokenVersion } from '../db/account-access.js'
import { HttpError } from '../lib/http-error.js'
import { verifyToken } from '../lib/token.js'

declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

// Confere no banco se a conta ainda existe e se o token não foi revogado: sair, trocar ou recuperar a senha vale na hora.
export function requireAuth(db: Database) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? []
    const session = scheme === 'Bearer' && token ? verifyToken(token) : null
    const user =
      session && (await tokenVersion(db, session.userId))
    if (!session || user?.version !== session.version) {
      throw new HttpError(401, 'Não autenticado')
    }

    req.userId = session.userId
    next()
  }
}

// Use apenas em rotas protegidas por requireAuth.
export const currentUser = (req: Request) => req.userId!

// Consulta o banco a cada pedido: quem perde o papel de admin perde o acesso na hora, sem esperar o token expirar.
export function requireAdmin(db: Database) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!await isAdmin(db, currentUser(req))) throw new HttpError(403, 'Acesso restrito a administradores')
    next()
  }
}
