import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import { config } from '../src/config.js'
import { assertProductionEmail, createEmailSender, type EmailConfig } from '../src/lib/email.js'
import { hashOneTimeToken } from '../src/lib/one-time-token.js'
import { hashPassword } from '../src/lib/password.js'
import { limitarEnvios } from '../src/middleware/rate-limit.js'
import { criarConta } from './caixa.js'
import { startApi } from './http.js'

const SENHA = 'senha-segura'
const NOVA = 'outra-senha-boa'
const OBVIA = 'Essa senha é fácil demais de adivinhar. Escolha outra.'

const { api, db, register, caixa } = await startApi()

const entrar = (email: string, password: string, app = api) => app('POST', '/auth/login', { email, password })
const eu = (token: string) => api('GET', '/auth/me', undefined, token)

let enderecos = 0
const novoEndereco = () => `conta${++enderecos}-${Date.now()}@example.com`

async function pedirLink(email: string) {
  assert.equal((await api('POST', '/auth/forgot-password', { email })).status, 202)
  return caixa.ultimoToken(email)
}

describe('Trocar a senha', () => {
  it('exige a senha atual e, sem ela, nada muda', async () => {
    const { token, email } = await register()
    const errada = await api('PUT', '/auth/password', { currentPassword: 'nao-e-esta', newPassword: NOVA }, token)
    assert.equal(errada.status, 403)
    assert.deepEqual(errada.body.details, { currentPassword: ['Senha incorreta.'] })
    assert.equal((await api('PUT', '/auth/password', { newPassword: NOVA }, token)).status, 400)
    assert.equal((await api('PUT', '/auth/password', { currentPassword: SENHA, newPassword: NOVA })).status, 401)

    assert.equal((await entrar(email, SENHA)).status, 200)
    assert.equal((await entrar(email, NOVA)).status, 401)
    assert.equal((await eu(token)).status, 200, 'a tentativa errada não derruba a sessão')
  })

  it('troca a senha, derruba os outros aparelhos e mantém este logado com o token novo', async () => {
    const { token, email } = await register()
    const outroAparelho = (await entrar(email, SENHA)).body.token as string

    const trocada = await api('PUT', '/auth/password', { currentPassword: SENHA, newPassword: NOVA }, token)
    assert.equal(trocada.status, 200)
    assert.equal(trocada.body.user.email, email)
    assert.equal(trocada.body.user.tokenVersion, undefined)

    assert.equal((await eu(token)).status, 401)
    assert.equal((await eu(outroAparelho)).status, 401)
    assert.equal((await eu(trocada.body.token)).status, 200)
    assert.equal((await entrar(email, SENHA)).status, 401)
    assert.equal((await entrar(email, NOVA)).status, 200)
  })

  it('a senha nova precisa ser diferente da atual', async () => {
    const { token } = await register()
    const igual = await api('PUT', '/auth/password', { currentPassword: SENHA, newPassword: SENHA }, token)
    assert.equal(igual.status, 400)
    assert.deepEqual(igual.body.details, { newPassword: ['A senha nova precisa ser diferente da atual.'] })
    assert.equal((await eu(token)).status, 200)
  })

  it('trocar a senha mata os links de recuperação ainda abertos', async () => {
    const { token, email } = await register()
    const link = await pedirLink(email)
    assert.equal((await api('PUT', '/auth/password', { currentPassword: SENHA, newPassword: NOVA }, token)).status, 200)
    assert.equal((await api('POST', '/auth/reset-password', { token: link, password: 'mais-uma-senha' })).status, 400)
    assert.equal((await entrar(email, NOVA)).status, 200)
  })

  it('senha atual errada para no limite da conta, sem contar outros erros', async () => {
    const app = await startApi({ limiteConta: { maximo: 2, janelaMs: 60_000 } })
    const alvo = await app.register()
    const outro = await app.register()
    const palpite = { currentPassword: 'palpite-errado', newPassword: NOVA }

    assert.equal((await app.api('PUT', '/auth/password', { currentPassword: SENHA, newPassword: 'curta' }, alvo.token)).status, 400)
    for (let i = 0; i < 2; i++) assert.equal((await app.api('PUT', '/auth/password', palpite, alvo.token)).status, 403)
    assert.equal((await app.api('PUT', '/auth/password', palpite, alvo.token)).status, 429)
    assert.equal((await app.api('DELETE', '/auth/me', { password: 'palpite-errado' }, alvo.token)).status, 429, 'excluir divide o limite')
    assert.equal((await app.api('PUT', '/auth/password', palpite, outro.token)).status, 403, 'a outra conta não foi afetada')
  })
})

