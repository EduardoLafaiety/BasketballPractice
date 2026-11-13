import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

// Classificação do NBB (Novo Basquete Brasil), lida da página pública da LNB (Liga Nacional de Basquete).
// A LNB não tem API e a página não libera leitura pelo navegador (CORS), então a leitura é feita aqui, ao publicar
// o site, e vira um JSON estático (src/scripts/export-nbb.ts).

export const NBB_URL = 'https://lnb.com.br/nbb/classificacao/'

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

const text = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
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
// Por isso: tenta o fetch e, se a LNB recusar, tenta o curl. É uma página pública, lida poucas vezes por dia ao publicar o site.
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const HEADERS = { 'User-Agent': BROWSER_UA, Accept: 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' }

async function viaFetch(): Promise<string> {
  const response = await fetch(NBB_URL, { headers: HEADERS, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`LNB respondeu ${response.status}`)
  return response.text()
}

async function viaCurl(): Promise<string> {
  const args = ['--silent', '--show-error', '--fail', '--compressed', '--max-time', '30', ...Object.entries(HEADERS).flatMap(([k, v]) => ['-H', `${k}: ${v}`]), NBB_URL]
  const { stdout } = await promisify(execFile)('curl', args, { maxBuffer: 20 * 1024 * 1024 })
  return stdout
}

export async function fetchNbbStandings(): Promise<NbbStandings> {
  let html: string
  try {
    html = await viaFetch()
  } catch (error) {
    try {
      html = await viaCurl()
    } catch {
      throw error
    }
  }
  return parseNbbStandings(html)
}
