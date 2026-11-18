const paginas = new Map<string, () => Promise<unknown>>()
const pedidos = new Map<string, Promise<unknown>>()

export function registrarPagina(rota: string, carregar: () => Promise<unknown>) {
  paginas.set(rota, carregar)
}

/** Só antecipa uma rota de interesse, sem consumir rede limitada para páginas não solicitadas. */
export function precarregarDestino(destino: string) {
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (!navigator.onLine || conexao?.saveData || /(^|-)2g$/.test(conexao?.effectiveType ?? '')) return
  const url = new URL(destino, location.href)
  if (url.origin !== location.origin) return
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const caminho = url.pathname.slice(base.length).replace(/\/$/, '') || '/'
  const rota = [...paginas.keys()].find((r) => new RegExp(`^${r.replace(/:[^/]+/g, '[^/]+')}$`).test(caminho))
  if (!rota || pedidos.has(rota)) return
  const pedido = paginas.get(rota)!().catch(() => { pedidos.delete(rota) })
  pedidos.set(rota, pedido)
}