describe('Recuperar a senha', () => {
  it('responde igual com ou sem conta, e só quem tem conta recebe o e-mail', async () => {
    const { email } = await register()
    const semConta = novoEndereco()
    const comConta = await api('POST', '/auth/forgot-password', { email })
    const ninguem = await api('POST', '/auth/forgot-password', { email: semConta })
    assert.equal(comConta.status, 202)
    assert.deepEqual(ninguem, comConta)

    await caixa.terminar()
    assert.match(caixa.para(email).at(-1)!.subject, /senha nova/)
    assert.deepEqual(caixa.para(semConta), [])
  })

  it('o tempo da resposta não depende de a conta existir: o trabalho fica para depois', async () => {
    let soltar = () => {}
    const portao = new Promise<void>((resolve) => { soltar = resolve })
    const app = await startApi({
      emails: { send: () => portao },
    })
    await app.db.query(`INSERT INTO users (name, email, password_hash) VALUES ('Lenta', 'lenta@example.com', 'x')`)
    // Com o provedor parado, a resposta sai do mesmo jeito.
    assert.equal((await app.api('POST', '/auth/forgot-password', { email: 'lenta@example.com' })).status, 202)
    soltar()
  })

  it('o provedor fora do ar não muda a resposta e não derruba a API', async () => {
    const erros: unknown[][] = []
    const original = console.error
    console.error = (...args: unknown[]) => void erros.push(args)
    try {
      const tarefas: Promise<void>[] = []
      const app = await startApi({
        emails: { send: () => Promise.reject(new Error('provedor fora do ar')) },
        segundoPlano: (tarefa) => void tarefas.push(tarefa),
      })
      await app.db.query(`INSERT INTO users (name, email, password_hash) VALUES ('Fora', 'fora@example.com', 'x')`)
      assert.equal((await app.api('POST', '/auth/forgot-password', { email: 'fora@example.com' })).status, 202)
      await Promise.all(tarefas)
      assert.equal((await app.api('GET', '/health')).status, 200)
      assert.ok(erros.flat().join(' ').includes('provedor fora do ar'))
      assert.ok(!erros.flat().join(' ').includes('fora@example.com'), 'o endereço não vai para o log')
    } finally {
      console.error = original
    }
  })

  it('o link troca a senha, derruba as sessões antigas e já entra', async () => {
    const { token, email, id } = await register()
    const link = await pedirLink(email)

    const pronto = await api('POST', '/auth/reset-password', { token: link, password: NOVA })
    assert.equal(pronto.status, 200)
    assert.equal(pronto.body.user.id, id)
    assert.equal((await eu(pronto.body.token)).status, 200)

    assert.equal((await eu(token)).status, 401)
    assert.equal((await entrar(email, SENHA)).status, 401)
    assert.equal((await entrar(email, NOVA)).status, 200)
  })

  it('o link só funciona uma vez, e usar um apaga os outros abertos', async () => {
    const { email } = await register()
    const primeiro = await pedirLink(email)
    const segundo = await pedirLink(email)
    assert.notEqual(primeiro, segundo)

    assert.equal((await api('POST', '/auth/reset-password', { token: primeiro, password: NOVA })).status, 200)
    for (const usado of [primeiro, segundo]) {
      const recusa = await api('POST', '/auth/reset-password', { token: usado, password: 'invasor-tentou' })
      assert.equal(recusa.status, 400)
      assert.match(recusa.body.error, /inválido ou já venceu/)
    }
    assert.equal((await entrar(email, NOVA)).status, 200)
  })

  it('dois pedidos ao mesmo tempo com o mesmo link: só um vale', async () => {
    const { email } = await register()
    const link = await pedirLink(email)
    const respostas = await Promise.all(
      Array.from({ length: 5 }, (_, i) => api('POST', '/auth/reset-password', { token: link, password: `tentativa-numero-${i}` })),
    )
    assert.equal(respostas.filter((r) => r.status === 200).length, 1)
    assert.equal(respostas.filter((r) => r.status === 400).length, 4)
  })

  it('o link vence, vale por 30 minutos e o banco guarda só o hash', async () => {
    const { email, id } = await register()
    const link = await pedirLink(email)

    const { rows } = await db.query<{ tokenHash: string; minutes: number }>(
      `SELECT token_hash AS "tokenHash", extract(epoch FROM expires_at - now()) / 60 AS minutes FROM password_reset_tokens WHERE user_id = $1`,
      [id],
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].tokenHash, hashOneTimeToken(link))
    assert.notEqual(rows[0].tokenHash, link)
    assert.ok(Math.abs(Number(rows[0].minutes) - 30) < 1, `vale por ${rows[0].minutes} minutos`)

    await db.query(`UPDATE password_reset_tokens SET expires_at = now() - interval '1 second' WHERE user_id = $1`, [id])
    assert.equal((await api('POST', '/auth/reset-password', { token: link, password: NOVA })).status, 400)
    assert.equal((await entrar(email, SENHA)).status, 200)
  })

  it('senha recusada não gasta o link, e o link de uma conta não mexe em outra', async () => {
    const dono = await register()
    const outra = await register()
    const link = await pedirLink(dono.email)

    const obvia = await api('POST', '/auth/reset-password', { token: link, password: '12345678' })
    assert.deepEqual(obvia.body.details, { password: [OBVIA] })
    assert.equal((await api('POST', '/auth/reset-password', { token: 'inventado', password: NOVA })).status, 400)

    assert.equal((await api('POST', '/auth/reset-password', { token: link, password: NOVA })).status, 200)
    assert.equal((await entrar(outra.email, SENHA)).status, 200)
    assert.equal((await eu(outra.token)).status, 200)
  })

  it('e-mail em maiúsculas acha a conta, e o link aponta para o endereço configurado do site', async () => {
    const { email } = await register()
    assert.equal((await api('POST', '/auth/forgot-password', { email: ` ${email.toUpperCase()} ` })).status, 202)
    const link = await caixa.ultimoToken(email)
    const texto = caixa.para(email).at(-1)!.text
    assert.ok(texto.includes(`${config.appUrl}/redefinir-senha#token=${link}`), texto)
  })
})

