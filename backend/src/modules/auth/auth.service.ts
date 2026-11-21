import type { Database } from '../../db/index.js'
import { adminIds, lockAdminMembership } from '../../db/account-access.js'
import { deleteUser } from '../../db/users.js'
import type { EmailSender } from '../../lib/email.js'
import { HttpError, notFound } from '../../lib/http-error.js'
import { hashOneTimeToken, newOneTimeToken } from '../../lib/one-time-token.js'
import { hashPassword, prepareDecoyHash, verifyAgainstDecoy, verifyPassword } from '../../lib/password.js'
import { signToken } from '../../lib/token.js'
import { normalizeAvatar } from '../../lib/avatar.js'
import { effectiveAdmin, ownerEmail, ownersOnly } from '../../lib/admin-owners.js'
import * as repository from './auth.repository.js'
import type { UserRow, PendingRegistration } from './auth.repository.js'
import type { ChangePasswordInput, ConfirmInput, LoginInput, RegisterInput, ResetInput } from './auth.schema.js'

const RESET_MINUTES = 30
const CONFIRM_HOURS = 24

// Mesmas respostas com ou sem conta: é o que impede descobrir quem está cadastrado.
export const REGISTER_RECEIVED = 'Se este e-mail puder ser cadastrado, enviamos um link para ativar a conta. Confira a caixa de entrada e o spam.'
export const FORGOT_RECEIVED = 'Se houver uma conta com este e-mail, enviamos um link para criar uma senha nova. Confira a caixa de entrada e o spam.'
const invalidLink = () => new HttpError(400, 'Este link é inválido ou já venceu. Peça outro.')

export interface AuthServiceOptions {
  emails: EmailSender
  appUrl: string
  podeEnviar: (email: string) => boolean
  segundoPlano?: (tarefa: Promise<void>) => void
  aoRedefinirSenha?: (email: string) => void
}

const publicUser = ({ id, name, email, isAdmin, createdAt, avatarUrl }: UserRow) => ({ id, name, email, isAdmin: effectiveAdmin(email, isAdmin), createdAt, ...(avatarUrl ? { avatarUrl } : {}) })
const session = (row: UserRow) => ({ token: signToken(row.id, row.tokenVersion), user: publicUser(row) })

async function assertPassword(row: repository.CredentialRow | undefined, password: string, field: string) {
  if (!row || !await verifyPassword(password, row.passwordHash)) {
    throw new HttpError(403, 'Senha incorreta', { [field]: ['Senha incorreta.'] })
  }
}

