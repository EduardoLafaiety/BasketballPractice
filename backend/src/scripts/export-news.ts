// Gera o JSON de notícias da demonstração, que não tem servidor: npx tsx src/scripts/export-news.ts <arquivo>
// Sem chave ou com o GNews fora do ar, saem as manchetes escritas à mão: a barra continua e a publicação não falha.
import { writeFile } from 'node:fs/promises'
import { staticSiteNews } from '../lib/curated-news.js'
import { fetchHeadlines } from '../lib/news.js'

const [file] = process.argv.slice(2)
if (!file) {
  console.error('Uso: npx tsx src/scripts/export-news.ts <arquivo>')
  process.exit(1)
}

const apiKey = process.env.GNEWS_API_KEY
let headlines: Awaited<ReturnType<typeof fetchHeadlines>> = []
if (apiKey) {
  try {
    headlines = await fetchHeadlines(apiKey)
  } catch (error) {
    console.error(`Notícias: ${(error as Error).message}`)
  }
}

const items = staticSiteNews(headlines)
await writeFile(file, JSON.stringify(items))
console.log(`${items.length} manchetes em ${file}`)
