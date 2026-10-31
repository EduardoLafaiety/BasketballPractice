import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/http-error.js'

export interface LimiteTentativas {
  /** Quantas tentativas contadas cada chave pode fazer dentro da janela. */
  maximo: number
  janelaMs: number
}

interface Opcoes extends LimiteTentativas {
  /** De quem é a tentativa; `null` deixa o pedido passar sem contar. Por padrão, o IP. */
  chave?: (req: Request) => string | null
  /** Quais respostas gastam tentativa. Por padrão, os erros. */
  conta?: (status: number) => boolean
  /** Texto do 429; recebe os minutos de espera. */
  mensagem?: (minutos: number) => string
}

// Só para não crescer sem fim com chaves inventadas (e-mails aleatórios, por exemplo).
const MAX_CHAVES = 10_000

const porIp = (req: Request) => req.ip ?? 'desconhecido'
const erro = (status: number) => status >= 400 && status !== 429
const muitasTentativas = (minutos: number) => `Muitas tentativas. Tente de novo em ${minutos} min.`

/** Abre espaço no Map: tira o que já venceu e, se não bastar, as chaves mais antigas (ele guarda a ordem de criação). */
function abrirEspaco(contagem: Map<string, { inicio: number }>, t: number, janelaMs: number) {
  if (contagem.size < MAX_CHAVES) return
  for (const [k, v] of contagem) if (t - v.inicio >= janelaMs) contagem.delete(k)
  for (const k of contagem.keys()) {
    if (contagem.size < MAX_CHAVES) break
    contagem.delete(k)
  }
}

/** Chave do limite por conta: o e-mail como o login o compara. Sem e-mail, a validação do login recusa o pedido. */
export function emailDoLogin(req: Request) {
  const email: unknown = (req.body as { email?: unknown } | undefined)?.email
  return typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : null
}

/**
 * Freia quem insiste: conta as respostas escolhidas (por padrão, senha errada, e-mail já cadastrado…) por chave.
 * Quem acerta não gasta tentativa, então um atleta que entra normalmente nunca é bloqueado.
 * Os pedidos em andamento já ocupam lugar: sem isso, uma rajada simultânea passaria inteira antes da primeira resposta.
 * Fica em memória: basta para uma instância só; com várias, o certo é guardar a contagem no banco ou no Redis.
 */
export function limitarTentativas(
  { maximo, janelaMs, chave = porIp, conta = erro, mensagem = muitasTentativas }: Opcoes,
  agora = () => Date.now(),
) {
  const contagem = new Map<string, { contadas: number; emAndamento: number; inicio: number }>()

  const limitar = (req: Request, res: Response, next: NextFunction) => {
    const id = chave(req)
    if (id === null) {
      next()
      return
    }

    const t = agora()
    abrirEspaco(contagem, t, janelaMs)

    let atual = contagem.get(id)
    if (!atual || t - atual.inicio >= janelaMs) {
      atual = { contadas: 0, emAndamento: 0, inicio: t }
      contagem.set(id, atual)
    }
    if (atual.contadas + atual.emAndamento >= maximo) {
      const segundos = Math.ceil((atual.inicio + janelaMs - t) / 1000)
      res.setHeader('Retry-After', String(segundos))
      throw new HttpError(429, mensagem(Math.ceil(segundos / 60)))
    }

    const registro = atual
    registro.emAndamento++
    res.once('close', () => {
      registro.emAndamento--
      if (conta(res.statusCode)) registro.contadas++
    })
    next()
  }

  /** Zera a contagem de uma chave: quem provou ser o dono não precisa esperar a janela acabar. */
  return Object.assign(limitar, { liberar: (id: string) => void contagem.delete(id) })
}

/**
 * Quantos e-mails cada endereço pode receber na janela, para a API não virar ferramenta de encher a caixa de alguém.
 * Devolve se este envio cabe. Quem passa do limite não recebe erro: a resposta da API não pode mudar conforme o e-mail.
 */
export function limitarEnvios({ maximo, janelaMs }: LimiteTentativas, agora = () => Date.now()) {
  const contagem = new Map<string, { enviados: number; inicio: number }>()
  return (endereco: string) => {
    const t = agora()
    abrirEspaco(contagem, t, janelaMs)
    let atual = contagem.get(endereco)
    if (!atual || t - atual.inicio >= janelaMs) {
      atual = { enviados: 0, inicio: t }
      contagem.set(endereco, atual)
    }
    return ++atual.enviados <= maximo
  }
}
