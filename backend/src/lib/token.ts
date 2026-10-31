import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config.js'

// A versão vai no token e é comparada com a da conta a cada pedido: subir a da conta invalida tudo o que já foi emitido.
export function signToken(userId: number, version: number) {
  return jwt.sign({ tv: version }, config.jwtSecret, {
    subject: String(userId),
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): { userId: number; version: number } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    if (typeof payload !== 'object') return null
    const userId = Number(payload.sub)
    // Tokens emitidos antes da versão existir valem como a versão 0, a de toda conta na migração.
    const version: unknown = payload.tv ?? 0
    return Number.isInteger(userId) && Number.isInteger(version) ? { userId, version: version as number } : null
  } catch {
    return null
  }
}
