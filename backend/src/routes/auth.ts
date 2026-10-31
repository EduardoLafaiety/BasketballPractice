import { Router, type Request } from 'express'
import { z } from 'zod'
import { one, type Database } from '../db/index.js'
import { deleteUser } from '../db/users.js'
import type { EmailSender } from '../lib/email.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { hashOneTimeToken, newOneTimeToken } from '../lib/one-time-token.js'
import { hashPassword, prepareDecoyHash, verifyAgainstDecoy, verifyPassword } from '../lib/password.js'
import { isObviousPassword, OBVIOUS_PASSWORD } from '../lib/password-policy.js'
import { signToken } from '../lib/token.js'
import { parse } from '../lib/validate.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import { limitarEnvios, limitarTentativas, type LimiteTentativas } from '../middleware/rate-limit.js'

// A tela mostra estas mensagens ao lado de cada campo: o texto não pode depender da versão do Zod.
const EMAIL = 'E-mail inválido.'
const email = z.string({ error: EMAIL }).trim().toLowerCase().email()

// Vale para toda senha nova. O login não usa: quem já tem uma senha fraca precisa continuar entrando para poder trocá-la.
const newPassword = z
  .string({ error: 'Informe a senha.' })
  .min(8, { error: 'A senha precisa ter pelo menos 8 caracteres.', abort: true })
  .max(128, { error: 'A senha pode ter até 128 caracteres.', abort: true })
  .refine((password) => !isObviousPassword(password), OBVIOUS_PASSWORD)

const givenPassword = z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(1024, 'Senha incorreta.')
const oneTimeToken = z.string({ error: 'Link inválido.' }).min(1).max(200)

const registerSchema = z.object({
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, 'O nome precisa ter pelo menos 2 letras.')
    .max(80, 'O nome pode ter até 80 letras.'),
  email,
  password: newPassword,
})

const loginSchema = z.object({
  email,
  password: z.string({ error: 'Informe a senha.' }).min(1),
})

const confirmSchema = z.object({ token: oneTimeToken, password: givenPassword })
const forgotSchema = z.object({ email })
const resetSchema = z.object({ token: oneTimeToken, password: newPassword })
const changeSchema = z.object({ currentPassword: givenPassword, newPassword })
const deleteSchema = z.object({ password: givenPassword })

type User = { id: number; name: string; email: string; isAdmin: boolean; createdAt: Date }
type UserRow = User & { tokenVersion: number }

const USER_COLUMNS = `id, name, email, is_admin AS "isAdmin", created_at AS "createdAt", token_version AS "tokenVersion"`

const RESET_MINUTES = 30
const CONFIRM_HOURS = 24

// Mesmas respostas com ou sem conta: é o que impede descobrir quem está cadastrado.
const REGISTER_RECEIVED = 'Se este e-mail puder ser cadastrado, enviamos um link para ativar a conta. Confira a caixa de entrada e o spam.'
const FORGOT_RECEIVED = 'Se houver uma conta com este e-mail, enviamos um link para criar uma senha nova. Confira a caixa de entrada e o spam.'
const invalidLink = () => new HttpError(400, 'Este link é inválido ou já venceu. Peça outro.')

export interface AuthOptions {
  emails: EmailSender
  appUrl: string
  /** Senhas atuais erradas por conta logada, em quem troca a senha ou exclui a conta. */
  limiteSenhaAtual: LimiteTentativas
  limiteEnvios: LimiteTentativas
  segundoPlano?: (tarefa: Promise<void>) => void
  aoRedefinirSenha?: (email: string) => void
}