describe('Cadastro sem revelar quem tem conta', () => {
  it('responde igual com ou sem conta e não entrega token nenhum', async () => {
    const { email } = await register()
    const dados = { name: 'Alguém', password: 'senha-do-estranho' }
    const novo = await api('POST', '/auth/register', { ...dados, email: novoEndereco() })
    const repetido = await api('POST', '/auth/register', { ...dados, email })
    assert.equal(novo.status, 202)
    assert.deepEqual(repetido, novo)
    assert.deepEqual(Object.keys(novo.body), ['message'])
  })

  it('quem já tem conta recebe um aviso sem link de ativação, e a senha não muda', async () => {
    const { email, token } = await register()
    assert.equal((await api('POST', '/auth/register', { name: 'Estranho', email, password: 'senha-do-estranho' })).status, 202)
    await caixa.terminar()

    const aviso = caixa.para(email).at(-1)!
    assert.match(aviso.subject, /já tem conta/)
    assert.ok(!aviso.text.includes('#token='))
    assert.ok(aviso.text.includes(`${config.appUrl}/recuperar-senha`))
    assert.equal((await entrar(email, 'senha-do-estranho')).status, 401)
    assert.equal((await entrar(email, SENHA)).status, 200)
    assert.equal((await eu(token)).status, 200)
  })

  it('até ativar não existe conta: o login recusa igual a um e-mail desconhecido', async () => {
    const email = novoEndereco()
    assert.equal((await api('POST', '/auth/register', { name: 'Nova', email, password: SENHA })).status, 202)
    await caixa.terminar()

    assert.deepEqual(await entrar(email, SENHA), await entrar(novoEndereco(), SENHA))
    assert.equal((await db.query('SELECT 1 FROM users WHERE email = $1', [email])).rows.length, 0)

    const ativada = await api('POST', '/auth/confirm', { token: await caixa.ultimoToken(email), password: SENHA })
    assert.equal(ativada.status, 201)
    assert.equal(ativada.body.user.email, email)
    assert.equal(ativada.body.user.name, 'Nova')
    assert.equal((await eu(ativada.body.token)).status, 200)
    assert.equal((await entrar(email, SENHA)).status, 200)
  })

  it('um estranho não sequestra o e-mail: o link dele não ativa sem a senha dele, e o do dono vale', async () => {
    const email = novoEndereco()
    assert.equal((await api('POST', '/auth/register', { name: 'Estranho', email, password: 'senha-do-estranho' })).status, 202)
    const doEstranho = await caixa.ultimoToken(email)
    assert.equal((await api('POST', '/auth/register', { name: 'Dono', email, password: 'senha-do-dono' })).status, 202)
    const doDono = await caixa.ultimoToken(email)
    assert.notEqual(doEstranho, doDono)

    // O dono abre o primeiro e-mail e digita a própria senha: não ativa a conta com a senha do estranho.
    const recusa = await api('POST', '/auth/confirm', { token: doEstranho, password: 'senha-do-dono' })
    assert.equal(recusa.status, 403)
    assert.equal((await entrar(email, 'senha-do-estranho')).status, 401)

    const ativada = await api('POST', '/auth/confirm', { token: doDono, password: 'senha-do-dono' })
    assert.equal(ativada.status, 201)
    assert.equal(ativada.body.user.name, 'Dono')
    assert.equal((await db.query('SELECT 1 FROM pending_registrations WHERE email = $1', [email])).rows.length, 0, 'nenhum pedido fica guardado')

    // Depois disso, o pedido do estranho não vale mais nem com a senha certa.
    assert.equal((await api('POST', '/auth/confirm', { token: doEstranho, password: 'senha-do-estranho' })).status, 400)
    assert.equal((await entrar(email, 'senha-do-estranho')).status, 401)
    assert.equal((await entrar(email, 'senha-do-dono')).status, 200)
  })

  it('a conta surgiu entre o pedido e a ativação (mesmo e-mail em outra caixa): o link não vale, sem erro 500', async () => {
    const email = novoEndereco()
    assert.equal((await api('POST', '/auth/register', { name: 'Atrasada', email, password: SENHA })).status, 202)
    const link = await caixa.ultimoToken(email)
    await db.query(`INSERT INTO users (name, email, password_hash) VALUES ('Primeira', $1, 'x')`, [email.toUpperCase()])

    const resposta = await api('POST', '/auth/confirm', { token: link, password: SENHA })
    assert.equal(resposta.status, 400)
    assert.match(resposta.body.error, /inválido ou já venceu/)
  })

  it('o link de ativação é de uso único, vence em 24 horas e só o hash fica no banco', async () => {
    const email = novoEndereco()
    assert.equal((await api('POST', '/auth/register', { name: 'Nova', email, password: SENHA })).status, 202)
    const link = await caixa.ultimoToken(email)

    const { rows } = await db.query<{ tokenHash: string; hours: number; passwordHash: string }>(
      `SELECT token_hash AS "tokenHash", password_hash AS "passwordHash", extract(epoch FROM expires_at - now()) / 3600 AS hours
       FROM pending_registrations WHERE email = $1`,
      [email],
    )
    assert.equal(rows[0].tokenHash, hashOneTimeToken(link))
    assert.ok(Math.abs(Number(rows[0].hours) - 24) < 0.1, `vale por ${rows[0].hours} horas`)
    assert.ok(rows[0].passwordHash.startsWith('scrypt$'))

    await db.query(`UPDATE pending_registrations SET expires_at = now() - interval '1 second' WHERE email = $1`, [email])
    assert.equal((await api('POST', '/auth/confirm', { token: link, password: SENHA })).status, 400)
    await db.query(`UPDATE pending_registrations SET expires_at = now() + interval '1 hour' WHERE email = $1`, [email])

    assert.equal((await api('POST', '/auth/confirm', { token: link, password: SENHA })).status, 201)
    assert.equal((await api('POST', '/auth/confirm', { token: link, password: SENHA })).status, 400)
    assert.equal((await db.query('SELECT 1 FROM pending_registrations WHERE email = $1', [email])).rows.length, 0)
  })

  it('cada endereço recebe no máximo o limite de e-mails, sem a resposta mudar', async () => {
    const app = await startApi({ limiteEnvios: { maximo: 2, janelaMs: 60_000 } })
    const alvo = await app.register() // o e-mail de ativação já gasta um
    const email = novoEndereco()
    const respostas = []
    for (let i = 0; i < 4; i++) respostas.push(await app.api('POST', '/auth/register', { name: 'Robô', email, password: SENHA }))
    for (let i = 0; i < 4; i++) respostas.push(await app.api('POST', '/auth/forgot-password', { email: alvo.email }))
    assert.ok(respostas.every((r) => r.status === 202))
    await app.caixa.terminar()
    assert.equal(app.caixa.para(email).length, 2)
    assert.equal(app.caixa.para(alvo.email).length, 2)
  })

  it('a janela do limite de envios expira', () => {
    let agora = 0
    const pode = limitarEnvios({ maximo: 1, janelaMs: 1000 }, () => agora)
    assert.equal(pode('a@example.com'), true)
    assert.equal(pode('a@example.com'), false)
    assert.equal(pode('b@example.com'), true)
    agora = 1000
    assert.equal(pode('a@example.com'), true)
  })

  it('os pedidos de recuperação param no limite do IP, igual para qualquer e-mail', async () => {
    const app = await startApi({ limiteRecuperacao: { maximo: 2, janelaMs: 60_000 } })
    assert.equal((await app.api('POST', '/auth/forgot-password', { email: novoEndereco() })).status, 202)
    assert.equal((await app.api('POST', '/auth/forgot-password', { email: novoEndereco() })).status, 202)
    assert.equal((await app.api('POST', '/auth/forgot-password', { email: novoEndereco() })).status, 429)
  })
})

