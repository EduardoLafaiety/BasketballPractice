import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

export const LIMITES = { inicialGzip: 110_000, demonstracaoGzip: 180_000 }

export async function medirPacotes(dist) {
  const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'))
  const entradas = Object.entries(manifest).filter(([, item]) => item.isEntry)
  if (!entradas.length) throw new Error('Manifesto sem entrada')
  const iniciais = new Set()
  function visitar(chave) {
    if (iniciais.has(chave)) return
    const item = manifest[chave]
    if (!item) throw new Error(`Importação ausente: ${chave}`)
    iniciais.add(chave)
    for (const dependencia of item.imports ?? []) visitar(dependencia)
  }
  for (const [chave] of entradas) visitar(chave)
  const arquivos = await Promise.all(Object.entries(manifest).filter(([, item]) => item.file.endsWith('.js')).map(async ([chave, item]) => {
    const bytes = await readFile(resolve(dist, item.file))
    return { chave, arquivo: item.file, bytes: bytes.length, gzip: gzipSync(bytes).length, inicial: iniciais.has(chave) }
  }))
  if (arquivos.some((a) => /pglite|src\/demo\/servidor/.test(a.chave))) throw new Error('Banco da demonstração presente no build de produção')
  const demonstracao = arquivos.find((a) => /Demonstracao3D/.test(a.chave))
  if (!demonstracao || demonstracao.inicial) throw new Error('Demonstração 3D precisa continuar separada da entrada')
  const inicialGzip = arquivos.filter((a) => a.inicial).reduce((n, a) => n + a.gzip, 0)
  return { inicialGzip, demonstracaoGzip: demonstracao.gzip, limites: LIMITES, arquivos }
}

export function conferirLimites(medidas) {
  for (const [nome, limite] of Object.entries(LIMITES)) {
    if (medidas[nome] > limite) throw new Error(`${nome}: ${medidas[nome]} bytes ultrapassam ${limite}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dist = resolve(process.argv[2] ?? 'frontend/dist')
  const medidas = await medirPacotes(dist)
  await writeFile(resolve(dist, 'pacotes.json'), JSON.stringify(medidas, null, 2))
  conferirLimites(medidas)
  console.log(`Pacotes gzip: entrada ${medidas.inicialGzip}/${LIMITES.inicialGzip}; 3D ${medidas.demonstracaoGzip}/${LIMITES.demonstracaoGzip} bytes`)
}
