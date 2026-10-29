import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/http-error.js'

const isClientError = (error: unknown): error is { status: number } => {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' && status >= 400 && status < 500
}

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
  // Erros do leitor de corpo do Express (ex.: 413 corpo grande demais) já trazem o status certo.
  if (isClientError(error)) {
    res.status(error.status).json({ error: error.status === 413 ? 'Dados grandes demais' : 'Requisição inválida' })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Erro interno do servidor' })
}
