import { z } from 'zod'
import { isObviousPassword, OBVIOUS_PASSWORD } from '../../lib/password-policy.js'

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

export const registerSchema = z.object({
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, 'O nome precisa ter pelo menos 2 letras.')
    .max(80, 'O nome pode ter até 80 letras.'),
  email,
  password: newPassword,
})

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Informe a senha.' }).min(1),
})

export const confirmSchema = z.object({ token: oneTimeToken, password: givenPassword })
export const forgotSchema = z.object({ email })
export const resetSchema = z.object({ token: oneTimeToken, password: newPassword })
export const changeSchema = z.object({ currentPassword: givenPassword, newPassword })
export const deleteSchema = z.object({ password: givenPassword })
export const avatarSchema = z.object({ image: z.string().max(350000) }).strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ConfirmInput = z.infer<typeof confirmSchema>
export type ResetInput = z.infer<typeof resetSchema>
export type ChangePasswordInput = z.infer<typeof changeSchema>
