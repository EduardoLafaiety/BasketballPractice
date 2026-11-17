// Ícones das conquistas desbloqueadas: sprites de 16 × 16 em pixel art, cada um com as próprias cores.
// Cada linha tem 16 letras; a letra escolhe a cor na PALETA e "." é transparente.

export const LADO_SPRITE = 16

export const PALETA: Record<string, string> = {
  K: '#1b1209', // contorno
  W: '#fff7e0', // branco quente
  Y: '#ffd23f', // amarelo
  O: '#ff8a1f', // laranja
  Q: '#ffc27a', // laranja claro (brilho)
  U: '#c4570f', // laranja escuro (sombra)
  R: '#e63946', // vermelho
  D: '#9d1d2a', // vermelho escuro
  B: '#3a86ff', // azul
  N: '#1d3557', // azul marinho
  L: '#8ecae6', // azul claro
  C: '#4cc9f0', // ciano
  G: '#2fbf71', // verde
  g: '#1b7f4b', // verde escuro
  Z: '#a8f0b8', // verde claro
  P: '#8e44ad', // roxo
  I: '#ff7aa2', // rosa
  M: '#8b5a2b', // marrom
  T: '#9aa5b1', // cinza
}

type Grade = string[]

/** Cria uma grade 16 × 16 a partir de uma função que devolve a letra de cada ponto (ou "."). */
function gerar(cor: (x: number, y: number) => string): Grade {
  return Array.from({ length: LADO_SPRITE }, (_, y) => Array.from({ length: LADO_SPRITE }, (_, x) => cor(x, y)).join(''))
}
const C0 = (LADO_SPRITE - 1) / 2

/** Bola de basquete: couro laranja com brilho e sombra, e as costuras pretas. */
const bola: Grade = gerar((x, y) => {
  const d = Math.hypot(x - C0, y - C0)
  if (d > 7.7) return '.'
  if (d > 6.7) return 'K'
  const costura =
    Math.abs(x - C0) < 0.85 ||
    Math.abs(y - C0) < 0.85 ||
    Math.abs(Math.hypot(x + 4.7, y - C0) - 8.4) < 0.7 ||
    Math.abs(Math.hypot(x - (LADO_SPRITE + 3.7), y - C0) - 8.4) < 0.7
  if (costura) return 'K'
  if ((x - 4) ** 2 + (y - 4) ** 2 < 5) return 'Q'
  return x + y > 19 ? 'U' : 'O'
})

/** Floco de neve: seis braços brancos com pontas azul-claras, sobre o azul do fundo. */
const floco: Grade = gerar((x, y) => {
  const dx = x - C0
  const dy = y - C0
  const d = Math.hypot(dx, dy)
  if (d > 7.6) return '.'
  const reta = Math.abs(dy) < 0.9 || Math.abs(dx) < 0.9
  const diagonal = Math.abs(Math.abs(dx) - Math.abs(dy)) < 1.05 && d < 6.4
  if (!reta && !diagonal) return '.'
  if (d < 1.8) return 'Y'
  if (d > 5.4) return 'L'
  return reta ? 'W' : 'C'
})

/** Alvo com a flecha cravada no meio: anéis vermelhos e brancos. */
const alvo: Grade = gerar((x, y) => {
  const d = Math.hypot(x - 7.5, y - 8.5)
  // A flecha: haste marrom do centro para cima e para a direita, com as penas vermelhas na ponta.
  const haste = x >= 8 && y <= 8 && Math.abs(x - 7.5 - (8.5 - y)) < 0.75
  if (haste) return x >= 12.5 ? 'R' : 'M'
  if (d > 7.2) return '.'
  if (d > 6.2) return 'K'
  if (d < 1.3) return 'Y'
  if (d < 2.8) return 'R'
  if (d < 4.4) return 'W'
  return d < 5.4 ? 'R' : 'W'
})

