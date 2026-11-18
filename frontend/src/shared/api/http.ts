// Em dev o Vite faz proxy de /api para o backend (vite.config.ts).
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
const CHAVE_TOKEN = 'bp.token'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[] | undefined>,
  ) {
    super(message)
  }
}

let token: string | null = lerToken()
let aoExpirar: (() => void) | null = null

function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export const tokenAtual = () => token

/** Identifica somente o armazenamento local; a autenticação continua sendo validada pela API. */
export function contaLocal(): string | null {
  if (token === 'demo') return '1'
  try {
    const sub = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub
    return /^\d+$/.test(String(sub)) ? String(sub) : null
  } catch { return null }
}

export function definirToken(novo: string | null) {
  token = novo
  try {
    if (novo) localStorage.setItem(CHAVE_TOKEN, novo)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // armazenamento indisponível: o login vale só nesta aba
  }
}

/** Chamado quando a API responde 401 numa rota autenticada (token expirado). */
export function aoTokenExpirar(fn: (() => void) | null) {
  aoExpirar = fn
}

/** Pedido à API (ou à API da demonstração, que roda no navegador). */
export async function request<T>(metodo: string, caminho: string, corpo?: unknown, { signal }: { signal?: AbortSignal } = {}): Promise<T> {
  const tokenDoPedido = token
  signal?.throwIfAborted()
  let resposta: Response
  try {
    resposta = __DEMO__
      ? // Demonstração: a API real roda no próprio navegador (src/demo/servidor.ts).
        await (await import('@demo/servidor')).responder(metodo, caminho, corpo)
      : await fetch(`${BASE}${caminho}`, {
          method: metodo,
          signal,
          headers: {
            ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(tokenDoPedido ? { Authorization: `Bearer ${tokenDoPedido}` } : {}),
          },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
        })
  } catch (erro) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Pedido cancelado', 'AbortError')
    if (__DEMO__) console.error('Demonstração indisponível', erro)
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique sua conexão.')
  }

  const texto = await resposta.text()
  signal?.throwIfAborted()
  let dados: unknown = null
  try {
    dados = texto ? JSON.parse(texto) : null
  } catch {
    // resposta sem JSON (ex.: proxy sem backend)
  }

  if (!resposta.ok) {
    const erro = (dados ?? {}) as { error?: string; details?: ApiError['details'] }
    if (resposta.status === 401 && tokenDoPedido && token === tokenDoPedido) aoExpirar?.()
    const mensagem =
      erro.error ?? (resposta.status >= 500 ? 'O servidor não respondeu. Tente de novo.' : `Erro ${resposta.status}`)
    throw new ApiError(resposta.status, mensagem, erro.details)
  }
  return dados as T
}
