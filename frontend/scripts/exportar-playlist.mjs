// Baixa a lista de faixas da playlist da Trilha da quadra para public/playlist.json.
// Roda antes de cada build: trocar as músicas no Spotify chega ao site na próxima publicação.
// Sem rede ou se o Spotify mudar a página, mantém o arquivo que já existe e o build segue.
import { writeFile } from 'node:fs/promises'

const PLAYLIST_ID = '0rshzJAoeKoS8nYiBCAEJG'
const DESTINO = new URL('../public/playlist.json', import.meta.url)

try {
  const resposta = await fetch(`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}`, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
  const html = await resposta.text()
  const dados = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1]
  if (!dados) throw new Error('página sem os dados da playlist')
  const entidade = JSON.parse(dados).props.pageProps.state.data.entity
  const faixas = entidade.trackList
    .filter((f) => f.isPlayable !== false && f.uri?.startsWith('spotify:track:'))
    .map((f) => ({ id: f.uri.slice('spotify:track:'.length), titulo: f.title, artista: f.subtitle, duracao: f.duration }))
  if (!faixas.length) throw new Error('playlist vazia')
  await writeFile(DESTINO, JSON.stringify({ id: PLAYLIST_ID, nome: entidade.name.trim(), faixas }, null, 2) + '\n')
  console.log(`Playlist: ${faixas.length} faixas em public/playlist.json`)
} catch (erro) {
  console.warn(`Playlist não atualizada (${erro.message}); fica a lista que já estava no repositório.`)
}
