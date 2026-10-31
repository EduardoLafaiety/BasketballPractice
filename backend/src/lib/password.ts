import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEY_LENGTH = 64

// Formato armazenado: scrypt$<salt hex>$<hash hex>
export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

// Login de e-mail sem conta faz a mesma conta do scrypt: pelo tempo da resposta, não dá para saber quem tem cadastro.
let decoy: Promise<string> | undefined
export function prepareDecoyHash() {
  decoy ??= hashPassword(randomBytes(32).toString('hex'))
  return decoy
}

export async function verifyAgainstDecoy(password: string) {
  await verifyPassword(password, await prepareDecoyHash())
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, saltHex, hashHex] = stored.split('$')
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false

  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(expected, actual)
}
