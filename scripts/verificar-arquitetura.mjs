import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const raiz = resolve(import.meta.dirname, '..')
const normalizar = (p) => relative(raiz, p).replaceAll('\\', '/')
function arquivos(p) {
  return readdirSync(p, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? arquivos(resolve(p, e.name)) : [resolve(p, e.name)])
}
const erros = []
const ignorados = spawnSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', '--', 'backend/src', 'frontend/src'], { cwd: raiz, encoding: 'utf8' })
if (ignorados.status === 0) for (const p of ignorados.stdout.trim().split('\n').filter((p) => /\.(ts|tsx|mjs)$/.test(p))) erros.push(`Código-fonte ignorado pelo Git: ${p}`)
for (const arquivo of ['frontend/src', 'backend/src'].flatMap((p) => arquivos(resolve(raiz, p))).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\./.test(p))) {
  const origem = normalizar(arquivo)
  const texto = readFileSync(arquivo, 'utf8')
  for (const [, caminho] of texto.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
    if (!caminho.startsWith('.')) continue
    const alvo = resolve(dirname(arquivo), caminho)
    const destino = normalizar(alvo)
    if (origem.startsWith('frontend/src/') && !origem.startsWith('frontend/src/demo/') && destino.startsWith('backend/')) erros.push(`${origem}: somente o adaptador demo pode importar o backend`)
    if (!['', '.ts', '.tsx', '.json', '.d.ts'].some((ext) => existsSync(alvo + ext) && statSync(alvo + ext).isFile()) && !existsSync(alvo.replace(/\.js$/, '.ts')) && !existsSync(alvo.replace(/\.js$/, '.d.ts'))) erros.push(`${origem}: import ausente ${caminho}`)
    if (origem.startsWith('frontend/src/shared/') && /frontend\/src\/(app|features)\//.test(destino)) erros.push(`${origem}: shared depende de camada superior ${destino}`)
    if (origem.startsWith('frontend/src/features/') && destino.startsWith('frontend/src/app/')) erros.push(`${origem}: feature depende da composição app`)
    if (/\.(service|repository|generator|schema)\.ts$/.test(origem) && destino.endsWith('.routes.js')) erros.push(`${origem}: regra/persistência depende de rota HTTP`)
    if (origem.endsWith('.routes.ts') && destino.endsWith('.routes.js')) erros.push(`${origem}: rota depende de outra rota; extraia um contrato ou serviço`)
    if (origem.endsWith('.generator.ts') && /from ['"](?:express|pg)['"]/.test(texto)) erros.push(`${origem}: gerador depende de infraestrutura`)
  }
}
if (erros.length) { process.stderr.write(erros.join('\n') + '\n'); process.exitCode = 1 }
else process.stdout.write('Arquitetura verificada: imports válidos e dependências entre camadas preservadas.\n')
