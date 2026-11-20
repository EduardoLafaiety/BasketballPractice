const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
const entries = new Set()
function add(text, visible = false) {
  text = text.replace(/\s+/g, ' ').trim()
  if (!text || !/[a-zÀ-ÿ]/i.test(text) || text.length < 2) return
  if (/^(?:[.#][\w-]+$|\/|https?:|var\(|url\(|--|GET |POST |PUT |PATCH |DELETE )/.test(text)) return
  if (!visible && !/[À-ÿ\s]/.test(text) && !/^[A-Z][a-z]+$/.test(text)) return
  if (/[{}<>]|=>/.test(text.replace(/\{\d+\}/g, ''))) return
  if (/^[\w./@:#-]+\.(?:ts|tsx|js|css|webp|jpg|png|svg|glb|woff2)$/.test(text)) return
  entries.add(text)
}
function read(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  function visit(node) {
    if (ts.isJsxText(node)) add(node.text, true)
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node.text)
    if (ts.isTemplateExpression(node)) {
      add(node.head.text + node.templateSpans.map((span, i) => `{${i}}` + span.literal.text).join(''))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name)
    if (ent.isDirectory() && !['test', 'i18n', 'assets', 'demo', 'dev'].includes(ent.name)) walk(file)
    else if (ent.isFile() && /\.tsx?$/.test(file) && !/\.test\./.test(file)) read(file)
  }
}
walk(path.join(root, 'src'))
read(path.join(root, 'src/assets/artigos/fotos.ts'))
read(path.join(root, 'src/assets/jogadores/fotos.ts'))
read(path.join(root, 'src/assets/jogadores/times.ts'))
read(path.join(root, '../backend/src/db/catalog.ts'))
read(path.join(root, '../backend/src/modules/styles/style.catalog.ts'))
read(path.join(root, '../backend/src/db/programs.ts'))
read(path.join(root, '../backend/src/db/programs-extra.ts'))
function json(value) {
  if (typeof value === 'string') add(value)
  else if (Array.isArray(value)) value.forEach(json)
  else if (value && typeof value === 'object') Object.values(value).forEach(json)
}
json(JSON.parse(fs.readFileSync(path.join(root, 'src/features/demonstracoes/referencias/catalogo.json'), 'utf8')))
fs.writeFileSync(path.join(__dirname, 'source.json'), JSON.stringify([...entries].sort(), null, 2) + '\n')
console.log(`${entries.size} textos estáticos extraídos`)
