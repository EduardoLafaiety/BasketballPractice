import type { NextFunction, Request, Response } from 'express'
import { one, type Database } from '../db/index.js'
import { HttpError } from '../lib/http-error.js'
import { verifyToken } from '../lib/token.js'

declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

// Confere também se a conta ainda existe: o token de quem foi excluído vale até expirar, mas não dá mais acesso.
export function requireAuth(db: Database) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? []
    const userId = scheme === 'Bearer' && token ? verifyToken(token) : null
    if (!userId || !(await one(db, 'SELECT 1 FROM users WHERE id = $1', [userId]))) {
      throw new HttpError(401, 'Não autenticado')
    }

    req.userId = userId
    next()
  }
}

// Use apenas em rotas protegidas por requireAuth.
export const currentUser = (req: Request) => req.userId!

// Consulta o banco a cada pedido: quem perde o papel de admin perde o acesso na hora, sem esperar o token expirar.
export function requireAdmin(db: Database) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = await one<{ isAdmin: boolean }>(db, 'SELECT is_admin AS "isAdmin" FROM users WHERE id = $1', [
      currentUser(req),
    ])
    if (!user?.isAdmin) throw new HttpError(403, 'Acesso restrito a administradores')
    next()
  }
}
