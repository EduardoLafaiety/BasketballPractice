import { vi } from 'vitest'

/** Resposta com status diferente de 200 (ex.: erro de validação). */
export class Resposta {
  constructor(
    public status: number,
    public corpo?: unknown,
  ) {}
}

type Handler = (corpo: unknown, url: URL, params: Record<string, string>) => unknown

export interface Chamada {
  metodo: string
  caminho: string
  url: URL
  corpo: unknown
  headers: Record<string, string>
}

/**
 * Troca o fetch por uma API em memória. As rotas são "MÉTODO /caminho" (sem /api e sem query);
 * um handler pode devolver o corpo (status 200) ou uma `Resposta`. Rota desconhecida responde 404.
 * Trechos como ":id" casam com qualquer segmento e chegam ao handler em `params` ("GET /workouts/:id").
 */
export function apiFalsa(rotas: Record<string, Handler | object | string | number | boolean | null>) {
  const chamadas: Chamada[] = []
  const fetch = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(entrada), 'http://localhost')
    const metodo = (init.method ?? 'GET').toUpperCase()
    const caminho = url.pathname.replace(/^\/api/, '')
    const corpo = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    chamadas.push({ metodo, caminho, url, corpo, headers: (init.headers ?? {}) as Record<string, string> })

    const { rota, params } = encontrar(rotas, metodo, caminho)
    let resultado = typeof rota === 'function' ? await (rota as Handler)(corpo, url, params) : rota
    if (rota === undefined) resultado = new Resposta(404, { error: 'Rota não encontrada' })
    const resposta = resultado instanceof Resposta ? resultado : new Resposta(200, resultado)
    const texto = resposta.corpo === undefined || resposta.corpo === null ? '' : JSON.stringify(resposta.corpo)
    return new Response(texto || null, { status: resposta.status, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetch)
  const ultima = (metodo: string, caminho: string) =>
    [...chamadas].reverse().find((c) => c.metodo === metodo && c.caminho === caminho)
  return { chamadas, fetch, ultima }
}

/** Rota exata primeiro; depois as rotas com parâmetros (":id"). */
function encontrar(rotas: Record<string, unknown>, metodo: string, caminho: string) {
  const exata = `${metodo} ${caminho}`
  if (exata in rotas) return { rota: rotas[exata], params: {} }
  const partes = caminho.split('/')
  for (const [chave, rota] of Object.entries(rotas)) {
    const [m, padrao] = chave.split(' ')
    const molde = padrao.split('/')
    if (m !== metodo || molde.length !== partes.length) continue
    const params: Record<string, string> = {}
    const casou = molde.every((p, i) => {
      if (p.startsWith(':')) params[p.slice(1)] = partes[i]
      return p.startsWith(':') || p === partes[i]
    })
    if (casou) return { rota, params }
  }
  return { rota: undefined, params: {} }
}

export const usuarioFalso = (extra: Partial<{ id: number; name: string; email: string; isAdmin: boolean }> = {}) => ({
  id: 1,
  name: 'Marina Silva',
  email: 'marina@example.com',
  isAdmin: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  ...extra,
})

export const configFalsa = {
  theme: 'sistema',
  reminders: { enabled: false, time: '18:00', days: [1, 2, 3, 4, 5] },
  metronomeBpm: 90,
}
