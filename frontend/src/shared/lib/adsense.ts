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

/** O ID no formato do script de anúncios: "ca-pub-…". */
export const clienteAdsense = (id: string) => `ca-${id}`

type FilaAdsense = unknown[] & { requestNonPersonalizedAds?: 0 | 1 }
declare global {
  interface Window {
    adsbygoogle?: FilaAdsense
  }
}

/**
 * Diz ao AdSense se pode personalizar os anúncios (só com o Aceitar do aviso de cookies). Vale para os
 * próximos pedidos de anúncio; por isso é chamado antes de o script carregar e de novo a cada mudança.
 */
export function definirPersonalizacao(personalizados: boolean) {
  const fila: FilaAdsense = (window.adsbygoogle ??= [])
  fila.requestNonPersonalizedAds = personalizados ? 0 : 1
}

/** Põe o script do AdSense na página uma vez (anúncios automáticos: o Google escolhe onde mostrar). */
export function carregarAdsense(id: string, personalizados: boolean) {
  definirPersonalizacao(personalizados)
  if (document.querySelector('script[data-adsense]')) return
  const script = document.createElement('script')
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clienteAdsense(id)}`
  script.dataset.adsense = ''
  document.head.appendChild(script)
}
