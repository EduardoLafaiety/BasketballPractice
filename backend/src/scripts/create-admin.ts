// Cria uma conta de administrador pronta para entrar (sem e-mail de confirmação nem pagamento).
// Uso: npm run admin:criar -- email@exemplo.com "Seu Nome" [--redefinir-senha]
// A senha é pedida no terminal (não aparece na tela) ou lida de ADMIN_PASSWORD; nunca vai para o Git nem para o histórico.
import { config } from '../config.js'
import { openDatabase } from '../db/index.js'
import { createAdminAccount } from '../modules/admin/admin.service.js'

const args = process.argv.slice(2)
const [email, name] = args.filter((arg) => !arg.startsWith('--'))
const redefinirSenha = args.includes('--redefinir-senha')

if (!email || !name) {
  console.error('Uso: npm run admin:criar -- email@exemplo.com "Seu Nome" [--redefinir-senha]')
  process.exit(1)
}

const CTRL_C = String.fromCharCode(3)
const APAGAR = String.fromCharCode(127)

/** Lê a senha sem mostrar o que é digitado. */
function pedirSenha(pergunta: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(pergunta)
    const entrada = process.stdin
    entrada.setRawMode?.(true)
    entrada.resume()
    entrada.setEncoding('utf8')
    let senha = ''
    const aoDigitar = (tecla: string) => {
      for (const c of tecla) {
        if (c === CTRL_C) process.exit(130)
        if (c === '\r' || c === '\n') {
          entrada.setRawMode?.(false)
          entrada.pause()
          entrada.off('data', aoDigitar)
          process.stdout.write('\n')
          return resolve(senha)
        }
        if (c === APAGAR || c === '\b') senha = senha.slice(0, -1)
        else senha += c
      }
    }
    entrada.on('data', aoDigitar)
  })
}

let password = process.env.ADMIN_PASSWORD ?? ''
if (!password) {
  password = await pedirSenha('Senha do administrador (mínimo 10 caracteres): ')
  if (password !== (await pedirSenha('Repita a senha: '))) {
    console.error('As senhas não são iguais.')
    process.exit(1)
  }
}

const db = await openDatabase(config.databaseUrl)
try {
  const conta = await createAdminAccount(db, { name, email, password, redefinirSenha })
  console.log(
    conta.criada
      ? `Administrador criado: ${conta.email}. Já pode entrar no site.`
      : `${conta.email} já tinha conta e agora é admin${redefinirSenha ? ', com a senha nova' : ' (a senha continua a mesma)'}.`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Não foi possível criar o administrador.')
  process.exitCode = 1
} finally {
  await db.close()
}
