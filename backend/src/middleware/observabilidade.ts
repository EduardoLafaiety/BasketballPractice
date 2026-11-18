import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

export interface EventoHttp {
  evento: 'http'
  requestId: string
  metodo: string
  recurso: string
  status: number
  duracaoMs: number
}
export type ObservarHttp = (evento: EventoHttp) => void

/** Identificadores são gerados no servidor; caminhos arbitrários e dados pessoais ficam fora dos logs. */
export function observabilidade(observar?: ObservarHttp): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID()
    const inicio = performance.now()
    const recurso = /^\/api\/(auth|admin|data|exercises|workouts|routine|sessions|plans|programs|push|styles|settings|live|health)(?:\/|$)/.exec(req.path)?.[1] ?? 'unmatched'
    res.setHeader('X-Request-Id', requestId)
    res.on('finish', () => {
      try { observar?.({ evento: 'http', requestId, metodo: req.method, recurso, status: res.statusCode, duracaoMs: Math.round(performance.now() - inicio) }) }
      catch { /* Uma falha no coletor não pode derrubar a API. */ }
    })
    next()
  }
}
