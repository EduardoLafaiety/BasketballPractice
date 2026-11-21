const source = require('./source.json')
const en = { ...require('../../src/shared/i18n/en.json'), ...require('../../src/shared/i18n/revisao-en.json'), ...require('../../src/shared/i18n/exercicios-en.json'), ...require('../../src/shared/i18n/landing-en.json'), ...require('../../src/shared/i18n/billing-en.json'), ...require('../../src/shared/i18n/admin-en.json') }
const missing = source.filter(key => !Object.hasOwn(en, key))
const placeholders = text => (text.match(/\{\d+\}/g) || []).sort().join(',')
const changed = source.filter(key => Object.hasOwn(en, key) && placeholders(key) !== placeholders(en[key]))
if (missing.length || changed.length) {
  console.error(JSON.stringify({ missing, changed }, null, 2))
  process.exitCode = 1
} else console.log(`${source.length} textos cobertos; parâmetros preservados`)
