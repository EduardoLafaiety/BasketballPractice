// Dá (ou tira, com --remover) o papel de admin de uma conta já cadastrada.
// Uso: npm run admin -- email@exemplo.com [--remover]
import { config } from '../config.js'
import { openDatabase } from '../db/index.js'

const args = process.argv.slice(2)
const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase()
const isAdmin = !args.includes('--remover')

if (!email) {
  console.error('Uso: npm run admin -- email@exemplo.com [--remover]')
  process.exit(1)
}

const db = await openDatabase(config.databaseUrl)
try {
  const { rows } = await db.query<{ name: string }>(
    'UPDATE users SET is_admin = $1 WHERE lower(email) = $2 RETURNING name',
    [isAdmin, email],
  )
  if (!rows.length) {
    console.error(`Nenhuma conta com o e-mail ${email}. Cadastre-se no site primeiro.`)
    process.exitCode = 1
  } else {
    console.log(`${rows[0].name} (${email}) ${isAdmin ? 'agora é admin' : 'deixou de ser admin'}.`)
  }
} finally {
  await db.close()
}
