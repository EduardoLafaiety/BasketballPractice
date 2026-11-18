import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, relative, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

// Reutiliza o compilador já declarado no backend; não adiciona dependência à aplicação.
const ts = createRequire(new URL('../backend/package.json', import.meta.url))('typescript')
const sources = (p) => !existsSync(p) ? [] : readdirSync(p, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? sources(join(p, e.name)) : /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [join(p, e.name)] : [])

function resolveImport(file, specifier) {
  const path = resolve(dirname(file), specifier)
  return [path, path + '.ts', path + '.tsx', path + '.d.ts', path.replace(/\.js$/, '.ts'),
    path.replace(/\.js$/, '.tsx'), path.replace(/\.js$/, '.d.ts'), join(path, 'index.ts'), join(path, 'index.tsx')]
    .find((p) => existsSync(p) && statSync(p).isFile())
}

export function analisarArquitetura(root, { checkGit = true } = {}) {
  const errors = []
  const name = (p) => relative(root, p).replaceAll('\\', '/')
  const graph = new Map()
  if (checkGit) {
    const ignored = spawnSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', '--', 'backend/src', 'frontend/src', 'contracts'], { cwd: root, encoding: 'utf8' })
    if (ignored.status !== 0) errors.push('Não foi possível verificar fontes ignoradas pelo Git')
    else for (const p of ignored.stdout.trim().split('\n').filter((p) => /\.(ts|tsx|mjs)$/.test(p))) errors.push(`Código-fonte ignorado pelo Git: ${p}`)
  }
  for (const file of ['backend/src', 'frontend/src', 'contracts'].flatMap((p) => sources(resolve(root, p)))) {
    const origin = name(file)
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const backend = origin.startsWith('backend/src/')
    const domain = origin.startsWith('backend/src/modules/')
    const route = origin.endsWith('.routes.ts')
    const service = origin.endsWith('.service.ts')
    const repository = origin.endsWith('.repository.ts')
    const pure = /\.(schema|model|generator|catalog|types)\.ts$/.test(origin)
    const contract = origin.startsWith('contracts/')
    const imports = []
    if (source.parseDiagnostics.length) errors.push(`${origin}: sintaxe TypeScript inválida`)
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = ts.isImportDeclaration(node) ? node.importClause : undefined
        const bindings = clause?.namedBindings
        const exported = ts.isExportDeclaration(node) ? node.exportClause : undefined
        const elements = bindings && ts.isNamedImports(bindings) ? bindings.elements : exported && ts.isNamedExports(exported) ? exported.elements : []
        const typeOnly = Boolean(node.isTypeOnly || clause?.isTypeOnly || !clause?.name && elements.length && elements.every((e) => e.isTypeOnly))
        imports.push({ specifier: node.moduleSpecifier.text, typeOnly, elements })
      }
      if (ts.isCallExpression(node)) {
        const expr = node.expression
        if ((expr.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(expr) && expr.text === 'require') && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          imports.push({ specifier: node.arguments[0].text, typeOnly: false, elements: [] })
        }
        const member = ts.isPropertyAccessExpression(expr) ? expr.name.text :
          ts.isElementAccessExpression(expr) && ts.isStringLiteral(expr.argumentExpression) ? expr.argumentExpression.text : undefined
        if (domain && member) {
          if (route && ['query', 'transaction'].includes(member)) errors.push(`${origin}: persistência/transação deve ficar fora da rota HTTP`)
          if (!repository && member === 'query') errors.push(`${origin}: SQL deve ficar no repositório`)
        }
      }
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        imports.push({ specifier: node.argument.literal.text, typeOnly: true, elements: [] })
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    if (contract) for (const statement of source.statements) {
      const allowed = ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
        ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly ||
        ts.isExportDeclaration(statement) && statement.isTypeOnly
      if (!allowed) errors.push(`${origin}: contrato compartilhado deve conter apenas declarações de tipos`)
    }
    const edges = []
    for (const { specifier, typeOnly, elements } of imports) {
      if (contract && !specifier.startsWith('.')) errors.push(`${origin}: contrato compartilhado depende de pacote externo`)
      if (domain && (pure || service || repository) && /^(express|node:http|node:https)$/.test(specifier)) errors.push(`${origin}: domínio/persistência depende de transporte HTTP`)
      if (domain && pure && /^(pg|web-push|node:fs|node:fs\/promises)$/.test(specifier)) errors.push(`${origin}: modelo/contrato depende de infraestrutura`)
      if (!specifier.startsWith('.')) continue
      const target = resolveImport(file, specifier)
      if (!target) { errors.push(`${origin}: import ausente ${specifier}`); continue }
      const destination = name(target)
      if (contract && !destination.startsWith('contracts/')) errors.push(`${origin}: contrato compartilhado depende de implementação`)
      if (backend && !typeOnly && destination.startsWith('backend/src/')) edges.push(target)
      if (origin.startsWith('frontend/src/') && !origin.startsWith('frontend/src/demo/') && destination.startsWith('backend/')) errors.push(`${origin}: somente o adaptador demo pode importar o backend`)
      if (origin.startsWith('frontend/src/shared/') && /frontend\/src\/(app|features)\//.test(destination)) errors.push(`${origin}: shared depende de camada superior ${destination}`)
      if (origin.startsWith('frontend/src/features/') && destination.startsWith('frontend/src/app/')) errors.push(`${origin}: feature depende da composição app`)
      if (domain && /backend\/src\/(app|server)\.ts$/.test(destination)) errors.push(`${origin}: domínio depende da composição da aplicação`)
      if (domain && destination.endsWith('.routes.ts')) errors.push(`${origin}: domínio depende de rota HTTP`)
      if (domain && route && destination.endsWith('.repository.ts')) errors.push(`${origin}: rota deve acessar o caso de uso, não o repositório`)
      if (domain && pure && /\.(service|repository)\.ts$/.test(destination)) errors.push(`${origin}: modelo/contrato depende de serviço/persistência`)
      if (domain && pure && destination === 'backend/src/db/index.ts' && !typeOnly) errors.push(`${origin}: modelo/contrato depende da conexão com banco`)
      if (domain && repository && destination.endsWith('.service.ts')) errors.push(`${origin}: persistência depende de serviço`)
      if (domain && !repository && !typeOnly && destination === 'backend/src/db/index.ts' && elements.some((e) => !e.isTypeOnly && ['one', 'many'].includes(e.propertyName?.text ?? e.name.text))) errors.push(`${origin}: auxiliares SQL devem ficar no repositório`)
    }
    if (backend) graph.set(file, edges)
  }
  const visited = new Set(), active = new Set(), path = []
  const walk = (file) => {
    if (active.has(file)) { errors.push(`Ciclo de dependência no backend: ${[...path.slice(path.indexOf(file)), file].map(name).join(' → ')}`); return }
    if (visited.has(file)) return
    visited.add(file); active.add(file); path.push(file)
    for (const target of graph.get(file) ?? []) walk(target)
    path.pop(); active.delete(file)
  }
  for (const file of graph.keys()) walk(file)
  return [...new Set(errors)]
}
