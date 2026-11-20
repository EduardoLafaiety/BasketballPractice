// Geração editorial: apenas textos fixos do produto; nunca dados de usuários.
// A aplicação usa o JSON local e não faz chamadas de tradução em produção.
const fs = require('node:fs')
const path = require('node:path')
const source = require('./source.json')
const glossary = require('./glossary.cjs')
function preparar(text) {
  for (const [pt, en] of glossary) text = text.replace(new RegExp(`(?<![a-zÀ-ÿ])${pt}(?![a-zÀ-ÿ])`, 'gi'), en)
  if (/aro|cesta|arremess|bandeja|rebote|bola|layup|shot|basket|court/i.test(text)) text = text.replace(/\btabela\b/gi, 'backboard')
  return text
}
const output = path.resolve(__dirname, '../../src/shared/i18n/en.json')
const translated = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : {}
if (process.argv.includes('--glossary')) for (const text of source) {
  if (preparar(text) !== text) delete translated[text]
}
const remaining = source.filter(s => !Object.hasOwn(translated, s))
const batches = []
let batch = [], size = 0
for (const text of remaining) {
  if (size + text.length > 1600 && batch.length) { batches.push(batch); batch = []; size = 0 }
  batch.push(text); size += text.length + 12
}
if (batch.length) batches.push(batch)
let next = 0, finished = 0
async function save() {
  for (let attempt = 0; ; attempt++) {
    try { fs.writeFileSync(output, JSON.stringify(Object.fromEntries(Object.entries(translated).sort()), null, 2) + '\n'); return }
    catch (error) { if (attempt >= 5) throw error; await new Promise(r => setTimeout(r, 300)) }
  }
}
async function translate(items) {
  const q = items.map((s, i) => `[${String(i).padStart(5, '0')}] ${preparar(s)}`).join('\n')
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  for (const [k, v] of Object.entries({ client: 'gtx', sl: 'pt', tl: 'en', dt: 't', q })) url.searchParams.set(k, v)
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  const result = data[0].map(s => s[0]).join('')
  const parts = [...result.matchAll(/\[\s*(\d{5})\s*\]\s*([\s\S]*?)(?=\[\s*\d{5}\s*\]|$)/g)]
  if (parts.length !== items.length) throw new Error('Quantidade de marcadores diferente do original')
  for (const part of parts) {
    const original = items[Number(part[1])]
    const english = part[2].trim().replace(/\{\s*(\d+)\s*\}/g, '{$1}')
    const placeholders = text => (text.match(/\{\d+\}/g) || []).sort().join(',')
    if (placeholders(original) !== placeholders(english)) throw new Error('Marcador variável alterado')
    translated[original] = english
  }
}
async function worker() {
  while (next < batches.length) {
    const index = next++
    let success = false
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await translate(batches[index]); success = true; break }
      catch (error) { if (attempt === 2) console.error(`Lote ${index}: ${error.message}`); else await new Promise(r => setTimeout(r, 1500 * (attempt + 1))) }
    }
    if (!success) {
      for (const item of batches[index]) { try { await translate([item]) } catch (error) { console.error(`Texto pendente: ${item.slice(0, 60)}: ${error.message}`) } }
    }
    finished++; await save()
    if (finished % 10 === 0 || finished === batches.length) console.log(`${finished}/${batches.length} lotes; ${Object.keys(translated).length}/${source.length} textos`)
  }
}
Promise.all([worker(), worker(), worker()]).then(() => {
  const missing = source.filter(s => !Object.hasOwn(translated, s))
  if (missing.length) { console.error(`${missing.length} traduções pendentes`); process.exitCode = 1 }
})
