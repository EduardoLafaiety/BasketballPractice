import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/http-error.js'

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Rota não encontrada' })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details })
    return
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'JSON inválido' })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Erro interno do servidor' })
}
