import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve, basename } from 'node:path'
import { test } from 'node:test'
import { analisarArquitetura } from './arquitetura.mjs'

function fixture(files) {
  const parent = resolve(tmpdir())
  const root = mkdtempSync(join(parent, 'bp-arquitetura-'))
  try {
    for (const [name, content] of Object.entries(files)) {
      const path = join(root, name)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content)
    }
    return analisarArquitetura(root, { checkGit: false })
  } finally {
    if (dirname(resolve(root)) !== parent || !basename(root).startsWith('bp-arquitetura-')) throw new Error('Destino temporário inesperado')
    rmSync(root, { recursive: true, force: true })
  }
}

test('comentários e textos não viram consultas; dependências somente de tipo não formam ciclo de execução', () => {
  assert.deepEqual(fixture({
    'backend/src/modules/novo/novo.service.ts': "// db.query('SQL')\nexport const texto = 'db.transaction() e from fake'",
    'backend/src/a.ts': "import type { B } from './b.js'; export interface A { b?: B }",
    'backend/src/b.ts': "import type { A } from './a.js'; export interface B { a?: A }",
    'backend/src/db/index.ts': 'export const one = () => null',
    'backend/src/modules/novo/tipo.service.ts': "import type { one } from '../../db/index.js'; export type Reader = typeof one",
  }), [])
})

test('módulos futuros também recusam persistência nas rotas e SQL nos serviços', () => {
  const errors = fixture({
    'backend/src/db/index.ts': 'export const one = () => null',
    'backend/src/modules/novo/novo.repository.ts': 'export const read = () => null',
    'backend/src/modules/novo/novo.routes.ts': "import { read } from './novo.repository.js'; export const run = (db: any) => db.transaction(read)",
    'backend/src/modules/novo/novo.service.ts': "import { one as read } from '../../db/index.js'; export const run = (db: any) => db['query']('SELECT 1')",
  }).join('\n')
  assert.match(errors, /persistência\/transação deve ficar fora/)
  assert.match(errors, /rota deve acessar o caso de uso/)
  assert.match(errors, /SQL deve ficar no repositório/)
  assert.match(errors, /auxiliares SQL devem ficar no repositório/)
})

test('reexports também respeitam a direção entre modelos, persistência e transporte', () => {
  const errors = fixture({
    'backend/src/modules/a/a.routes.ts': 'export const router = 1',
    'backend/src/modules/a/a.service.ts': 'export const run = 1',
    'backend/src/modules/a/a.repository.ts': "export { run } from './a.service.js'; export { router } from './a.routes.js'",
    'backend/src/modules/a/a.schema.ts': "export { run } from './a.service.js'",
  }).join('\n')
  assert.match(errors, /persistência depende de serviço/)
  assert.match(errors, /domínio depende de rota HTTP/)
  assert.match(errors, /modelo\/contrato depende de serviço\/persistência/)
})

test('ciclos são encontrados em reexports e imports dinâmicos literais', () => {
  assert.match(fixture({
    'backend/src/a.ts': "export { b } from './b.js'",
    'backend/src/b.ts': "export const b = () => import('./a.js')",
  }).join('\n'), /Ciclo de dependência no backend/)
})

test('importação default continua sendo execução mesmo com tipos nomeados ao lado', () => {
  assert.match(fixture({
    'backend/src/a.ts': "import value, { type B } from './b.js'; export const a = value",
    'backend/src/b.ts': "import { a } from './a.js'; export default a; export interface B {}",
  }).join('\n'), /Ciclo de dependência no backend/)
})

test('contratos compartilhados são só tipos e declarações .d.ts são resolvidas', () => {
  assert.deepEqual(fixture({
    'contracts/item.d.ts': 'export interface Item { id: number }',
    'backend/src/item.ts': "import type { Item } from '../../contracts/item.js'; export type Row = Item",
  }), [])
  assert.match(fixture({ 'contracts/ruim.ts': 'export const runtime = true' }).join('\n'), /apenas declarações de tipos/)
  assert.match(fixture({
    'contracts/ruim.d.ts': "export type Item = import('../backend/src/item.js').Item",
    'backend/src/item.ts': 'export interface Item { id: number }',
  }).join('\n'), /contrato compartilhado depende de implementação/)
})

test('fronteiras do frontend, imports ausentes e transporte nas regras são verificados', () => {
  const errors = fixture({
    'frontend/src/features/a.ts': 'export const feature = 1',
    'frontend/src/shared/a.ts': "import { feature } from '../features/a'; import './ausente'",
    'backend/src/modules/a/a.service.ts': "import { Router } from 'express'",
    'backend/src/modules/a/a.generator.ts': "import pg from 'pg'",
  }).join('\n')
  assert.match(errors, /shared depende de camada superior/)
  assert.match(errors, /import ausente/)
  assert.match(errors, /depende de transporte HTTP/)
  assert.match(errors, /modelo\/contrato depende de infraestrutura/)
})
