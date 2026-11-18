import assert from 'node:assert/strict'
import { it } from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { conferirLimites, medirPacotes } from './verificar-pacotes.mjs'

it('soma imports estáticos compartilhados uma vez e exclui downloads sob demanda', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'bp-pacotes-'))
  try {
    await mkdir(join(dist, '.vite'))
    const manifest = {
      main: { file: 'main.js', isEntry: true, imports: ['shared'], dynamicImports: ['page', 'Demonstracao3D'] },
      shared: { file: 'shared.js' }, page: { file: 'page.js', imports: ['shared'] },
      Demonstracao3D: { file: '3d.js' },
    }
    await writeFile(join(dist, '.vite/manifest.json'), JSON.stringify(manifest))
    for (const [name, value] of Object.entries(manifest)) await writeFile(join(dist, value.file), `${name} `.repeat(100))
    const medidas = await medirPacotes(dist)
    assert.deepEqual(medidas.arquivos.filter((a) => a.inicial).map((a) => a.chave).sort(), ['main', 'shared'])
    conferirLimites(medidas)
    assert.throws(() => conferirLimites({ ...medidas, inicialGzip: 110_001 }), /ultrapassam/)
    manifest.main.imports.push('Demonstracao3D')
    await writeFile(join(dist, '.vite/manifest.json'), JSON.stringify(manifest))
    await assert.rejects(medirPacotes(dist), /separada/)
  } finally {
    // Criado por mkdtemp dentro do temporário do sistema, sem dados do projeto.
    assert.ok(dist.startsWith(join(tmpdir(), 'bp-pacotes-')))
    await rm(dist, { recursive: true, force: true })
  }
})
