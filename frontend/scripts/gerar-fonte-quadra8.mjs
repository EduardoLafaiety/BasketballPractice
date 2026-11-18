/**
 * Gera a fonte "Quadra 8" (src/assets/fonts/quadra-8.woff), a face de destaque do site.
 *
 * Cada letra é desenhada numa grade de 5×7 células, com o traço engrossado em 1 célula para a direita
 * (a letra fica 6×7). Uma célula vale 100 unidades; a fonte tem 1000 unidades por em, então as maiúsculas
 * medem 0,7em de altura. As células vizinhas são fundidas num contorno só (sem emendas entre quadradinhos).
 *
 * Para mudar um desenho, edite a grade abaixo e rode:  npm run gerar-fonte
 * Minúsculas usam o desenho das maiúsculas. Caracteres que não existem aqui caem na Jersey 10 (ver arcade.css).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import svg2ttf from 'svg2ttf'
import ttf2woff from 'ttf2woff'

const aqui = dirname(fileURLToPath(import.meta.url))
const SAIDA = resolve(aqui, '../src/assets/fonts/quadra-8.woff')

const CELULA = 100
const UPM = 1000
const ESPACO = 4 // largura do espaço entre palavras, em células
const GROSSO = 1 // quantas células o traço é engrossado para a direita

const DESENHOS = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  1: '..#../.##../..#../..#../..#../..#../.###.',
  2: '.###./#...#/....#/...#./..#../.#.../#####',
  3: '####./....#/....#/.###./....#/....#/####.',
  4: '#...#/#...#/#...#/#####/....#/....#/....#',
  5: '#####/#..../####./....#/....#/#...#/.###.',
  6: '.###./#..../#..../####./#...#/#...#/.###.',
  7: '#####/....#/...#./..#../.#.../.#.../.#...',
  8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
  9: '.###./#...#/#...#/.####/....#/....#/.###.',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '.': '...../...../...../...../...../.##../.##..',
  ',': '...../...../...../...../.##../..#../.#...',
  ':': '...../.##../.##../...../.##../.##../.....',
  ';': '...../.##../.##../...../.##../..#../.#...',
  '-': '...../...../...../#####/...../...../.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  "'": '..#../..#../.#.../...../...../...../.....',
  '"': '.#.#./.#.#./.#.#./...../...../...../.....',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '[': '.###./.#.../.#.../.#.../.#.../.#.../.###.',
  ']': '.###./...#./...#./...#./...#./...#./.###.',
  '=': '...../#####/...../#####/...../...../.....',
  '>': '#..../.#.../..#../...#./..#../.#.../#....',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '#': '.#.#./#####/.#.#./.#.#./#####/.#.#./.....',
  _: '...../...../...../...../...../...../#####',
  '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
  '@': '.###./#...#/#.###/#.#.#/#.###/#..../.###.',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  $: '..#../.####/#.#../.###./..#.#/####./..#..',
  '|': '..#../..#../..#../..#../..#../..#../..#..',
  '·': '...../...../...../..#../...../...../.....',
  '×': '...../#...#/.#.#./..#../.#.#./#...#/.....',
  '°': '.##../#..#./.##../...../...../...../.....',
  '…': '...../...../...../...../...../...../#.#.#',
  '←': '...../..#../.#.../#####/.#.../..#../.....',
  '→': '...../..#../...#./#####/...#./..#../.....',
  '↑': '..#../.###./#.#.#/..#../..#../..#../..#..',
  '↓': '..#../..#../..#../..#../#.#.#/.###./..#..',
  '★': '..#../..#../#####/.###./.###./.#.#./#...#',
  '✓': '...../....#/...#./#.#../.#.../...../.....',
}

// Letras que repetem o desenho de outro caractere (além das minúsculas, que repetem as maiúsculas).
const APELIDOS = { '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', 'º': '°', 'ª': '°', '•': '·', ' ': ' ' }

// Caracteres estreitos: a largura vem do desenho. Os demais ocupam a grade inteira (5 células + traço).
const ESTREITOS = new Set("!.,:;'\"()[]|·°…".split(''))

// Sinais de acentuação: 2 linhas acima da letra (a última encosta na maiúscula), exceto a cedilha, que fica abaixo.
const SINAIS = {
  '́': ['...#.', '..#..'],
  '̀': ['..#..', '...#.'],
  '̂': ['..#..', '.#.#.'],
  '̃': ['.##.#', '#.##.'],
  '̈': ['.#.#.', '.....'],
  '̧': ['..#..', '.##..'],
}
const ACENTUADAS = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ'

/** Células preenchidas (x para a direita, y para cima, em células) e largura do avanço, em células. */
function celulasDoCaractere(ch, sinal) {
  const grade = DESENHOS[ch].split('/')
  const celulas = []
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) if (grade[r][c] === '#') celulas.push([c, 6 - r])
  }
  if (sinal) {
    const linhas = SINAIS[sinal]
    const abaixo = sinal === '̧'
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 5; c++) {
        if (linhas[r][c] !== '#') continue
        celulas.push([c, abaixo ? -1 - r : 8 - r])
      }
    }
  }
  const engrossadas = []
  for (const [x, y] of celulas) {
    engrossadas.push([x, y])
    if (y >= 0 || sinal !== '̧') for (let g = 1; g <= GROSSO; g++) engrossadas.push([x + g, y])
  }
  let minX = 0
  let largura = 5 + GROSSO
  if (ESTREITOS.has(ch)) {
    const xs = celulas.map(([x]) => x)
    minX = Math.min(...xs)
    largura = Math.max(...xs) - minX + 1 + GROSSO
  }
  const unicas = new Map()
  for (const [x, y] of engrossadas) unicas.set(`${x - minX},${y}`, [x - minX, y])
  return { celulas: [...unicas.values()], avanco: largura + 1 }
}

