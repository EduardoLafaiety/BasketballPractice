import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { LADO, pixelsDaBola } from '../src/shared/ui/bolaPixel.ts'

// A mesma arte e paleta da bola principal, sem desenhar uma segunda versão da marca.
const rgba = pixelsDaBola()
const raw = { width: LADO, height: LADO, channels: 4 }
const icons = [['favicon-16.png', 16], ['favicon-32.png', 32], ['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]
for (const [name, size] of icons) {
  await sharp(rgba, { raw }).resize(size, size, { kernel: 'nearest' }).png().toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)))
}
const colors = new Map()
for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
  const p = (y * LADO + x) * 4
  if (!rgba[p + 3]) continue
  const color = `#${[...rgba.slice(p, p + 3)].map(c => c.toString(16).padStart(2, '0')).join('')}`
  colors.set(color, (colors.get(color) ?? '') + `M${x} ${y}h1v1h-1z`)
}
await writeFile(new URL('../public/icon.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}" shape-rendering="crispEdges">${[...colors].map(([color, d]) => `<path fill="${color}" d="${d}"/>`).join('')}</svg>\n`)
console.log('Ícones gerados com a bola padrão e fundo transparente.')