export const SPRITES: Record<string, Grade> = {
  // Primeiro treino: estrela dourada.
  'primeira-sessao': [
    '................',
    '.......KK.......',
    '......KYYK......',
    '......KYYK......',
    'KKKKKKKYWYKKKKKK',
    'KYYYYYYYYYYYYYYK',
    '.KYYYWYYYYYYYYK.',
    '..KYYYYYYYYYYK..',
    '...KYYYYYYYYK...',
    '....KOYYYYOK....',
    '...KOYYYYYYOK...',
    '...KOYYKKYYOK...',
    '..KOYYK..KYYOK..',
    '..KOOK....KOOK..',
    '..KKK......KKK..',
    '................',
  ],
  // Constância: calendário com o visto verde.
  '10-sessoes': [
    '................',
    '...KK......KK...',
    '..KKKKKKKKKKKK..',
    '..KRRRRRRRRRRK..',
    '..KRRRRRRRRRRK..',
    '..KKKKKKKKKKKK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWGGWK..',
    '..KWWWWWWGGWWK..',
    '..KWGGWWGGWWWK..',
    '..KWWGGGGWWWWK..',
    '..KWWWGGWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................',
  ],
  // Rato de quadra: tabela com a cesta e a rede.
  '50-sessoes': [
    '................',
    '..KKKKKKKKKKKK..',
    '..KWWWWWWWWWWK..',
    '..KWWRRRRRRWWK..',
    '..KWWRWWWWRWWK..',
    '..KWWRRRRRRWWK..',
    '..KKKKKKKKKKKK..',
    '....OOOOOOOO....',
    '....KWKWKWKW....',
    '.....KWKWKWK....',
    '......KWKWK.....',
    '.......KWK......',
    '........K.......',
    '................',
    '................',
    '................',
  ],
  // Centenário: coroa de ouro com pedras.
  '100-sessoes': [
    '................',
    '.KKK..KKKK..KKK.',
    '.KYK..KYYK..KYK.',
    '.KYYK.KYYK.KYYK.',
    '.KYYYKYYYYKYYYK.',
    '.KYYYYYYYYYYYYK.',
    '.KYYYYYYYYYYYYK.',
    '.KYOYYYYYYYYOYK.',
    '.KKKKKKKKKKKKKK.',
    '.KYRYYYBBYYYRYK.',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Embalado: raio.
  '3-dias': [
    '.........KKK....',
    '........KWYK....',
    '.......KWYK.....',
    '......KYYK......',
    '.....KYYYYKKKK..',
    '....KYYYYYYYYOK.',
    '....KKKKYYYYOK..',
    '.......KYYOK....',
    '......KYYOK.....',
    '.....KYYOK......',
    '....KYOK........',
    '....KK..........',
    '................',
    '................',
    '................',
    '................',
  ],
  // Semana perfeita: diamante.
  '7-dias': [
    '................',
    '....KKKKKKKK....',
    '...KLLWLLCCCK...',
    '..KLLWLLCCCCCK..',
    '.KKKKKKKKKKKKKK.',
    '.KLLLLCCCCCCBBK.',
    '..KLLLCCCCCCBK..',
    '...KLLCCCCCBK...',
    '....KLCCCCBK....',
    '.....KLCCBK.....',
    '......KCBK......',
    '.......KK.......',
    '................',
    '................',
    '................',
    '................',
  ],
  // Imparável: foguete.
  '30-dias': [
    '.......KK.......',
    '......KWWK......',
    '.....KWWWWK.....',
    '....KWWWWWWK....',
    '....KWWBBWWK....',
    '....KWBLLBWK....',
    '....KWWBBWWK....',
    '....KWWWWWWK....',
    '...KRKWWWWKRK...',
    '..KRRKWRRWKRRK..',
    '..KRKKKKKKKKRK..',
    '.....KOYYOK.....',
    '......KOOK......',
    '.......KK.......',
    '................',
    '................',
  ],
  // 10 horas de quadra: relógio.
  '10-horas': [
    '......KYYK......',
    '....KKWBBWKK....',
    '...KWWWWRWWWK...',
    '..KWWWWWRWWWWK..',
    '.KWWWWWWRWWWWWK.',
    '.KWWWWWWRWWWWWK.',
    '.KBWWWWWRRRRWBK.',
    '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWK..',
    '...KWWWBBWWWK...',
    '....KKWWWWKK....',
    '......KKKK......',
    '................',
    '................',
    '................',
  ],
  // Mão quente: chama.
  '100-num-dia': [
    '.......KK.......',
    '......KRRK......',
    '.....KRRRRK.....',
    '....KRRRORRK....',
    '....KRROOORK....',
    '...KRROOYOORK...',
    '...KRROYYYORK...',
    '...KRROYYYORK...',
    '...KRROYYYORK...',
    '...KRROOYOORK...',
    '....KRROOORK....',
    '.....KRRRRK.....',
    '......KKKK......',
    '................',
    '................',
    '................',
  ],
  // Mil cestas: a bola.
  '1000-cestas': bola,
  // Sangue frio: floco de neve.
  'sequencia-10': floco,
  // Automático: alvo com a flecha.
  'sequencia-25': alvo,
  // Laboratório: frasco com a poção.
  'teste-fisico': [
    '.....KKKKKK.....',
    '.....KMMMMK.....',
    '......KWWK......',
    '......KWWK......',
    '......KWZK......',
    '......KWZK......',
    '.....KWWGGK.....',
    '....KWWGGGGK....',
    '...KWWGGZGGGK...',
    '...KWGGGGGZGK...',
    '..KWGGZGGGGGGK..',
    '..KWGGGGGGGZGK..',
    '..KWGGGGGGGGgK..',
    '..KKgGGGGGGggKK.',
    '...KKKKKKKKKK...',
    '................',
  ],
}

/** Cor do fundo do ícone de cada conquista (a que deixa o sprite mais vivo). */
export const FUNDO: Record<string, string> = {
  'primeira-sessao': '#5b2a86',
  '10-sessoes': '#1f7a5a',
  '50-sessoes': '#1d3f7a',
  '100-sessoes': '#7a2a5b',
  '3-dias': '#2b3f9a',
  '7-dias': '#14305c',
  '30-dias': '#3a2a7a',
  '10-horas': '#0f6a73',
  '100-num-dia': '#2a2f5c',
  '1000-cestas': '#1f6b3a',
  'sequencia-10': '#1d5fb5',
  'sequencia-25': '#2a6a3a',
  'teste-fisico': '#5b2a6e',
}
