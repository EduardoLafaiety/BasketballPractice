import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { describe, it } from 'node:test'
import type { Request, Response } from 'express'
import { limitarTentativas } from '../src/middleware/rate-limit.js'
import { startApi } from './http.js'

const { api, register } = await startApi({ limiteTentativas: { maximo: 3, janelaMs: 60_000 } })
// API separada para os outros testes: a de cima termina com o IP bloqueado.
const livre = await startApi()

describe('Limite de tentativas de login', () => {
  it('quem acerta não gasta tentativa; depois de 3 erros o IP espera, mesmo com a senha certa', async () => {
    const { email } = await register()
    const certo = { email, password: 'senha-segura' }
    for (let i = 0; i < 5; i++) assert.equal((await api('POST', '/auth/login', certo)).status, 200)

    for (let i = 0; i < 3; i++) assert.equal((await api('POST', '/auth/login', { email, password: 'errada' })).status, 401)
    const bloqueado = await api('POST', '/auth/login', certo)
    assert.equal(bloqueado.status, 429)
    assert.match(bloqueado.body.error, /Muitas tentativas/)
    // O cadastro divide o mesmo limite: quem estourou no login não consegue testar e-mails no cadastro.
    assert.equal((await api('POST', '/auth/register', { name: 'Outro', email: 'x@example.com', password: 'senha-segura' })).status, 429)
  })

  it('a janela expira e as tentativas voltam', () => {
    let agora = 0
    const limite = limitarTentativas({ maximo: 2, janelaMs: 1000 }, () => agora)
    const pedir = (status: number) => {
      const res = Object.assign(new EventEmitter(), { statusCode: status, headers: {} as Record<string, string>, setHeader(k: string, v: string) { this.headers[k] = v } })
      let passou = false
      try {
        limite({ ip: '1.2.3.4' } as Request, res as unknown as Response, () => { passou = true })
      } catch (erro) {
        return { passou, erro: erro as { status: number }, res }
      }
      res.emit('finish')
      return { passou, erro: null, res }
    }

    assert.equal(pedir(401).passou, true)
    assert.equal(pedir(401).passou, true)
    const barrado = pedir(200)
    assert.equal(barrado.erro?.status, 429)
    assert.equal(barrado.res.headers['Retry-After'], '1')

    agora = 999
    assert.equal(pedir(200).erro?.status, 429)
    agora = 1000
    assert.equal(pedir(200).passou, true)
  })
})

describe('Respostas', () => {
  it('saem comprimidas, com cabeçalhos de segurança e cache nos estilos', async () => {
    const { token } = await livre.register()
    const resposta = await fetch(`${livre.baseUrl}/health`)
    assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(resposta.headers.get('x-powered-by'), null)

    const estilos = await fetch(`${livre.baseUrl}/styles`, { headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'gzip' } })
    assert.equal(estilos.status, 200)
    assert.equal(estilos.headers.get('content-encoding'), 'gzip')
    assert.equal(estilos.headers.get('cache-control'), 'private, max-age=300')
  })
})