/** Funde as células vizinhas em contornos (arestas internas se anulam) e devolve o caminho SVG. */
function contorno(celulas) {
  const arestas = new Map()
  const chave = (x1, y1, x2, y2) => `${x1},${y1}>${x2},${y2}`
  const adicionar = (x1, y1, x2, y2) => {
    const oposta = chave(x2, y2, x1, y1)
    if (arestas.has(oposta)) arestas.delete(oposta)
    else arestas.set(chave(x1, y1, x2, y2), [x1, y1, x2, y2])
  }
  for (const [x, y] of celulas) {
    adicionar(x, y, x + 1, y)
    adicionar(x + 1, y, x + 1, y + 1)
    adicionar(x + 1, y + 1, x, y + 1)
    adicionar(x, y + 1, x, y)
  }
  const saindo = new Map()
  for (const a of arestas.values()) {
    const k = `${a[0]},${a[1]}`
    if (!saindo.has(k)) saindo.set(k, [])
    saindo.get(k).push(a)
  }
  const usadas = new Set()
  const caminhos = []
  for (const inicio of arestas.values()) {
    if (usadas.has(inicio)) continue
    const pontos = []
    let atual = inicio
    while (atual && !usadas.has(atual)) {
      usadas.add(atual)
      pontos.push([atual[0], atual[1]])
      atual = (saindo.get(`${atual[2]},${atual[3]}`) || []).find((a) => !usadas.has(a))
    }
    // Remove pontos no meio de retas.
    const limpos = pontos.filter((p, i) => {
      const a = pontos[(i + pontos.length - 1) % pontos.length]
      const b = pontos[(i + 1) % pontos.length]
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0])
    })
    caminhos.push('M' + limpos.map(([x, y]) => `${x * CELULA} ${y * CELULA}`).join(' L') + ' Z')
  }
  return caminhos.join(' ')
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const glifos = []
const jaTem = new Set()
function glifo(unicode, d, avanco) {
  if (jaTem.has(unicode)) return
  jaTem.add(unicode)
  const nome = 'u' + unicode.codePointAt(0).toString(16)
  glifos.push(`<glyph glyph-name="${nome}" unicode="${esc(unicode)}" horiz-adv-x="${avanco * CELULA}" d="${d}"/>`)
}

glifo(' ', '', ESPACO)
for (const ch of Object.keys(DESENHOS)) {
  const { celulas, avanco } = celulasDoCaractere(ch)
  const d = contorno(celulas)
  glifo(ch, d, avanco)
  if (/[A-Z]/.test(ch)) glifo(ch.toLowerCase(), d, avanco)
}
for (const [apelido, alvo] of Object.entries(APELIDOS)) {
  if (alvo === ' ') glifo(apelido, '', ESPACO)
  else {
    const { celulas, avanco } = celulasDoCaractere(alvo)
    glifo(apelido, contorno(celulas), avanco)
  }
}
for (const composto of ACENTUADAS) {
  const [base, sinal] = composto.normalize('NFD')
  const { celulas, avanco } = celulasDoCaractere(base, sinal)
  const d = contorno(celulas)
  glifo(composto, d, avanco)
  glifo(composto.toLowerCase(), d, avanco)
}

const svg = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"><defs>
<font id="Quadra8" horiz-adv-x="${7 * CELULA}">
<font-face font-family="Quadra 8" units-per-em="${UPM}" ascent="900" descent="-200" cap-height="${7 * CELULA}" x-height="${7 * CELULA}"/>
<missing-glyph horiz-adv-x="${7 * CELULA}" d=""/>
${glifos.join('\n')}
</font></defs></svg>`

const ttf = svg2ttf(svg, { description: 'Quadra 8: fonte pixel 5x7 do Basketball Practice', url: '' })
const woff = ttf2woff(new Uint8Array(ttf.buffer))
mkdirSync(dirname(SAIDA), { recursive: true })
writeFileSync(SAIDA, Buffer.from(woff.buffer ?? woff))
console.log(`Quadra 8: ${glifos.length} glifos, ${Buffer.from(woff.buffer ?? woff).length} bytes -> ${SAIDA}`)
