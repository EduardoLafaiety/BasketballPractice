// Gera o JSON da classificação do NBB da demonstração, que não tem servidor: npx tsx src/scripts/export-nbb.ts <arquivo>
// Se a LNB estiver fora do ar ou a página mudar, não cria o arquivo e sai sem erro: a publicação segue e a página
// da NBB mostra que a classificação está indisponível.
import { writeFile } from 'node:fs/promises'
import { fetchNbbStandings } from '../lib/nbb.js'

const [file] = process.argv.slice(2)
if (!file) {
  console.error('Uso: npx tsx src/scripts/export-nbb.ts <arquivo>')
  process.exit(1)
}

try {
  const standings = await fetchNbbStandings()
  await writeFile(file, JSON.stringify({ ...standings, updatedAt: new Date().toISOString() }))
  console.log(`NBB ${standings.season}: ${standings.teams.length} times em ${file}`)
} catch (error) {
  console.error(`NBB: ${(error as Error).message}. Classificação não gerada.`)
}
