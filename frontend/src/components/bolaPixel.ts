// A bola como sprite de jogo 8 bits: uma grade de 40 × 40 blocos, com o couro em faixas de cor (sem
// degradê) e as costuras desenhadas bloco a bloco. O sprite vira uma imagem PNG de 40 × 40 px que o
// navegador amplia sem suavizar (image-rendering: pixelated): girar e crescer com a rolagem custa só a
// placa de vídeo, em vez de redesenhar centenas de retângulos de SVG a cada quadro.

/** Blocos por lado. */
export const LADO = 40
const CENTRO = LADO / 2
const RAIO = 19
const COSTURA = '#1d0f05'
// Do brilho (em cima, à esquerda) para a sombra: as faixas do couro.
const COURO = ['#ffb37a', '#ff9a52', '#f97a26', '#ee6210', '#c24c08', '#a83d05']
const TONS = COURO.length
const LUZ = { x: 0.36 * LADO, y: 0.3 * LADO }

// Costuras curvas: a mesma curva de Bézier do desenho antigo (400 × 400), na escala da grade, e o espelho dela.
const CURVA = [
  [6.4, 6.8],
  [13.4, 13],
  [13.4, 27],
  [6.4, 33.2],
] as const
const pontosDaCurva = Array.from({ length: 200 }, (_, i) => {
  const t = i / 199
  const u = 1 - t
  const em = (k: 0 | 1) => u ** 3 * CURVA[0][k] + 3 * u * u * t * CURVA[1][k] + 3 * u * t * t * CURVA[2][k] + t ** 3 * CURVA[3][k]
  return [em(0), em(1)] as const
})

function ehCostura(x: number, y: number) {
  // Cruz do meio: dois blocos de espessura.
  if (Math.abs(x - CENTRO) < 1 || Math.abs(y - CENTRO) < 1) return true
  // As duas curvas são espelhadas: basta medir a distância no lado esquerdo.
  const xe = x < CENTRO ? x : LADO - x
  return pontosDaCurva.some(([cx, cy]) => Math.hypot(xe - cx, y - cy) < 0.95)
}

/** Tom do bloco (coluna, linha): 0 (brilho) a 5 (sombra), 'costura', ou null fora da bola. */
export function tomDoBloco(coluna: number, linha: number): number | 'costura' | null {
  const x = coluna + 0.5
  const y = linha + 0.5
  if (Math.hypot(x - CENTRO, y - CENTRO) > RAIO) return null
  if (ehCostura(x, y)) return 'costura'
  const sombra = Math.hypot(x - LUZ.x, y - LUZ.y) / (0.8 * LADO)
  return Math.min(TONS - 1, Math.floor(sombra * TONS))
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255] as const
}

/** Os pixels RGBA (LADO × LADO) da bola, com seis tons de couro (do brilho à sombra) e a cor da costura. */
export function pixelsDaBola(couro: readonly string[] = COURO, costura = COSTURA): Uint8Array {
  const dados = new Uint8Array(LADO * LADO * 4)
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const tom = tomDoBloco(x, y)
      if (tom === null) continue
      const [r, g, b] = rgb(tom === 'costura' ? costura : couro[tom])
      dados.set([r, g, b, 255], (y * LADO + x) * 4)
    }
  }
  return dados
}

// --- PNG sem compressão (blocos "stored" do zlib): para um sprite de 40 × 40 dispensa canvas e biblioteca,
// e funciona igual no navegador e nos testes.
const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff
  for (const b of bytes) c = TABELA_CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]

function bloco(tipo: string, dados: Uint8Array | number[]) {
  const corpo = new Uint8Array([...Array.from(tipo, (c) => c.charCodeAt(0)), ...dados])
  return [...u32(dados.length), ...corpo, ...u32(crc32(corpo))]
}

/** Codifica pixels RGBA (largura × altura) como PNG. */
export function codificarPng(rgba: Uint8Array, largura: number, altura: number): Uint8Array {
  const linhas = new Uint8Array(altura * (1 + largura * 4))
  for (let y = 0; y < altura; y++) linhas.set(rgba.subarray(y * largura * 4, (y + 1) * largura * 4), y * (1 + largura * 4) + 1)
  let a = 1
  let b = 0
  for (const v of linhas) {
    a = (a + v) % 65521
    b = (b + a) % 65521
  }
  const n = linhas.length // cabe num único bloco "stored" (até 65535 bytes)
  const zlib = [0x78, 0x01, 0x01, n & 255, n >> 8, ~n & 255, (~n >> 8) & 255, ...linhas, ...u32(((b << 16) | a) >>> 0)]
  return new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10,
    ...bloco('IHDR', [...u32(largura), ...u32(altura), 8, 6, 0, 0, 0]),
    ...bloco('IDAT', zlib),
    ...bloco('IEND', []),
  ])
}

const guardadas = new Map<string, string>()

/** A bola como imagem (data URL de um PNG 40 × 40), na paleta pedida; a mesma paleta só é gerada uma vez. */
export function bolaPng(couro?: readonly string[], costura?: string): string {
  const chave = `${couro?.join() ?? ''}|${costura ?? ''}`
  let url = guardadas.get(chave)
  if (!url) {
    const bytes = codificarPng(pixelsDaBola(couro, costura), LADO, LADO)
    url = `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`
    guardadas.set(chave, url)
  }
  return url
}