describe('Conta travada por outra pessoa', () => {
  const folga = { maximo: 1000, janelaMs: 60_000 }

  it('o 429 aponta a saída e não revela se a conta existe', async () => {
    const app = await startApi({ limiteConta: { maximo: 1, janelaMs: 60_000 } })
    const { email } = await app.register()
    const fantasma = novoEndereco()
    for (const alvo of [email, fantasma]) assert.equal((await app.api('POST', '/auth/login', { email: alvo, password: 'palpite' })).status, 401)
    const comConta = await app.api('POST', '/auth/login', { email, password: 'palpite' })
    const semConta = await app.api('POST', '/auth/login', { email: fantasma, password: 'palpite' })
    assert.equal(comConta.status, 429)
    assert.match(comConta.body.error, /Recupere a senha/)
    assert.deepEqual(semConta, comConta)
  })

  it('o dono travado recupera a senha, entra na hora e a contagem da conta recomeça', async () => {
    const app = await startApi({ limiteTentativas: folga, limiteConta: { maximo: 2, janelaMs: 60_000 } })
    const { email } = await app.register()
    for (let i = 0; i < 2; i++) assert.equal((await app.api('POST', '/auth/login', { email, password: 'palpite' })).status, 401)
    assert.equal((await app.api('POST', '/auth/login', { email, password: SENHA })).status, 429, 'travada, mesmo com a senha certa')

    assert.equal((await app.api('POST', '/auth/forgot-password', { email })).status, 202)
    const pronto = await app.api('POST', '/auth/reset-password', { token: await app.caixa.ultimoToken(email), password: NOVA })
    assert.equal(pronto.status, 200)
    assert.equal((await app.api('GET', '/auth/me', undefined, pronto.body.token)).status, 200)

    assert.equal((await app.api('POST', '/auth/login', { email, password: NOVA })).status, 200, 'a conta destravou')
  })

  it('e-mail com maiúsculas no banco destrava pela mesma chave do login', async () => {
    const app = await startApi({ limiteTentativas: folga, limiteConta: { maximo: 1, janelaMs: 60_000 } })
    await app.db.query(`INSERT INTO users (name, email, password_hash) VALUES ('Antiga', 'Antiga@Example.com', $1)`, [await hashPassword(SENHA)])
    const email = 'antiga@example.com'
    assert.equal((await app.api('POST', '/auth/login', { email, password: 'palpite' })).status, 401)
    assert.equal((await app.api('POST', '/auth/login', { email, password: SENHA })).status, 429)

    await app.api('POST', '/auth/forgot-password', { email })
    await app.caixa.terminar()
    const enviado = app.caixa.para('Antiga@Example.com').at(-1)!
    const token = /#token=([\w-]+)/.exec(enviado.text)![1]
    assert.equal((await app.api('POST', '/auth/reset-password', { token, password: NOVA })).status, 200)
    assert.equal((await app.api('POST', '/auth/login', { email, password: NOVA })).status, 200)
  })

  it('o IP que estourou o login ainda consegue recuperar a senha', async () => {
    const app = await startApi({ limiteTentativas: { maximo: 2, janelaMs: 60_000 } })
    const { email } = await app.register()
    for (let i = 0; i < 2; i++) assert.equal((await app.api('POST', '/auth/login', { email, password: 'palpite' })).status, 401)
    assert.equal((await app.api('POST', '/auth/login', { email, password: SENHA })).status, 429)

    assert.equal((await app.api('POST', '/auth/forgot-password', { email })).status, 202)
    const pronto = await app.api('POST', '/auth/reset-password', { token: await app.caixa.ultimoToken(email), password: NOVA })
    assert.equal(pronto.status, 200)
    assert.equal((await app.api('GET', '/auth/me', undefined, pronto.body.token)).status, 200)
  })

  it('palpites de link param no limite do IP sem atrapalhar o login', async () => {
    const app = await startApi({ limiteTentativas: { maximo: 2, janelaMs: 60_000 } })
    const { email } = await app.register()
    const palpite = { token: 'inventado', password: NOVA }
    for (let i = 0; i < 2; i++) assert.equal((await app.api('POST', '/auth/reset-password', palpite)).status, 400)
    assert.equal((await app.api('POST', '/auth/reset-password', palpite)).status, 429)
    assert.equal((await app.api('POST', '/auth/confirm', { token: 'inventado', password: NOVA })).status, 429, 'ativar divide o limite')
    assert.equal((await app.api('POST', '/auth/login', { email, password: SENHA })).status, 200)
  })
})

