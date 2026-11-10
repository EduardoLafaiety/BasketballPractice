// Notícias da NBA das fontes gratuitas que aceitam chamada direto do navegador: a API da ESPN e o RSS
// de NBA da CBS Sports. (CNN, Yahoo e NBA.com não liberam: o navegador bloqueia ou o site recusa.)
// A lista fica guardada por 10 minutos; o recorte das últimas 24 horas é feito na hora de mostrar.
import { comValidade } from './cache'

export const URL_NOTICIAS_ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=30'
export const URL_NOTICIAS_CBS = 'https://www.cbssports.com/rss/headlines/nba/'

export type Fonte = 'ESPN' | 'CBS Sports'

export interface NoticiaNba {
  id: string
  titulo: string
  resumo: string
  url: string
  imagem: string | null
  fonte: Fonte
  /** Data de publicação (ISO). */
  publicada: string
}

const DIA_MS = 24 * 3_600_000
const https = (url: string) => url.replace(/^http:\/\//, 'https://')
const limpa = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

// Propaganda de casa de aposta não entra: o site é de treino.
// "Picks" e "odds" ficam de fora da lista: aparecem também em notícia normal (escolhas de draft).
const APOSTA = /(promo code|bonus bets?|sportsbook|draftkings|fanduel|betmgm|best bets|parlay)/i

interface ArtigoEspn {
  id?: number | string
  type?: string
  headline?: string
  description?: string
  published?: string
  images?: { url?: string }[]
  links?: { web?: { href?: string } }
}

/** Notícias da API da ESPN: só matérias e manchetes (prévias automáticas de jogo e vídeos ficam de fora). */
export function lerEspn(json: unknown): NoticiaNba[] {
  const artigos = ((json ?? {}) as { articles?: ArtigoEspn[] }).articles ?? []
  return artigos
    .filter((a) => (a.type === 'Story' || a.type === 'HeadlineNews') && a.headline && a.links?.web?.href && a.published)
    .map((a) => ({
      id: `espn-${a.id ?? a.links!.web!.href}`,
      titulo: limpa(a.headline),
      resumo: limpa(a.description),
      url: https(a.links!.web!.href!),
      imagem: a.images?.[0]?.url ? https(a.images[0].url) : null,
      fonte: 'ESPN' as const,
      publicada: new Date(a.published!).toISOString(),
    }))
}

/** Notícias do RSS da CBS Sports, sem as de aposta. */
export function lerCbs(xml: string): NoticiaNba[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  return [...doc.querySelectorAll('item')]
    .map((item) => {
      const campo = (nome: string) => limpa(item.getElementsByTagName(nome)[0]?.textContent)
      const data = new Date(campo('pubDate'))
      return {
        id: `cbs-${campo('guid') || campo('link')}`,
        titulo: campo('title'),
        resumo: campo('description'),
        url: https(campo('link')),
        imagem: item.getElementsByTagName('enclosure')[0]?.getAttribute('url') ?? null,
        fonte: 'CBS Sports' as const,
        publicada: Number.isNaN(data.getTime()) ? '' : data.toISOString(),
      }
    })
    .filter((n) => n.titulo && n.url.startsWith('https://') && n.publicada && !n.url.includes('/betting/') && !APOSTA.test(`${n.titulo} ${n.resumo}`))
}

/** Junta as fontes, tira repetidas pelo título e ordena da mais nova para a mais antiga. */
export function juntar(...listas: NoticiaNba[][]): NoticiaNba[] {
  const vistas = new Set<string>()
  return listas
    .flat()
    .sort((a, b) => b.publicada.localeCompare(a.publicada))
    .filter((n) => {
      const chave = n.titulo.toLowerCase()
      if (vistas.has(chave)) return false
      vistas.add(chave)
      return true
    })
}

/** As das últimas 24 horas; num dia fraco, completa com as mais recentes até ter pelo menos `minimo`. */
export function ultimas24h(noticias: NoticiaNba[], agora = Date.now(), minimo = 3): NoticiaNba[] {
  const recentes = noticias.filter((n) => agora - Date.parse(n.publicada) <= DIA_MS)
  return recentes.length >= minimo ? recentes : noticias.slice(0, minimo)
}

async function baixar(url: string) {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
  return resposta
}

/** As duas fontes ao mesmo tempo; se uma falhar, mostra a outra. Erro só se as duas falharem. */
export const buscarNoticiasNba = comValidade('bp.nba.noticias', 10 * 60_000, async () => {
  const [espn, cbs] = await Promise.allSettled([
    baixar(URL_NOTICIAS_ESPN).then(async (r) => lerEspn(await r.json())),
    baixar(URL_NOTICIAS_CBS).then(async (r) => lerCbs(await r.text())),
  ])
  const listas = [espn, cbs].flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  const noticias = juntar(...listas)
  if (!noticias.length) throw new Error('Não foi possível carregar as notícias da NBA agora.')
  return noticias
})
