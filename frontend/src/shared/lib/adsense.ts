// Identificador de editor do Google AdSense (aparece na conta como "ca-pub-" seguido de 16 dígitos).
// Vem de VITE_ADSENSE_ID no build; sem ele, o site sai sem ads.txt.

// Código fixo do Google no ads.txt (o ID dele na lista de vendedores autorizados da IAB).
const CERTIFICACAO_GOOGLE = 'f08c47fec0942fa0'

/** Aceita "ca-pub-…" ou "pub-…" e devolve "pub-…"; null se vazio; erro se estiver em outro formato. */
export function idEditor(valor: string | undefined): string | null {
  const limpo = valor?.trim()
  if (!limpo) return null
  const achado = /^(?:ca-)?(pub-\d{16})$/.exec(limpo)
  if (!achado) throw new Error(`VITE_ADSENSE_ID inválido: "${limpo}". Use o formato ca-pub-0000000000000000.`)
  return achado[1]
}

/** Conteúdo do ads.txt: diz aos compradores de anúncios que o Google pode vender o espaço deste site. */
export function conteudoAdsTxt(id: string) {
  return `google.com, ${id}, DIRECT, ${CERTIFICACAO_GOOGLE}\n`
}
