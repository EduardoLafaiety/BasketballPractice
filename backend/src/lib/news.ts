import { z } from 'zod'
import { many, one, type Database } from '../db/index.js'

const GNEWS_SEARCH = 'https://gnews.io/api/v4/search'
const QUERY = new URLSearchParams({ q: 'basquete OR NBA OR NBB', lang: 'pt', in: 'title', sortby: 'publishedAt', max: '10' })
// Guarda pouco: é cache para a barra, não um arquivo de notícias (os termos do GNews só permitem cache razoável).
const MAX_AGE_MS = 7 * 24 * 60 * 60_000
const TICK_MS = 60_000

export type Headline = { title: string; sourceName: string; url: string; publishedAt: string }

export type NewsItem = {
  id: number
  origin: 'admin' | 'gnews'
  title: string
  sourceName: string | null
  url: string | null
  publishedAt: Date
  expiresAt: Date | null
}

// Só título, fonte e link: o texto e as imagens das matérias são dos veículos e não são guardados.
const articleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  url: z.string().url().regex(/^https?:\/\//i),
  publishedAt: z.string().datetime({ offset: true }),
  source: z.object({ name: z.string().trim().min(1).max(120) }),
})

/** Manchetes recentes de basquete em português. A chave vai no cabeçalho, para nunca aparecer em URL nem em log. */
export async function fetchHeadlines(apiKey: string, request: typeof fetch = fetch): Promise<Headline[]> {
  const response = await request(`${GNEWS_SEARCH}?${QUERY}`, {
    headers: { 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`GNews respondeu ${response.status}`)

  const { articles } = (await response.json()) as { articles?: unknown }
  const oldest = Date.now() - MAX_AGE_MS
  return (Array.isArray(articles) ? articles : []).flatMap((article) => {
    const parsed = articleSchema.safeParse(article)
    if (!parsed.success || Date.parse(parsed.data.publishedAt) < oldest) return []
    const { title, url, publishedAt, source } = parsed.data
    return [{ title, url, publishedAt, sourceName: source.name }]
  })
}

/**
 * Busca manchetes novas se o intervalo já passou. A hora da tentativa fica no banco: reiniciar a API ou subir
 * outra instância não gasta a cota, e uma falha só tenta de novo no próximo intervalo.
 * Devolve quantas entraram, ou null se ainda não era hora.
 */
export async function syncNews(
  db: Database,
  { apiKey, intervalMinutes, request }: { apiKey: string; intervalMinutes: number; request?: typeof fetch },
) {
  const due = await one(
    db,
    `UPDATE news_sync SET last_attempt_at = now()
     WHERE last_attempt_at IS NULL OR last_attempt_at <= now() - make_interval(mins => $1::int)
     RETURNING id`,
    [intervalMinutes],
  )
  if (!due) return null

  const headlines = await fetchHeadlines(apiKey, request)
  return db.transaction(async (tx) => {
    await tx.query(`DELETE FROM news_items WHERE origin = 'gnews' AND published_at < $1`, [new Date(Date.now() - MAX_AGE_MS)])
    let inserted = 0
    for (const h of headlines) {
      // Se já existe, fica como está: o que o admin escondeu não volta.
      const { rowCount } = await tx.query(
        `INSERT INTO news_items (origin, title, source_name, url, published_at) VALUES ('gnews', $1, $2, $3, $4)
         ON CONFLICT (url) WHERE origin = 'gnews' DO NOTHING`,
        [h.title, h.sourceName, h.url, h.publishedAt],
      )
      inserted += rowCount
    }
    return inserted
  })
}

/** Mantém as manchetes atualizadas enquanto a API estiver no ar. Sem chave, a barra mostra só as do admin. */
export function startNewsSync(db: Database, options: { apiKey: string; intervalMinutes: number }) {
  if (!options.apiKey) return () => {}
  const tick = () => syncNews(db, options).catch((error: Error) => console.error(`Notícias: ${error.message}`))
  void tick()
  const timer = setInterval(tick, TICK_MS)
  return () => clearInterval(timer)
}

/** O que a barra mostra: as manchetes do admin primeiro, depois as mais recentes. */
export function listNews(db: Database) {
  return many<NewsItem>(
    db,
    `SELECT id, origin, title, source_name AS "sourceName", url, published_at AS "publishedAt", expires_at AS "expiresAt"
     FROM news_items
     WHERE NOT hidden AND (expires_at > now() OR (origin = 'gnews' AND published_at > $1))
     ORDER BY origin = 'admin' DESC, published_at DESC
     LIMIT 15`,
    [new Date(Date.now() - MAX_AGE_MS)],
  )
}
