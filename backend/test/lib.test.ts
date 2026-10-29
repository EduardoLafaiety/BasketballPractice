import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../src/config.js'
import { HttpError } from '../src/lib/http-error.js'
import { hashPassword, verifyPassword } from '../src/lib/password.js'
import { signToken, verifyToken } from '../src/lib/token.js'
import { isoDate, parse } from '../src/lib/validate.js'

describe('Senhas', () => {
  it('não guarda a senha e usa um sal diferente a cada hash', async () => {
    const first = await hashPassword('senha-segura')
    const second = await hashPassword('senha-segura')
    assert.match(first, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    assert.ok(!first.includes('senha-segura'))
    assert.notEqual(first, second)
    assert.equal(await verifyPassword('senha-segura', second), true)
  })

  it('recusa senha errada, com maiúsculas trocadas ou hash corrompido', async () => {
    const stored = await hashPassword('senha-segura')
    assert.equal(await verifyPassword('senha-errada', stored), false)
    assert.equal(await verifyPassword('SENHA-SEGURA', stored), false)
    assert.equal(await verifyPassword('senha-segura', stored.replace('scrypt', 'md5')), false)
    assert.equal(await verifyPassword('senha-segura', 'scrypt$$'), false)
    assert.equal(await verifyPassword('senha-segura', 'texto-qualquer'), false)
  })
})

describe('Tokens', () => {
  it('devolve o id de quem assinou', () => {
    assert.equal(verifyToken(signToken(42)), 42)
  })

  it('recusa token adulterado, vencido, de outro segredo ou sem id numérico', () => {
    const [header, , signature] = signToken(1).split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ sub: '2' })).toString('base64url')
    assert.equal(verifyToken(`${header}.${forgedPayload}.${signature}`), null)

    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, config.jwtSecret, { subject: '1' })
    assert.equal(verifyToken(expired), null)
    assert.equal(verifyToken(jwt.sign({}, 'outro-segredo', { subject: '1' })), null)
    assert.equal(verifyToken(jwt.sign({}, config.jwtSecret, { subject: 'admin' })), null)
    assert.equal(verifyToken(jwt.sign({}, config.jwtSecret)), null)
    // Algoritmo "none" (sem assinatura) é um ataque clássico contra JWT.
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`
    assert.equal(verifyToken(none), null)
    assert.equal(verifyToken('abc'), null)
  })
})

describe('Validação', () => {
  it('aceita dias reais do calendário, inclusive 29/02 em ano bissexto', () => {
    for (const valid of ['2028-02-29', '2026-12-31', '2026-10-22T23:30:00-03:00', '2026-10-22T10:00:00.000Z']) {
      assert.equal(isoDate.safeParse(valid).success, true, valid)
    }
  })

  it('recusa dias que não existem e textos que não são data', () => {
    for (const invalid of ['2026-02-29', '2026-02-31', '2026-04-31', '2026-13-01', '2026-00-10', '22/10/2026', 'ontem', '']) {
      assert.equal(isoDate.safeParse(invalid).success, false, invalid)
    }
  })

  it('transforma erro de validação em HTTP 400 com o erro de cada campo', () => {
    const schema = z.object({ name: z.string().min(2), age: z.number() })
    assert.deepEqual(parse(schema, { name: 'Ana', age: 20 }), { name: 'Ana', age: 20 })

    assert.throws(
      () => parse(schema, { name: 'A' }),
      (error) => {
        assert.ok(error instanceof HttpError)
        assert.equal(error.status, 400)
        assert.deepEqual(Object.keys(error.details as object).sort(), ['age', 'name'])
        return true
      },
    )
  })
})
