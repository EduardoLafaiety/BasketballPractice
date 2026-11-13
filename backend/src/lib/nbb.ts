import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

// Classificação, líderes e notícias do NBB (Novo Basquete Brasil), lidos das páginas públicas da LNB (Liga Nacional
// de Basquete). A LNB não tem API e as páginas não liberam leitura pelo navegador (CORS), então a leitura é feita aqui,
// ao publicar o site, e vira um JSON estático (src/scripts/export-nbb.ts).

export const NBB_URL = 'https://lnb.com.br/nbb/classificacao/'
export const NBB_NEWS_URL = 'https://lnb.com.br/noticias/categoria/nbb'
export const nbbLeadersUrl = (slug: string) => `https://lnb.com.br/nbb/estatisticas/${slug}/`

export interface NbbTeam {
  position: number
  /** Sigla de três letras usada pela LNB (MIN, MOG, PIN…). */
  abbreviation: string
  name: string
  /** Escudo do time, hospedado pela LNB. */
  logo: string
  games: number
  wins: number
  losses: number
  /** Aproveitamento de 0 a 1. */
  winPct: number
  pointsFor: number
  pointsAgainst: number
  /** Saldo de pontos (cestas feitas menos sofridas). */
  pointsDiff: number
  /** Pontos na tabela: 2 por vitória e 1 por derrota. */
  points: number
}

export interface NbbStandings {
  /** Ex.: "2026/2027". */
  season: string
  teams: NbbTeam[]
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }

/** Texto puro de um trecho de HTML: sem tags nem comentários, com as entidades (&amp;, &#8211;…) resolvidas. */
const text = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()

/** Do HTML da página de classificação da LNB para a tabela; lança erro se a página mudou e nada foi reconhecido. */
export function parseNbbStandings(html: string): NbbStandings {
  const start = html.indexOf('<table class="table_ap')
  const table = start < 0 ? '' : html.slice(start, html.indexOf('</table>', start))
  const teams = [...table.matchAll(/<tr class="[^"]*">([\s\S]*?)<\/tr>/g)].flatMap(([, row]) => {
    const cells = [...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)].map(([, attrs]) => {
      const value = /data-sort-value="([^"]*)"/.exec(attrs)?.[1]
      return value !== undefined ? Number(value) : NaN
    })
    const position = Number(/<div class="number">\s*<strong>(\d+)<\/strong>/.exec(row)?.[1])
    const abbreviation = text(/class="team_first">([\s\S]*?)<\/strong>/.exec(row)?.[1] ?? '')
    const logo = /<div class="logo"[^>]*>[\s\S]*?<img[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]*)"/.exec(row)
    // Colunas da LNB: 1 aproveitamento (%), 4 jogos, 5 vitórias, 6 derrotas, 9 e 10 pontos pró e contra, 11 saldo, 13 pontos.
    const [pct, games, wins, losses, pointsFor, pointsAgainst, pointsDiff, points] = [1, 4, 5, 6, 9, 10, 11, 13].map((i) => cells[i])
    const numbers = [position, pct, games, wins, losses, pointsFor, pointsAgainst, pointsDiff, points]
    if (!abbreviation || !logo || numbers.some((n) => !Number.isFinite(n))) return []
    return [
      {
        position,
        abbreviation,
        name: text(logo[2]),
        logo: logo[1].replace(/^http:\/\//, 'https://'),
        games,
        wins,
        losses,
        winPct: pct / 100,
        pointsFor,
        pointsAgainst,
        pointsDiff,
        points,
      },
    ]
  })
  if (teams.length < 8) throw new Error('A página da classificação do NBB mudou: tabela não reconhecida.')
  const season = /<option value="\/nbb\/[\d-]+"\s+selected>\s*NBB\s+([\d/]+)/.exec(html)?.[1] ?? ''
  return { season, teams: teams.sort((a, b) => a.position - b.position) }
}

// O filtro da LNB (Cloudflare) devolve 403 a quem não parece um navegador. Nos testes a partir do GitHub Actions, o fetch
// do Node levou 403 mesmo com User-Agent de navegador (o filtro reconhece o jeito como ele abre a conexão), mas o curl passou.
// Por isso: tenta o fetch e, se a LNB recusar, tenta o curl. São páginas públicas, lidas poucas vezes por dia ao publicar o site.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const HEADERS = { 'User-Agent': BROWSER_UA, Accept: 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' }

async function viaFetch(url: string): Promise<string> {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`LNB respondeu ${response.status}`)
  return response.text()
}

async function viaCurl(url: string): Promise<string> {
  const args = ['--silent', '--show-error', '--fail', '--compressed', '--max-time', '30', ...Object.entries(HEADERS).flatMap(([k, v]) => ['-H', `${k}: ${v}`]), url]
  const { stdout } = await promisify(execFile)('curl', args, { maxBuffer: 20 * 1024 * 1024 })
  return stdout
}

async function fetchHtml(url: string): Promise<string> {
  try {
    return await viaFetch(url)
  } catch (error) {
    try {
      return await viaCurl(url)
    } catch {
      throw error
    }
  }
}

export async function fetchNbbStandings(): Promise<NbbStandings> {
  return parseNbbStandings(await fetchHtml(NBB_URL))
}

// ---- Líderes da temporada ----

