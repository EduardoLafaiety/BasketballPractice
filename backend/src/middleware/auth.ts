import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/http-error.js'
import { verifyToken } from '../lib/token.js'

declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? []
  const userId = scheme === 'Bearer' && token ? verifyToken(token) : null
  if (!userId) throw new HttpError(401, 'Não autenticado')

  req.userId = userId
  next()
}

// Use apenas em rotas protegidas por requireAuth.
export const currentUser = (req: Request) => req.userId!