export function createAuthService(db: Database, { emails, appUrl, podeEnviar, segundoPlano, aoRedefinirSenha }: AuthServiceOptions) {
  void prepareDecoyHash()
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
    if (await repository.emailExists(db, address)) {
      await emails.send({
        to: address,
        subject: 'Você já tem conta no Basketball Practice',
        text: `Alguém tentou criar uma conta com este e-mail, mas ele já está cadastrado. A senha da conta não mudou.\n\nSe foi você e esqueceu a senha, crie uma nova em:\n${appUrl}/recuperar-senha\n\nSe não foi você, pode ignorar esta mensagem.`,
      })
      return
    }

    const token = newOneTimeToken()
    await repository.saveRegistration(db, hashOneTimeToken(token), { name, email: address, passwordHash }, CONFIRM_HOURS)
    await emails.send({
      to: address,
      subject: 'Ative sua conta no Basketball Practice',
      text: `Para ativar a conta, abra o link abaixo e digite a senha que você escolheu. Ele vale por ${CONFIRM_HOURS} horas.\n\n${appUrl}/confirmar-conta#token=${token}\n\nSe não foi você que pediu, ignore esta mensagem: nenhuma conta será criada.`,
    })
  }

  async function sendResetEmail(address: string) {
    const user = await repository.resetRecipient(db, address)
    if (!user || !podeEnviar(address)) return

    const token = newOneTimeToken()
    await repository.saveResetLink(db, hashOneTimeToken(token), user.id, RESET_MINUTES)
    await emails.send({
      to: user.email,
      subject: 'Crie uma senha nova no Basketball Practice',
      text: `Para criar uma senha nova, abra o link abaixo. Ele vale por ${RESET_MINUTES} minutos e só funciona uma vez.\n\n${appUrl}/redefinir-senha#token=${token}\n\nSe não foi você que pediu, ignore esta mensagem: sua senha continua a mesma.`,
    })
  }

  return {
    async prepareRegistration(input: RegisterInput): Promise<PendingRegistration> {
      return { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) }
    },
    dispatchRegistration(pending: PendingRegistration) {
      emSegundoPlano(() => sendRegistrationEmail(pending.name, pending.email, pending.passwordHash))
    },
    dispatchReset(email: string) { emSegundoPlano(() => sendResetEmail(email)) },
    async confirm({ token, password }: ConfirmInput) {
      const tokenHash = hashOneTimeToken(token)
      const pending = await repository.findPendingRegistration(db, tokenHash)
      if (!pending) throw invalidLink()
      if (!await verifyPassword(password, pending.passwordHash)) {
        throw new HttpError(403, 'Senha incorreta', { password: ['Esta não é a senha escolhida no cadastro.'] })
      }
      const user = await db.transaction((tx) => repository.activateRegistration(tx, tokenHash, pending))
      if (!user) throw invalidLink()
      return session(user)
    },
    async login(input: LoginInput) {
      const row = await repository.credentialsByEmail(db, input.email)
      if (!row) await verifyAgainstDecoy(input.password)
      if (!row || !await verifyPassword(input.password, row.passwordHash)) throw new HttpError(401, 'E-mail ou senha incorretos')
      return db.transaction(async (tx) => {
        // Não assina a versão nova de uma conta cuja senha mudou durante a verificação.
        const current = await repository.credentialsById(tx, row.id, true)
        if (!current || current.blocked || current.passwordHash !== row.passwordHash) throw new HttpError(401, 'E-mail ou senha incorretos')
        await repository.recordLogin(tx, current.id)
        return session(current)
      })
    },
    async resetPassword({ token, password }: ResetInput) {
      const passwordHash = await hashPassword(password)
      const tokenHash = hashOneTimeToken(token)
      const user = await db.transaction(async (tx) => {
        const owner = await repository.resetLinkOwner(tx, tokenHash)
        if (!owner) return undefined
        const account = await repository.credentialsById(tx, owner.userId, true)
        if (!account || account.blocked) return undefined
        const link = await repository.consumeResetLink(tx, tokenHash)
        if (!link?.valid) return undefined
        await repository.clearResetLinks(tx, link.userId)
        return repository.updatePassword(tx, link.userId, passwordHash)
      })
      if (!user || user.blocked) throw invalidLink()
      aoRedefinirSenha?.(user.email.toLowerCase())
      return session(user)
    },
    async getMe(userId: number) {
      const row = await repository.findUser(db, userId)
      if (!row) throw notFound('Usuário')
      return publicUser(row)
    },
    async logout(userId: number) { await repository.revokeTokens(db, userId) },
    async setAvatar(userId: number, image: string | null) {
      const avatarUrl = image === null ? null : await normalizeAvatar(image)
      if (!await repository.updateAvatar(db, userId, avatarUrl)) throw notFound('Usuário')
      return { avatarUrl }
    },
    async changePassword(userId: number, input: ChangePasswordInput) {
      const passwordHash = await hashPassword(input.newPassword)
      return db.transaction(async (tx) => {
        const row = await repository.credentialsById(tx, userId, true)
        await assertPassword(row, input.currentPassword, 'currentPassword')
        if (input.newPassword === input.currentPassword) {
          throw new HttpError(400, 'Dados inválidos', { newPassword: ['A senha nova precisa ser diferente da atual.'] })
        }
        const user = await repository.updatePassword(tx, userId, passwordHash)
        await repository.clearResetLinks(tx, userId)
        return session(user!)
      })
    },
    async deleteMe(userId: number, password: string) {
      await db.transaction(async (tx) => {
        await lockAdminMembership(tx)
        const row = await repository.credentialsById(tx, userId, true)
        await assertPassword(row, password, 'password')
        if (row && ownersOnly() && ownerEmail(row.email)) throw new HttpError(403, 'As contas dos responsáveis estão protegidas.')
        const admins = await adminIds(tx)
        if (admins.length === 1 && admins[0].id === userId) {
          throw new HttpError(409, 'Você é o único administrador. Passe o papel a outra conta antes de excluir a sua.')
        }
        await deleteUser(tx, userId)
      })
    },
  }
}