export function authRouter(db: Database, { emails, appUrl, limiteSenhaAtual, limiteEnvios, segundoPlano, aoRedefinirSenha }: AuthOptions) {
  const router = Router()
  void prepareDecoyHash()
  const auth = requireAuth(db)
  const senhaAtual = limitarTentativas({
    ...limiteSenhaAtual,
    chave: (req: Request) => String(currentUser(req)),
    conta: (status) => status === 403,
  })
  const podeEnviar = limitarEnvios(limiteEnvios)

  const session = ({ tokenVersion, ...user }: UserRow) => ({ token: signToken(user.id, tokenVersion), user })

  /**
   * A busca da conta e o envio correm depois da resposta: tanto o conteúdo quanto o tempo da resposta ficam iguais
   * com ou sem conta. Falha aqui não muda nada para quem pediu; fica só no log, sem endereço nem token.
   */
  const emSegundoPlano = (trabalho: () => Promise<void>) => {
    const tarefa = trabalho().catch((erro: unknown) => {
      console.error('[e-mail] Falha ao preparar ou enviar um e-mail de conta:', erro instanceof Error ? erro.message : erro)
    })
    segundoPlano?.(tarefa)
  }

  async function sendRegistrationEmail(name: string, address: string, passwordHash: string) {
    if (!podeEnviar(address)) return
    if (await one(db, 'SELECT 1 FROM users WHERE lower(email) = $1', [address])) {
      await emails.send({
        to: address,
        subject: 'Você já tem conta no Basketball Practice',
        text: `Alguém tentou criar uma conta com este e-mail, mas ele já está cadastrado. A senha da conta não mudou.\n\nSe foi você e esqueceu a senha, crie uma nova em:\n${appUrl}/recuperar-senha\n\nSe não foi você, pode ignorar esta mensagem.`,
      })
      return
    }

    const token = newOneTimeToken()
    await db.query('DELETE FROM pending_registrations WHERE expires_at <= now()')
    await db.query(
      `INSERT INTO pending_registrations (token_hash, name, email, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5::int))`,
      [hashOneTimeToken(token), name, address, passwordHash, CONFIRM_HOURS],
    )
    await emails.send({
      to: address,
      subject: 'Ative sua conta no Basketball Practice',
      text: `Para ativar a conta, abra o link abaixo e digite a senha que você escolheu. Ele vale por ${CONFIRM_HOURS} horas.\n\n${appUrl}/confirmar-conta#token=${token}\n\nSe não foi você que pediu, ignore esta mensagem: nenhuma conta será criada.`,
    })
  }

  async function sendResetEmail(address: string) {
    const user = await one<{ id: number; email: string }>(db, 'SELECT id, email FROM users WHERE lower(email) = $1', [address])
    if (!user || !podeEnviar(address)) return

    const token = newOneTimeToken()
    await db.query('DELETE FROM password_reset_tokens WHERE expires_at <= now()')
    await db.query(
      `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3::int))`,
      [hashOneTimeToken(token), user.id, RESET_MINUTES],
    )
    await emails.send({
      to: user.email,
      subject: 'Crie uma senha nova no Basketball Practice',
      text: `Para criar uma senha nova, abra o link abaixo. Ele vale por ${RESET_MINUTES} minutos e só funciona uma vez.\n\n${appUrl}/redefinir-senha#token=${token}\n\nSe não foi você que pediu, ignore esta mensagem: sua senha continua a mesma.`,
    })
  }

  const findUser = (id: number) => one<UserRow>(db, `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])

  router.post('/register', async (req, res) => {
    const body = parse(registerSchema, req.body)
    // Antes de responder, para o tempo ser o de sempre: a conta do scrypt é a parte demorada do cadastro.
    const passwordHash = await hashPassword(body.password)
    res.status(202).json({ message: REGISTER_RECEIVED })
    emSegundoPlano(() => sendRegistrationEmail(body.name, body.email, passwordHash))
  })

  // Pede a senha de novo: o dono do e-mail que abrir o link de um cadastro feito por outra pessoa não consegue ativar a
  // conta com a senha dela, que continuaria sabendo como entrar.
  router.post('/confirm', async (req, res) => {
    const { token, password } = parse(confirmSchema, req.body)
    const tokenHash = hashOneTimeToken(token)
    const pending = await one<{ name: string; email: string; passwordHash: string }>(
      db,
      `SELECT name, email, password_hash AS "passwordHash" FROM pending_registrations WHERE token_hash = $1 AND expires_at > now()`,
      [tokenHash],
    )
    if (!pending) throw invalidLink()
    if (!(await verifyPassword(password, pending.passwordHash))) {
      throw new HttpError(403, 'Senha incorreta', { password: ['Esta não é a senha escolhida no cadastro.'] })
    }

    const user = await db.transaction(async (tx) => {
      // Um pedido por e-mail de cada vez: dois links do mesmo e-mail apagariam as linhas um do outro em ordem cruzada (deadlock).
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [pending.email])
      // Dois cliques ao mesmo tempo: só um apaga a linha e segue.
      if (!(await tx.query('DELETE FROM pending_registrations WHERE token_hash = $1', [tokenHash])).rowCount) return undefined
      await tx.query('DELETE FROM pending_registrations WHERE email = $1', [pending.email])
      return one<UserRow>(
        tx,
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (lower(email)) DO NOTHING RETURNING ${USER_COLUMNS}`,
        [pending.name, pending.email, pending.passwordHash],
      )
    })
    if (!user) throw invalidLink()
    res.status(201).json(session(user))
  })

  router.post('/login', async (req, res) => {
    const body = parse(loginSchema, req.body)
    const row = await one<{ id: number; passwordHash: string }>(
      db,
      `SELECT id, password_hash AS "passwordHash" FROM users WHERE lower(email) = $1`,
      [body.email],
    )

    if (!row) await verifyAgainstDecoy(body.password)
    if (!row || !(await verifyPassword(body.password, row.passwordHash))) {
      throw new HttpError(401, 'E-mail ou senha incorretos')
    }
    res.json(session((await findUser(row.id))!))
  })

  router.post('/forgot-password', async (req, res) => {
    const body = parse(forgotSchema, req.body)
    res.status(202).json({ message: FORGOT_RECEIVED })
    emSegundoPlano(() => sendResetEmail(body.email))
  })

  router.post('/reset-password', async (req, res) => {
    const { token, password } = parse(resetSchema, req.body)
    const passwordHash = await hashPassword(password)

    const user = await db.transaction(async (tx) => {
      // A conta primeiro, sempre: quem mexe em senha e links da mesma conta passa um de cada vez, sem deadlock.
      const owner = await one<{ userId: number }>(tx, 'SELECT user_id AS "userId" FROM password_reset_tokens WHERE token_hash = $1', [
        hashOneTimeToken(token),
      ])
      if (!owner) return undefined
      await tx.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [owner.userId])

      // O DELETE é o que garante o uso único, mesmo com dois pedidos ao mesmo tempo.
      const link = await one<{ userId: number; valid: boolean }>(
        tx,
        `DELETE FROM password_reset_tokens WHERE token_hash = $1 RETURNING user_id AS "userId", expires_at > now() AS valid`,
        [hashOneTimeToken(token)],
      )
      if (!link?.valid) return undefined
      await tx.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [link.userId])
      return one<UserRow>(
        tx,
        `UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING ${USER_COLUMNS}`,
        [passwordHash, link.userId],
      )
    })
    if (!user) throw invalidLink()

    // Já provou ser dono do e-mail: entra agora, mesmo que alguém tenha esgotado o limite de login desta conta.
    aoRedefinirSenha?.(user.email.toLowerCase())
    res.json(session(user))
  })

  router.get('/me', auth, async (req, res) => {
    const row = await findUser(currentUser(req))
    if (!row) throw notFound('Usuário')
    const { tokenVersion: _tokenVersion, ...user } = row
    res.json(user)
  })

  // Sobe a versão da conta: encerra a sessão em todos os aparelhos, não só neste.
  router.post('/logout', auth, async (req, res) => {
    await db.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [currentUser(req)])
    res.status(204).end()
  })

  // Senha atual errada é 403, não 401: o site trata 401 como sessão vencida e deslogaria a pessoa por um erro de digitação.
  const assertPassword = async (userId: number, password: string, field: string) => {
    const row = await one<{ passwordHash: string }>(db, 'SELECT password_hash AS "passwordHash" FROM users WHERE id = $1', [userId])
    if (!row || !(await verifyPassword(password, row.passwordHash))) {
      throw new HttpError(403, 'Senha incorreta', { [field]: ['Senha incorreta.'] })
    }
  }

  router.put('/password', auth, senhaAtual, async (req, res) => {
    const userId = currentUser(req)
    const body = parse(changeSchema, req.body)
    await assertPassword(userId, body.currentPassword, 'currentPassword')
    if (body.newPassword === body.currentPassword) {
      throw new HttpError(400, 'Dados inválidos', { newPassword: ['A senha nova precisa ser diferente da atual.'] })
    }

    const passwordHash = await hashPassword(body.newPassword)
    const user = await db.transaction(async (tx) => {
      // A conta antes dos links, na mesma ordem da recuperação.
      const updated = await one<UserRow>(
        tx,
        `UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING ${USER_COLUMNS}`,
        [passwordHash, userId],
      )
      await tx.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId])
      return updated
    })
    // Os outros aparelhos saem; este segue logado com o token novo.
    res.json(session(user!))
  })

  router.delete('/me', auth, senhaAtual, async (req, res) => {
    const userId = currentUser(req)
    const { password } = parse(deleteSchema, req.body)
    await assertPassword(userId, password, 'password')

    await db.transaction(async (tx) => {
      // A trava faz dois administradores que se excluem ao mesmo tempo passarem um de cada vez.
      const admins = (await tx.query<{ id: number }>('SELECT id FROM users WHERE is_admin ORDER BY id FOR UPDATE')).rows
      if (admins.length === 1 && admins[0].id === userId) {
        throw new HttpError(409, 'Você é o único administrador. Passe o papel a outra conta antes de excluir a sua.')
      }
      await deleteUser(tx, userId)
    })
    res.status(204).end()
  })

  return router
}
