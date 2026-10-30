import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/http-error.js'

export interface LimiteTentativas {
  /** Quantas tentativas erradas cada IP pode fazer dentro da janela. */
  maximo: number
  janelaMs: number
}

/**
 * Freia quem erra demais: conta só as respostas de erro (senha errada, e-mail já cadastrado…) por IP.
 * Quem acerta não gasta tentativa, então um atleta que entra normalmente nunca é bloqueado.
 * Fica em memória: basta para uma instância só; com várias, o certo é guardar a contagem no banco ou no Redis.
 */
export function limitarTentativas({ maximo, janelaMs }: LimiteTentativas, agora = () => Date.now()) {
  const contagem = new Map<string, { erros: number; inicio: number }>()

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? 'desconhecido'
    const t = agora()
    if (contagem.size > 10_000) for (const [chave, v] of contagem) if (t - v.inicio >= janelaMs) contagem.delete(chave)

    let atual = contagem.get(ip)
    if (atual && t - atual.inicio >= janelaMs) atual = undefined
    if (atual && atual.erros >= maximo) {
      const segundos = Math.ceil((atual.inicio + janelaMs - t) / 1000)
      res.setHeader('Retry-After', String(segundos))
      throw new HttpError(429, `Muitas tentativas. Tente de novo em ${Math.ceil(segundos / 60)} min.`)
    }

    res.on('finish', () => {
      if (res.statusCode < 400 || res.statusCode === 429) return
      const registro = contagem.get(ip)
      if (registro && agora() - registro.inicio < janelaMs) registro.erros++
      else contagem.set(ip, { erros: 1, inicio: agora() })
    })
    next()
  }
}
