// Gera o JSON do NBB da demonstração, que não tem servidor: npx tsx src/scripts/export-nbb.ts <arquivo>
// Tem a classificação, os líderes da temporada e as notícias, lidos do site da LNB. Cada parte falha sozinha: o que a LNB
// não entregar fica vazio e a página da NBB avisa. Se nada vier, não cria o arquivo e sai sem erro: a publicação segue.
import { writeFile } from 'node:fs/promises'
import { fetchNbbLeaders, fetchNbbNews, fetchNbbStandings, type NbbTeam } from '../lib/nbb.js'

const [file] = process.argv.slice(2)
if (!file) {
  console.error('Uso: npx tsx src/scripts/export-nbb.ts <arquivo>')
  process.exit(1)
}

const failures: string[] = []
async function part<T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`)
    return fallback
  }
}

const standings = await part('classificação', fetchNbbStandings, { season: '', teams: [] as NbbTeam[] })
const [leaders, news] = await Promise.all([part('líderes', () => fetchNbbLeaders(standings.teams), []), part('notícias', fetchNbbNews, [])])

failures.forEach((f) => console.error(`NBB, ${f}`))
if (!standings.teams.length && !leaders.length && !news.length) {
  console.error('NBB: nada foi lido da LNB. Arquivo não gerado.')
} else {
  await writeFile(file, JSON.stringify({ ...standings, leaders, news, updatedAt: new Date().toISOString() }))
  console.log(`NBB ${standings.season}: ${standings.teams.length} times, ${leaders.length} categorias de líderes e ${news.length} notícias em ${file}`)
}
