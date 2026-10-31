import assert from 'node:assert/strict'
import type { Email } from '../src/lib/email.js'

type Pedir = (method: string, path: string, body?: unknown, token?: string) => Promise<{ status: number; body: any }>

/** Caixa de e-mails falsa: entra no lugar do provedor e guarda tudo o que a API enviaria. */
export function caixaDeEmails() {
  const enviados: Email[] = []
  const tarefas: Promise<void>[] = []

  /** Espera os envios já agendados: depois disto, o que não está na caixa não vai chegar. */
  const terminar = async () => {
    await Promise.all(tarefas)
  }

  return {
    enviados,
    terminar,
    emails: {
      async send(email: Email) {
        enviados.push(email)
      },
    },
    segundoPlano: (tarefa: Promise<void>) => void tarefas.push(tarefa),
    para: (endereco: string) => enviados.filter((e) => e.to === endereco),
    /** O token do link mais recente enviado a este endereço. */
    async ultimoToken(endereco: string) {
      await terminar()
      const texto = enviados.filter((e) => e.to === endereco).at(-1)?.text ?? ''
      const token = /#token=([\w-]+)/.exec(texto)?.[1]
      assert.ok(token, `nenhum link enviado a ${endereco}`)
      return token
    },
  }
}

export type Caixa = ReturnType<typeof caixaDeEmails>

/** O caminho inteiro de quem cria conta: cadastro, link no e-mail e ativação. */
export async function criarConta(api: Pedir, caixa: Caixa, dados: { name: string; email: string; password: string }) {
  const cadastro = await api('POST', '/auth/register', dados)
  assert.equal(cadastro.status, 202, JSON.stringify(cadastro.body))
  const token = await caixa.ultimoToken(dados.email.trim().toLowerCase())
  const ativada = await api('POST', '/auth/confirm', { token, password: dados.password })
  assert.equal(ativada.status, 201, JSON.stringify(ativada.body))
  return ativada.body as { token: string; user: { id: number; email: string; isAdmin: boolean } }
}
