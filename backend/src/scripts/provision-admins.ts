// As senhas entram por stdin; nunca por argumento, log ou arquivo versionado.
import { config } from '../config.js'
import { openDatabase } from '../db/index.js'
import { provisionOwners } from '../modules/admin/admin.provision.js'

let input = ''
for await (const chunk of process.stdin) input += chunk
const credentials: unknown = JSON.parse(input)
if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) throw new Error('Credenciais inválidas.')
const db = await openDatabase(config.databaseUrl)
try {
  await provisionOwners(db, credentials as Record<string, string>, process.argv.includes('--reset-existing'))
  console.log('As duas contas responsáveis estão prontas. Use /entrar e depois /admin.')
} finally { await db.close() }
