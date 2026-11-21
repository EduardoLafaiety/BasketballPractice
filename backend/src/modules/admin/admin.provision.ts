import type { Database } from '../../db/index.js'
import { lockAdminMembership } from '../../db/account-access.js'
import { ADMIN_OWNERS } from '../../lib/admin-owners.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { HttpError } from '../../lib/http-error.js'
import * as repository from './admin.repository.js'

/** Somente ferramenta de servidor. Não há endpoint público para criar administradores. */
export async function provisionOwners(db: Database, credentials: Record<string, string>, resetExisting = false) {
  const prepared = await Promise.all(ADMIN_OWNERS.map(async owner => {
    const password = credentials[owner.email]
    if (typeof password !== 'string' || password.length < 20 || password.length > 128) throw new Error('Informe uma senha de 20 a 128 caracteres para cada responsável.')
    return { ...owner, password, hash: await hashPassword(password) }
  }))
  return db.transaction(async tx => {
    await lockAdminMembership(tx)
    for (const owner of prepared) {
      const existing = await repository.provisioningCredentials(tx, owner.email)
      if (existing && !resetExisting && !await verifyPassword(owner.password, existing.passwordHash)) {
        throw new HttpError(409, 'Já existe uma conta com senha diferente. Use --reset-existing somente para substituir as credenciais dos responsáveis.')
      }
      if (existing) {
        const changed = !await verifyPassword(owner.password, existing.passwordHash)
        await repository.provisionExisting(tx, existing.id, owner.name, changed ? owner.hash : existing.passwordHash, changed)
        if (changed) await repository.clearResetLinks(tx, existing.id)
      } else {
        await repository.provisionNew(tx, owner.name, owner.email, owner.hash)
      }
      await repository.clearPending(tx, owner.email)
    }
    return prepared.map(owner => ({ name: owner.name, email: owner.email }))
  })
}
