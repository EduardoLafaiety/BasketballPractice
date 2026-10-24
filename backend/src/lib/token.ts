import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config.js'

export function signToken(userId: number) {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(userId),
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    const userId = typeof payload === 'object' ? Number(payload.sub) : NaN
    return Number.isInteger(userId) ? userId : null
  } catch {
    return null
  }
}
