// Recria o banco dos testes de ponta a ponta, vazio, antes de a API subir (ela aplica migrações e catálogo).
// Usa o mesmo Postgres do projeto, num banco separado: o banco de desenvolvimento não é tocado.
import pg from 'pg'

const url = new URL(process.env.DATABASE_URL)
const nome = url.pathname.slice(1)
if (!/^[a-z0-9_]*e2e[a-z0-9_]*$/.test(nome)) {
  // Trava de segurança: este script apaga o banco inteiro.
  throw new Error(`Recuso apagar "${nome}": o banco dos testes E2E precisa ter "e2e" no nome`)
}

url.pathname = '/postgres'
const cliente = new pg.Client({ connectionString: url.toString() })
await cliente.connect()
try {
  await cliente.query(`DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`)
  await cliente.query(`CREATE DATABASE ${nome}`)
  console.log(`Banco ${nome} recriado vazio.`)
} finally {
  await cliente.end()
}