describe('Sair', () => {
  it('invalida o token em toda a API e em todos os aparelhos; entrar de novo funciona', async () => {
    const { token, email } = await register()
    const outroAparelho = (await entrar(email, SENHA)).body.token as string

    assert.equal((await api('POST', '/auth/logout', undefined, token)).status, 204)
    for (const antigo of [token, outroAparelho]) {
      assert.equal((await eu(antigo)).status, 401)
      assert.equal((await api('GET', '/sessions', undefined, antigo)).status, 401)
      assert.equal((await api('POST', '/auth/logout', undefined, antigo)).status, 401)
    }

    const novo = (await entrar(email, SENHA)).body.token as string
    assert.equal((await eu(novo)).status, 200)
  })

  it('sem token não há o que sair, e sair não afeta outra conta', async () => {
    const a = await register()
    const b = await register()
    assert.equal((await api('POST', '/auth/logout')).status, 401)
    assert.equal((await api('POST', '/auth/logout', undefined, a.token)).status, 204)
    assert.equal((await eu(b.token)).status, 200)
  })

  it('token de antes da versão existir segue valendo até sair; token de versão futura nunca vale', async () => {
    const { id } = await register()
    const antigo = jwt.sign({}, config.jwtSecret, { subject: String(id), expiresIn: '1h' })
    const futuro = jwt.sign({ tv: 99 }, config.jwtSecret, { subject: String(id), expiresIn: '1h' })
    assert.equal((await eu(antigo)).status, 200)
    assert.equal((await eu(futuro)).status, 401)

    assert.equal((await api('POST', '/auth/logout', undefined, antigo)).status, 204)
    assert.equal((await eu(antigo)).status, 401)
  })
})

