// Dá (ou tira, com --remover) o papel de admin de uma conta já cadastrada.
// Uso: npm run admin -- email@exemplo.com [--remover]
import { config } from '../config.js'
import { openDatabase } from '../db/index.js'
import { setAdminByEmail } from '../modules/admin/admin.service.js'

const args = process.argv.slice(2)
const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase()
const isAdmin = !args.includes('--remover')

if (!email) {
  console.error('Uso: npm run admin -- email@exemplo.com [--remover]')
  process.exit(1)
}

const db = await openDatabase(config.databaseUrl)
try {
  const user = await setAdminByEmail(db, email, isAdmin)
  if (!user) {
    console.error(`Nenhuma conta com o e-mail ${email}. Cadastre-se no site primeiro.`)
    process.exitCode = 1
  } else {
    console.log(`${user.name} (${email}) ${isAdmin ? 'agora é admin' : 'deixou de ser admin'}.`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Não foi possível alterar o papel da conta.')
  process.exitCode = 1
} finally {
  await db.close()
}