/** Categorias de líderes: a página da LNB de cada uma tem a mesma tabela, com a média por jogo na 6ª coluna. */
export const NBB_LEADER_CATEGORIES = [
  { id: 'pontos', slug: 'cestinhas', label: 'Pontos', unit: 'pontos por jogo', short: 'pontos' },
  { id: 'rebotes', slug: 'rebotes', label: 'Rebotes', unit: 'rebotes por jogo', short: 'rebotes' },
  { id: 'assistencias', slug: 'assistencias', label: 'Assistências', unit: 'assistências por jogo', short: 'assistências' },
  { id: 'tocos', slug: 'tocos', label: 'Tocos', unit: 'tocos por jogo', short: 'tocos' },
  { id: 'roubos', slug: 'bolas-recuperadas', label: 'Roubos de bola', unit: 'roubos por jogo', short: 'roubos' },
  { id: 'eficiencia', slug: 'eficiencia', label: 'Eficiência', unit: 'de eficiência por jogo', short: 'eficiência' },
] as const

export interface NbbLeader {
  position: number
  /** Como a LNB mostra: sobrenome ou apelido e camisa ("Dupree #11"). */
  name: string
  team: string
  /** Sigla e escudo do time, quando o nome bate com o da classificação (senão, vazios). */
  teamAbbreviation: string
  teamLogo: string
  games: number
  /** Média por jogo. */
  value: number
}

export type NbbLeaderRow = Omit<NbbLeader, 'teamAbbreviation' | 'teamLogo'>

export interface NbbLeaderCategory {
  id: string
  label: string
  unit: string
  short: string
  leaders: NbbLeader[]
}

/** Do HTML da página de uma categoria para os `limit` primeiros; sem tabela reconhecida, lança erro. */
export function parseNbbLeaders(html: string, limit = 10): NbbLeaderRow[] {
  const start = html.indexOf('<table')
  const body = start < 0 ? '' : html.slice(html.indexOf('<tbody', start), html.indexOf('</table>', start))
  const leaders = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].flatMap(([, row]) => {
    const cells = [...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)].map(([, attrs, inner]) => ({
      text: text(inner),
      value: Number(/data-sort-value="([^"]*)"/.exec(attrs)?.[1]),
    }))
    const [position, name, team, games, , value] = cells
    const pos = Number(position?.text)
    if (!name?.text || !team?.text || !Number.isFinite(pos) || !Number.isFinite(value?.value) || !Number.isFinite(games?.value)) return []
    return [{ position: pos, name: name.text, team: team.text, games: games.value, value: value.value }]
  })
  if (!leaders.length) throw new Error('A página de estatísticas do NBB mudou: tabela não reconhecida.')
  return leaders.sort((a, b) => a.position - b.position).slice(0, limit)
}

/** Acrescenta a cada líder a sigla e o escudo do time, pelo nome na classificação (sem correspondência, ficam vazios). */
export function attachTeams(leaders: NbbLeaderRow[], teams: NbbTeam[]): NbbLeader[] {
  const norm = (n: string) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const byName = new Map(teams.map((t) => [norm(t.name), t]))
  return leaders.map((l) => {
    const t = byName.get(norm(l.team))
    return { ...l, teamAbbreviation: t?.abbreviation ?? '', teamLogo: t?.logo ?? '' }
  })
}

/** As categorias que a LNB respondeu; uma que falhar fica de fora, sem derrubar as outras. */
export async function fetchNbbLeaders(teams: NbbTeam[]): Promise<NbbLeaderCategory[]> {
  const results = await Promise.allSettled(NBB_LEADER_CATEGORIES.map(async (c) => attachTeams(parseNbbLeaders(await fetchHtml(nbbLeadersUrl(c.slug))), teams)))
  return NBB_LEADER_CATEGORIES.flatMap(({ id, label, unit, short }, i) => {
    const r = results[i]
    return r.status === 'fulfilled' ? [{ id, label, unit, short, leaders: r.value }] : []
  })
}

// ---- Notícias ----

export interface NbbNews {
  url: string
  title: string
  summary: string
  /** Miniatura hospedada pela LNB; vazia se a notícia não tem foto. */
  image: string
  /** Dia da publicação (a LNB não mostra a hora), no formato AAAA-MM-DD. */
  date: string
}

/** Das notícias da categoria NBB do site da LNB, na ordem da página (as mais recentes primeiro). */
export function parseNbbNews(html: string): NbbNews[] {
  const seen = new Set<string>()
  return html
    .split('class="noticias_jogadores"')
    .slice(1)
    .flatMap((card) => {
      const url = /<a href="(https:\/\/lnb\.com\.br\/noticias\/[^"]+)"/.exec(card)?.[1]
      const title = text(/<div class="titulo_noticias_jogadores"[^>]*>([\s\S]*?)<\/div>/.exec(card)?.[1] ?? '')
      const date = /class="date_cat">\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(card)
      if (!url || !title || !date || seen.has(url)) return []
      seen.add(url)
      return [
        {
          url,
          title,
          summary: text(/<div class="conteudo_noticias_jogadores[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(card)?.[1] ?? ''),
          image: (/<img[^>]*\bsrc="(https?:\/\/[^"]+)"/.exec(card)?.[1] ?? '').replace(/^http:\/\//, 'https://'),
          date: `${date[3]}-${date[2]}-${date[1]}`,
        },
      ]
    })
}

export async function fetchNbbNews(): Promise<NbbNews[]> {
  const news = parseNbbNews(await fetchHtml(NBB_NEWS_URL))
  if (!news.length) throw new Error('A página de notícias do NBB mudou: nenhuma notícia reconhecida.')
  return news
}