describe('Senhas óbvias', () => {
  const obvias = ['12345678', 'password', 'Senha123', 'QWERTY123', 'basquete', 'aaaaaaaa', '  12345678  ']

  it('o cadastro recusa, em português e no campo da senha', async () => {
    for (const password of obvias) {
      const email = novoEndereco()
      const resposta = await api('POST', '/auth/register', { name: 'Atleta', email, password })
      assert.equal(resposta.status, 400, password)
      assert.deepEqual(resposta.body.details, { password: [OBVIA] }, password)
      await caixa.terminar()
      assert.deepEqual(caixa.para(email), [], 'recusado não recebe e-mail')
    }
  })

  it('a troca recusa e a senha continua a mesma', async () => {
    const { token, email } = await register()
    for (const newPassword of obvias) {
      const resposta = await api('PUT', '/auth/password', { currentPassword: SENHA, newPassword }, token)
      assert.equal(resposta.status, 400, newPassword)
      assert.deepEqual(resposta.body.details, { newPassword: [OBVIA] }, newPassword)
    }
    assert.equal((await entrar(email, SENHA)).status, 200)
  })

  it('aceita senhas boas, mesmo parecidas com as da lista', async () => {
    const { token } = await register()
    const trocada = await api('PUT', '/auth/password', { currentPassword: SENHA, newPassword: 'basquete na quadra 7' }, token)
    assert.equal(trocada.status, 200)
  })

  it('quem já tinha uma senha óbvia continua entrando e consegue trocar', async () => {
    const email = novoEndereco()
    await db.query(`INSERT INTO users (name, email, password_hash) VALUES ('Antiga', $1, $2)`, [email, await hashPassword('12345678')])
    const login = await entrar(email, '12345678')
    assert.equal(login.status, 200)
    assert.equal((await api('PUT', '/auth/password', { currentPassword: '12345678', newPassword: NOVA }, login.body.token)).status, 200)
  })
})

