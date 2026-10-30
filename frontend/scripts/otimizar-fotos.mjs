// Gera as versões WebP das fotos dos jogadores a partir dos JPGs originais (src/assets/jogadores).
// Cada foto sai em dois tamanhos: 300 px para os cards da lista e 520 px para telas de alta
// densidade e o perfil grande. Rode `npm run fotos` sempre que trocar ou adicionar uma foto.
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const pasta = fileURLToPath(new URL('../src/assets/jogadores/', import.meta.url))
const LARGURAS = [300, 520]

let antes = 0
let depois = 0
for (const arquivo of (await readdir(pasta)).filter((a) => a.endsWith('.jpg'))) {
  const origem = join(pasta, arquivo)
  antes += (await stat(origem)).size
  for (const largura of LARGURAS) {
    const destino = join(pasta, arquivo.replace(/\.jpg$/, `-${largura}.webp`))
    await sharp(origem).resize({ width: largura, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(destino)
    if (largura === 520) depois += (await stat(destino)).size
  }
}
const kb = (b) => `${Math.round(b / 1024)} KB`
console.log(`Fotos: ${kb(antes)} em JPG -> ${kb(depois)} em WebP (520 px)`)
