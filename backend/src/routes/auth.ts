import { Router } from 'express'
import { z } from 'zod'
import { isPgError, one, UNIQUE_VIOLATION, type Database } from '../db/index.js'
import { HttpError, notFound } from '../lib/http-error.js'
import { hashPassword, prepareDecoyHash, verifyAgainstDecoy, verifyPassword } from '../lib/password.js'
import { signToken } from '../lib/token.js'
import { parse } from '../lib/validate.js'
import { currentUser, requireAuth } from '../middleware/auth.js'

// A tela mostra estas mensagens ao lado de cada campo: o texto não pode depender da versão do Zod.
const EMAIL = 'E-mail inválido.'
const email = z.string({ error: EMAIL }).trim().toLowerCase().email()

const registerSchema = z.object({
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, 'O nome precisa ter pelo menos 2 letras.')
    .max(80, 'O nome pode ter até 80 letras.'),
  email,
  password: z
    .string({ error: 'Informe a senha.' })
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .max(128, 'A senha pode ter até 128 caracteres.'),
})

const loginSchema = z.object({
  email,
  password: z.string({ error: 'Informe a senha.' }).min(1),
})

type User = { id: number; name: string; email: string; isAdmin: boolean; createdAt: Date }

const USER_COLUMNS = `id, name, email, is_admin AS "isAdmin", created_at AS "createdAt"`

export function authRouter(db: Database) {
  const router = Router()
  void prepareDecoyHash()

  const findUser = (id: number) => one<User>(db, `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])

  router.post('/register', async (req, res) => {
    const body = parse(registerSchema, req.body)
    const passwordHash = await hashPassword(body.password)

    let user: User | undefined
    try {
      user = await one<User>(
        db,
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
        [body.name, body.email, passwordHash],
      )
    } catch (error) {
      if (isPgError(error, UNIQUE_VIOLATION)) throw new HttpError(409, 'E-mail já cadastrado')
      throw error
    }

    res.status(201).json({ token: signToken(user!.id), user })
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
    res.json({ token: signToken(row.id), user: await findUser(row.id) })
  })

  router.get('/me', requireAuth(db), async (req, res) => {
    const user = await findUser(currentUser(req))
    if (!user) throw notFound('Usuário')
    res.json(user)
  })

  return router
}