describe('Excluir a própria conta', () => {
  const tabelas = ['exercises', 'workouts', 'practice_sessions', 'goals', 'physical_tests', 'user_settings', 'password_reset_tokens']

  async function contaComTudo(app: Awaited<ReturnType<typeof startApi>>) {
    const conta = await app.register()
    const { token } = conta
    const exercicio = (await app.api('POST', '/exercises', { name: 'Floater', category: 'finalizacao', metric: 'acertos' }, token)).body.id
    await app.api('POST', '/workouts', { name: 'Treino', exercises: [{ exerciseId: exercicio }] }, token)
    await app.api('POST', '/sessions', { performedAt: '2026-10-20', entries: [{ exerciseId: exercicio, makes: 1, attempts: 2 }], shots: [{ zone: 'garrafao', makes: 1, attempts: 2 }] }, token)
    await app.api('POST', '/goals', { title: 'Meta', kind: 'cestas_total', target: 10, exerciseId: exercicio }, token)
    await app.api('POST', '/tests', { kind: 'impulsao', value: 50, performedAt: '2026-10-20' }, token)
    await app.api('PUT', '/settings', { theme: 'escuro' }, token)
    await app.api('POST', '/auth/forgot-password', { email: conta.email })
    await app.caixa.terminar()
    return conta
  }

  const contar = async (app: Awaited<ReturnType<typeof startApi>>, id: number) =>
    Object.fromEntries(
      await Promise.all(
        tabelas.map(async (t) => [t, (await app.db.query(`SELECT 1 FROM ${t} WHERE user_id = $1`, [id])).rows.length] as const),
      ),
    )

  it('senha errada ou ausente não apaga nada', async () => {
    const app = await startApi()
    const { token, id, email } = await contaComTudo(app)
    const antes = await contar(app, id)
    for (const tabela of tabelas) assert.ok(antes[tabela] > 0, `${tabela} deveria ter dados`)

    const errada = await app.api('DELETE', '/auth/me', { password: 'nao-e-esta' }, token)
    assert.equal(errada.status, 403)
    assert.deepEqual(errada.body.details, { password: ['Senha incorreta.'] })
    assert.equal((await app.api('DELETE', '/auth/me', {}, token)).status, 400)
    assert.equal((await app.api('DELETE', '/auth/me', { password: SENHA })).status, 401)

    assert.deepEqual(await contar(app, id), antes)
    assert.equal((await entrar(email, SENHA, app.api)).status, 200)
  })

  it('apaga tudo em cascata, inclusive o exercício próprio em uso, e não toca em outra conta', async () => {
    const app = await startApi()
    const { token, id, email } = await contaComTudo(app)
    const outra = await contaComTudo(app)
    const daOutra = await contar(app, outra.id)
    const catalogo = (await app.db.query('SELECT 1 FROM exercises WHERE user_id IS NULL')).rows.length

    assert.equal((await app.api('DELETE', '/auth/me', { password: SENHA }, token)).status, 204)

    for (const [tabela, linhas] of Object.entries(await contar(app, id))) assert.equal(linhas, 0, tabela)
    assert.equal((await app.db.query('SELECT 1 FROM users WHERE id = $1', [id])).rows.length, 0)
    assert.equal((await app.api('GET', '/auth/me', undefined, token)).status, 401)
    assert.equal((await entrar(email, SENHA, app.api)).status, 401)

    assert.deepEqual(await contar(app, outra.id), daOutra)
    assert.equal((await app.db.query('SELECT 1 FROM exercises WHERE user_id IS NULL')).rows.length, catalogo)
  })

  it('o mesmo e-mail pode criar outra conta, que começa vazia', async () => {
    const app = await startApi()
    const { token, email, id } = await contaComTudo(app)
    assert.equal((await app.api('DELETE', '/auth/me', { password: SENHA }, token)).status, 204)

    const nova = await criarConta(app.api, app.caixa, { name: 'De novo', email, password: NOVA })
    assert.notEqual(nova.user.id, id)
    assert.deepEqual((await app.api('GET', '/sessions', undefined, nova.token)).body, [])
  })

  it('o último administrador não sai, para o painel não ficar sem dono; com outro, sai', async () => {
    const app = await startApi()
    const chefe = await app.register()
    const outro = await app.register()
    await app.db.query('UPDATE users SET is_admin = true WHERE id = $1', [chefe.id])

    const recusa = await app.api('DELETE', '/auth/me', { password: SENHA }, chefe.token)
    assert.equal(recusa.status, 409)
    assert.match(recusa.body.error, /único administrador/)
    assert.equal((await app.api('GET', '/auth/me', undefined, chefe.token)).status, 200)

    // Quem não é admin sai normalmente, mesmo com um admin só.
    const comum = await app.register()
    assert.equal((await app.api('DELETE', '/auth/me', { password: SENHA }, comum.token)).status, 204)

    await app.db.query('UPDATE users SET is_admin = true WHERE id = $1', [outro.id])
    assert.equal((await app.api('DELETE', '/auth/me', { password: SENHA }, chefe.token)).status, 204)
  })
})

