/** Servidor manual de homologação. Banco temporário; nunca usa a conta ou o banco de produção. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => {
  const p = l.indexOf('='); return [l.slice(0, p), l.slice(p + 1)]
}))
if (env.MP_COLLECTOR_ID !== '3864166672' || !env.MP_TEST_BUYER_EMAIL?.endsWith('@testuser.com')) throw new Error('Homologação exige vendedor e comprador fictícios configurados.')
const identityResponse = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } })
const identity = await identityResponse.json() as { id: number; tags?: string[] }
if (!identityResponse.ok || String(identity.id) !== env.MP_COLLECTOR_ID || !identity.tags?.includes('test_user')) throw new Error('A API não confirmou o vendedor como conta de teste. Nenhum checkout iniciado.')

process.env.JWT_SECRET = randomBytes(48).toString('hex')
process.env.CORS_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173'
const { createApp } = await import('../src/app.js')
const { openTestDatabase } = await import('../test/pglite.js')
const { caixaDeEmails, criarConta } = await import('../test/caixa.js')
const db = await openTestDatabase()
const caixa = caixaDeEmails()
const billing = { enabled: true, accessToken: env.MP_ACCESS_TOKEN, webhookSecret: env.MP_WEBHOOK_SECRET, collectorId: env.MP_COLLECTOR_ID,
  // Neste fluxo o MP devolve live_mode=true também para contas fictícias.
  // A proteção do ambiente é o /users/me com tag test_user, conferido acima.
  liveMode: env.MP_LIVE_MODE === 'true',
  // O provedor exige retorno HTTPS; a volta à prévia local é manual, sem expor o computador por túnel.
  appUrl: env.APP_URL }
const app = createApp(db, { billing, emails: caixa.emails, segundoPlano: caixa.segundoPlano })
const server = app.listen(3334, '127.0.0.1')
await new Promise<void>(resolve => server.once('listening', resolve))
const api = async (method: string, path: string, body?: unknown, token?: string) => {
  const response = await fetch(`http://127.0.0.1:3334/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, body: await response.json() }
}
const guest = process.argv.includes('--convidado')
const account = await criarConta(api, caixa, { name: guest ? 'Homologação sem login no Mercado Pago' : 'Homologação Mercado Pago', email: env.MP_TEST_BUYER_EMAIL, password: 'Homologacao-Local-2026!' })
await criarConta(api, caixa, { name: 'Sem assinatura', email: 'sem-assinatura.homologacao@example.com', password: 'Homologacao-Local-2026!' })
mkdirSync('data', { recursive: true })
const reportFile = `data/homologacao-${guest ? 'convidado' : process.argv.includes('--anual') ? 'anual' : 'mensal'}.json`
if (process.argv.includes('--resume')) {
  const report = JSON.parse(readFileSync(reportFile, 'utf8')) as { subscriptions: { plan: string; mp_id: string | null }[] }
  for (const stored of report.subscriptions.filter(s => s.mp_id)) {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(stored.mp_id!)}`, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } })
    const remote = await response.json() as { id: string; external_reference: string; collector_id: number; status: string; init_point: string }
    if (!response.ok || String(remote.collector_id) !== env.MP_COLLECTOR_ID || remote.id !== stored.mp_id) throw new Error('Assinatura fictícia não confirmada ao retomar.')
    await db.query('INSERT INTO billing_subscriptions (id,user_id,plan,mp_id,status,checkout_url,create_started) VALUES ($1,$2,$3,$4,$5,$6,true)', [remote.external_reference, account.user.id, stored.plan, remote.id, remote.status, remote.init_point])
  }
}
async function saveReport() {
  const subscriptions = await db.query('SELECT plan,mp_id,status FROM billing_subscriptions')
  const payments = await db.query('SELECT payment_id,status,paid_until FROM billing_payments')
  writeFileSync(reportFile, JSON.stringify({ date: new Date().toISOString(), testSellerConfirmed: true, subscriptions: subscriptions.rows, payments: payments.rows }, null, 2))
}
const reportTimer = setInterval(() => void saveReport().catch(() => {}), 5000)
console.log('Homologação: API em http://127.0.0.1:3334; vendedor de teste confirmado; banco temporário; mensal/anual disponíveis para login local.')
let stopping = false
async function stop() {
  if (stopping) return; stopping = true
  clearInterval(reportTimer); await saveReport(); server.close(async () => { await db.close(); process.exit(0) })
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())
