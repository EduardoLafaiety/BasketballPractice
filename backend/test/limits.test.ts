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
      res.emit('close')
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

describe('Limite por conta e de cadastros', () => {
  const folga = { maximo: 1000, janelaMs: 60_000 }

  it('palpites contra uma conta param no limite dela, sem travar outra conta nem contar outro erro', async () => {
    const app = await startApi({ limiteTentativas: folga, limiteConta: { maximo: 3, janelaMs: 60_000 } })
    const alvo = await app.register()
    const outra = await app.register()
    const errada = { email: alvo.email, password: 'palpite-errado' }

    // Validação recusada não é palpite de senha.
    for (let i = 0; i < 5; i++) assert.equal((await app.api('POST', '/auth/login', { email: alvo.email })).status, 400)
    assert.equal((await app.api('POST', '/auth/login', { email: alvo.email, password: 'senha-segura' })).status, 200)

    for (let i = 0; i < 3; i++) assert.equal((await app.api('POST', '/auth/login', errada)).status, 401)
    // Maiúsculas e espaços não abrem outra contagem, e a senha certa também espera.
    const variacao = { email: `  ${alvo.email.toUpperCase()} `, password: 'senha-segura' }
    assert.equal((await app.api('POST', '/auth/login', variacao)).status, 429)
    assert.equal((await app.api('POST', '/auth/login', { email: outra.email, password: 'senha-segura' })).status, 200)
  })

  it('e-mail sem conta tem o mesmo limite: o 429 não revela quem está cadastrado', async () => {
    const app = await startApi({ limiteTentativas: folga, limiteConta: { maximo: 2, janelaMs: 60_000 } })
    const login = { email: 'ninguem@example.com', password: 'palpite-errado' }
    for (let i = 0; i < 2; i++) assert.equal((await app.api('POST', '/auth/login', login)).status, 401)
    assert.equal((await app.api('POST', '/auth/login', login)).status, 429)
  })

  it('cadastros que deram certo param no limite do IP; e-mail repetido não gasta vaga', async () => {
    const app = await startApi({ limiteTentativas: folga, limiteCadastros: { maximo: 2, janelaMs: 60_000 } })
    const nova = (i: number) => ({ name: 'Atleta', email: `robo${i}@example.com`, password: 'senha-segura' })
    assert.equal((await app.api('POST', '/auth/register', nova(1))).status, 201)
    for (let i = 0; i < 3; i++) assert.equal((await app.api('POST', '/auth/register', nova(1))).status, 409)
    assert.equal((await app.api('POST', '/auth/register', nova(2))).status, 201)
    assert.equal((await app.api('POST', '/auth/register', nova(3))).status, 429)
    // O login do mesmo IP segue livre.
    assert.equal((await app.api('POST', '/auth/login', { email: nova(1).email, password: 'senha-segura' })).status, 200)
  })

  it('uma rajada simultânea de cadastros não passa do limite', async () => {
    const app = await startApi({ limiteTentativas: folga, limiteCadastros: { maximo: 3, janelaMs: 60_000 } })
    const respostas = await Promise.all(
      Array.from({ length: 12 }, (_, i) => app.api('POST', '/auth/register', { name: 'Robô', email: `rajada${i}@example.com`, password: 'senha-segura' })),
    )
    assert.equal(respostas.filter((r) => r.status === 201).length, 3)
    assert.equal(respostas.filter((r) => r.status === 429).length, 9)
  })

  it('uma rajada simultânea de senhas erradas não passa do limite do IP', async () => {
    const app = await startApi({ limiteTentativas: { maximo: 3, janelaMs: 60_000 } })
    const respostas = await Promise.all(
      Array.from({ length: 12 }, () => app.api('POST', '/auth/login', { email: 'x@example.com', password: 'palpite-errado' })),
    )
    assert.equal(respostas.filter((r) => r.status === 401).length, 3)
    assert.equal(respostas.filter((r) => r.status === 429).length, 9)
  })

  it('chaves inventadas não fazem a contagem crescer sem fim', () => {
    let n = 0
    const limite = limitarTentativas({ maximo: 1, janelaMs: 1000, chave: () => (n === 0 ? 'primeira' : `k${n}`) }, () => 0)
    const res = Object.assign(new EventEmitter(), { statusCode: 401, setHeader() {} })
    const pedir = () => {
      limite({} as Request, res as unknown as Response, () => {})
      res.emit('close')
      res.removeAllListeners()
    }
    pedir()
    assert.throws(pedir, /Muitas tentativas/, 'a primeira chave já esgotou')
    for (n = 1; n <= 10_000; n++) pedir()
    // A mais antiga saiu para abrir espaço: a contagem ficou limitada.
    n = 0
    assert.doesNotThrow(pedir)
  })
})

describe('Mensagens do cadastro e do login', () => {
  const detalhes = async (caminho: string, corpo: object) => {
    const resposta = await livre.api('POST', caminho, corpo)
    assert.equal(resposta.status, 400)
    return resposta.body.details
  }

  it('saem em português em cada campo, do jeito que a tela mostra', async () => {
    assert.deepEqual(await detalhes('/auth/register', { name: 'M', email: 'marina@', password: 'curta' }), {
      name: ['O nome precisa ter pelo menos 2 letras.'],
      email: ['E-mail inválido.'],
      password: ['A senha precisa ter pelo menos 8 caracteres.'],
    })
    assert.deepEqual(await detalhes('/auth/register', { name: 'x'.repeat(81), email: 'a@example.com', password: 'x'.repeat(129) }), {
      name: ['O nome pode ter até 80 letras.'],
      password: ['A senha pode ter até 128 caracteres.'],
    })
    assert.deepEqual(await detalhes('/auth/login', { email: 'marina@', password: '' }), {
      email: ['E-mail inválido.'],
      password: ['Informe a senha.'],
    })
  })

  it('campo faltando também', async () => {
    assert.deepEqual(await detalhes('/auth/register', {}), {
      name: ['Informe o nome.'],
      email: ['E-mail inválido.'],
      password: ['Informe a senha.'],
    })
    assert.deepEqual(await detalhes('/auth/login', {}), {
      email: ['E-mail inválido.'],
      password: ['Informe a senha.'],
    })
  })
})

describe('Tempo do login recusado', () => {
  it('e-mail sem conta demora o mesmo que senha errada', async () => {
    const { email } = await livre.register()
    const medir = async (login: object) => {
      const t0 = performance.now()
      assert.equal((await livre.api('POST', '/auth/login', login)).status, 401)
      return performance.now() - t0
    }
    const mediana = (lista: number[]) => [...lista].sort((a, b) => a - b)[Math.floor(lista.length / 2)]
    const comConta: number[] = []
    const semConta: number[] = []
    for (let i = 0; i < 15; i++) {
      comConta.push(await medir({ email, password: 'palpite-errado' }))
      semConta.push(await medir({ email: `ninguem${i}@example.com`, password: 'palpite-errado' }))
    }
    // Sem o scrypt falso a diferença é de mais de 10 vezes; a folga é para o ruído da máquina.
    assert.ok(mediana(semConta) > mediana(comConta) * 0.5, `com conta ${mediana(comConta)} ms, sem conta ${mediana(semConta)} ms`)
  })
})