describe('Envio de e-mail', () => {
  const base: EmailConfig = { provider: '', from: '', resendApiKey: '', resendUrl: '', outboxFile: '' }
  const email = { to: 'marina@example.com', subject: 'Crie uma senha nova', text: 'Abra https://site/redefinir-senha#token=SEGREDO' }
  const registro = () => {
    const linhas: string[] = []
    return { linhas, log: { warn: (m: string) => void linhas.push(m), log: (m: string) => void linhas.push(m) } }
  }

  it('sem provedor, avisa com clareza e não expõe o link nem o endereço', async () => {
    const { linhas, log } = registro()
    await createEmailSender(base, log).send(email)
    assert.equal(linhas.length, 1)
    assert.match(linhas[0], /Nenhum provedor configurado \(EMAIL_PROVIDER\)/)
    assert.match(linhas[0], /NÃO foi enviado/)
    assert.ok(!linhas[0].includes('SEGREDO'))
    assert.ok(!linhas[0].includes('marina@example.com'))
  })

  it('em produção, não sobe com os provedores que gravam o link em texto puro', () => {
    assert.throws(() => assertProductionEmail({ ...base, provider: 'console' }), /não vale em produção/)
    assert.throws(() => assertProductionEmail({ ...base, provider: 'arquivo' }), /não vale em produção/)
    assert.throws(() => assertProductionEmail({ ...base, provider: 'resend' }), /RESEND_API_KEY e EMAIL_FROM/)
    assert.throws(() => assertProductionEmail({ ...base, provider: 'resend', resendApiKey: 'k' }), /RESEND_API_KEY e EMAIL_FROM/)
    assert.throws(() => assertProductionEmail({ ...base, provider: 'resend', from: 'a@b.com' }), /RESEND_API_KEY e EMAIL_FROM/)
    assert.doesNotThrow(() => assertProductionEmail(base))
    assert.doesNotThrow(() => assertProductionEmail({ ...base, provider: 'resend', resendApiKey: 'k', from: 'a@b.com' }))
  })

  it('provedor desconhecido é erro de configuração, não silêncio', () => {
    assert.throws(() => createEmailSender({ ...base, provider: 'sendgrit' }), /desconhecido: sendgrit/)
  })

  it('no modo console, mostra o e-mail para quem desenvolve', async () => {
    const { linhas, log } = registro()
    await createEmailSender({ ...base, provider: 'console' }, log).send(email)
    assert.ok(linhas[0].includes('SEGREDO') && linhas[0].includes('marina@example.com'))
  })

  it('no modo arquivo, grava um e-mail por linha', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'caixa-'))
    try {
      const outboxFile = join(pasta, 'enviados.jsonl')
      const enviador = createEmailSender({ ...base, provider: 'arquivo', outboxFile })
      await enviador.send(email)
      await enviador.send({ ...email, to: 'outra@example.com' })
      const linhas = (await readFile(outboxFile, 'utf8')).trim().split('\n').map((l) => JSON.parse(l))
      assert.deepEqual(linhas.map((l) => l.to), ['marina@example.com', 'outra@example.com'])
    } finally {
      await rm(pasta, { recursive: true })
    }
  })

  it('o Resend recebe a chave e o corpo no formato da API dele; resposta de erro vira falha', async () => {
    const pedidos: { auth?: string; corpo: unknown; metodo?: string }[] = []
    let status = 200
    const servidor = createServer((req, res) => {
      let corpo = ''
      req.on('data', (c) => (corpo += c))
      req.on('end', () => {
        pedidos.push({ auth: req.headers.authorization, corpo: JSON.parse(corpo), metodo: req.method })
        res.statusCode = status
        res.end('{}')
      })
    }).listen(0)
    await new Promise((resolve) => servidor.once('listening', resolve))
    try {
      const enviador = createEmailSender({
        ...base,
        provider: 'resend',
        resendApiKey: 'chave',
        from: 'Basketball Practice <oi@example.com>',
        resendUrl: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/emails`,
      })
      await enviador.send(email)
      assert.deepEqual(pedidos[0], {
        auth: 'Bearer chave',
        metodo: 'POST',
        corpo: { from: 'Basketball Practice <oi@example.com>', to: ['marina@example.com'], subject: email.subject, text: email.text },
      })

      status = 422
      await assert.rejects(enviador.send(email), /respondeu 422/)
    } finally {
      servidor.close()
    }
  })
})
