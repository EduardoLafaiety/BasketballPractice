// Prévia local com banco isolado em memória; não consulta nem altera produção.
import { readFile } from 'node:fs/promises'
import { openTestDatabase } from './pglite.js'
import { provisionOwners } from '../src/modules/admin/admin.provision.js'
import { createApp } from '../src/app.js'
process.env.ADMIN_OWNERS_ONLY = 'true'
const db = await openTestDatabase()
const credentials = JSON.parse(await readFile('data/admin-credentials.json', 'utf8')) as Record<string, string>
await provisionOwners(db, credentials)
const server = createApp(db, { billing: { enabled: true, accessToken: '', webhookSecret: '', collectorId: '', appUrl: 'http://127.0.0.1:5180', liveMode: false }, emails: { send: async () => {} } }).listen(3340, '127.0.0.1', () => console.log('Prévia administrativa: API http://127.0.0.1:3340/api — somente os dois responsáveis, sem clientes ou pagamentos de exemplo'))
process.on('SIGINT', () => { server.close(() => { void db.close() }) })

