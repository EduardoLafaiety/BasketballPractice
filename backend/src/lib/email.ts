import { appendFile } from 'node:fs/promises'

export interface Email {
  to: string
  subject: string
  text: string
}

/** Tudo o que a API precisa de um provedor de e-mail. Para trocar de provedor, basta outra implementação disto. */
export interface EmailSender {
  send(email: Email): Promise<void>
}

export interface EmailConfig {
  /** vazio, "resend", "console" ou "arquivo". */
  provider: string
  from: string
  resendApiKey: string
  resendUrl: string
  outboxFile: string
}

// Estes dois gravam o link de uso único em texto puro: servem só na máquina de quem desenvolve e nos testes.
const LOCAL_ONLY = ['console', 'arquivo']

/** Em produção, a API não sobe com um provedor que exporia os links nem com um que não conseguiria enviar. */
export function assertProductionEmail({ provider, from, resendApiKey }: EmailConfig) {
  if (LOCAL_ONLY.includes(provider)) throw new Error(`EMAIL_PROVIDER=${provider} grava os links em texto puro e não vale em produção`)
  if (provider === 'resend' && (!resendApiKey || !from)) throw new Error('EMAIL_PROVIDER=resend precisa de RESEND_API_KEY e EMAIL_FROM')
}

export function createEmailSender(config: EmailConfig, log: Pick<Console, 'warn' | 'log'> = console): EmailSender {
  switch (config.provider) {
    case '':
      return {
        async send({ subject }) {
          // Nem o destinatário nem o texto: o texto tem o link de uso único.
          log.warn(`[e-mail] Nenhum provedor configurado (EMAIL_PROVIDER): o e-mail "${subject}" NÃO foi enviado.`)
        },
      }
    case 'console':
      return {
        async send({ to, subject, text }) {
          log.log(`[e-mail] Para: ${to}\nAssunto: ${subject}\n\n${text}\n`)
        },
      }
    case 'arquivo':
      return {
        async send(email) {
          await appendFile(config.outboxFile, `${JSON.stringify(email)}\n`)
        },
      }
    case 'resend':
      return {
        async send({ to, subject, text }) {
          const response = await fetch(config.resendUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: config.from, to: [to], subject, text }),
            signal: AbortSignal.timeout(10_000),
          })
          if (!response.ok) throw new Error(`O Resend respondeu ${response.status}`)
        },
      }
    default:
      throw new Error(`EMAIL_PROVIDER desconhecido: ${config.provider}`)
  }
}
