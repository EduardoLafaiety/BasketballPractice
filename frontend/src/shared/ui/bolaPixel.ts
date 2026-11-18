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

// --- Bolas de vitrine (Equipamentos): a mesma grade, vista como nas fotos de produto das bolas de verdade
// (Wilson NBA Team Tribute e as de marca). De frente, a bola aparece em quatro faixas separadas por três
// canais: a calota de cima, a faixa da marca (onde vai "Wilson"), a faixa do logo e a calota de baixo. Nas
// bolas de time as faixas se alternam em duas cores e o canal leva a cor de destaque. Cada modelo guarda
// ainda o que o distingue: a faixa clara junto aos canais (Molten), o canal largo (bola de rua) e o grão.

export interface ModeloBola {
  /** Cor das faixas, que se alternam: [faixa do logo e calota de cima, faixa da marca e calota de baixo]. Iguais = bola de uma cor só. */
  gomos: readonly [string, string]
  /** Cor do canal entre os gomos. */
  costura: string
  /** Canal largo e fundo, das bolas de borracha para quadra de rua. */
  canalLargo?: boolean
  /** Cor da faixa fina que acompanha os canais de cima e de baixo (o desenho de 12 gomos da Molten). */
  faixa?: string
  /** Grão do couro: os tons se misturam em pontilhado, em vez de faixas lisas. */
  grao?: boolean
  /** Cor das duas calotas (em cima e embaixo), quando diferente das faixas do meio (Wilson NBA All Team: calotas brancas, faixas azuis). */
  calota?: string
}

// Matriz de Bayer 4 × 4: o pontilhado ordenado dos jogos antigos.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
// Do brilho à sombra: quanto de branco (+) ou de preto (−) entra na cor do gomo.
const MISTURAS = [0.5, 0.3, 0.12, 0, -0.28, -0.5]

/** Os seis tons (do brilho à sombra) de um gomo, a partir da cor dele. */
export function tonsDoCouro(cor: string): string[] {
  const [r, g, b] = rgb(cor)
  return MISTURAS.map((m) => {
    const alvo = m > 0 ? 255 : 0
    const canal = (c: number) => Math.round(c + (alvo - c) * Math.abs(m))
    return `#${((canal(r) << 16) | (canal(g) << 8) | canal(b)).toString(16).padStart(6, '0')}`
  })
}

/** Linha (em blocos) de cada canal na coluna x: o de cima e o de baixo acompanham a curva da bola. */
export const CANAL_DO_MEIO = 19
export const canais = (x: number, recuo = 0) => {
  const u = ((x - CENTRO) / RAIO) ** 2
  return { cima: 6 + recuo + 5.5 * u, meio: CANAL_DO_MEIO, baixo: 34 - recuo - 5.5 * u }
}

export type ParteDaBola = { gomo: 0 | 1; tom: number } | { faixa: true; tom: number } | { calota: true; tom: number } | 'costura' | null

/** O que há no bloco (coluna, linha) de uma bola de vitrine. Gomo 0: faixa do logo e calota de cima; 1: as outras duas. */
export function parteDoBloco(coluna: number, linha: number, modelo: Pick<ModeloBola, 'canalLargo' | 'faixa' | 'grao' | 'calota'> = {}, resolucao = 1): ParteDaBola {
  // Com resolução maior, (coluna, linha) é um pixel menor: as medidas continuam em blocos da grade de 40 × 40.
  const x = (coluna + 0.5) / resolucao
  const y = (linha + 0.5) / resolucao
  if (Math.hypot(x - CENTRO, y - CENTRO) > RAIO) return null
  const largura = modelo.canalLargo ? 1.3 : 0.75
  // Calotas de outra cor (All Team) são maiores: os canais de cima e de baixo recuam para o meio.
  const { cima, meio, baixo } = canais(x, modelo.calota ? 2 : 0)
  if (Math.abs(y - cima) < largura || Math.abs(y - meio) < largura || Math.abs(y - baixo) < largura) return 'costura'

  const sombra = Math.hypot(x - LUZ.x, y - LUZ.y) / (0.8 * LADO)
  const pontilhado = modelo.grao ? (BAYER[((linha & 3) << 2) | (coluna & 3)] / 16 - 0.5) * 0.9 : 0
  const tom = Math.max(0, Math.min(TONS - 1, Math.floor(sombra * TONS + pontilhado)))

  if (modelo.faixa) {
    // Por dentro dos canais de cima e de baixo: a faixa clara e um segundo canal fechando.
    const dentro = Math.min(y - cima, baixo - y)
    if (dentro > 0 && dentro < 2.6) return { faixa: true, tom }
    if (dentro > 0 && dentro < 2.6 + largura * 1.4) return 'costura'
  }
  if (modelo.calota && (y < cima || y > baixo)) return { calota: true, tom }
  const gomo = y < cima ? 0 : y < meio ? 1 : y < baixo ? 0 : 1
  return { gomo, tom }
}

/** Quantos pixels cada bloco da bola de vitrine tem de lado: a bola é desenhada na mesma forma, só com mais detalhe. */
export const RESOLUCAO_VITRINE = 3

/** Os pixels RGBA da bola de vitrine do modelo, com (LADO × resolução) pixels de lado. */
export function pixelsDoModelo(modelo: ModeloBola, resolucao = RESOLUCAO_VITRINE): Uint8Array {
  const gomos = modelo.gomos.map((c) => tonsDoCouro(c).map(rgb))
  const faixa = modelo.faixa ? tonsDoCouro(modelo.faixa).map(rgb) : null
  const costura = rgb(modelo.costura)
  const calota = modelo.calota ? tonsDoCouro(modelo.calota).map(rgb) : null
  const lado = LADO * resolucao
  const dados = new Uint8Array(lado * lado * 4)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const parte = parteDoBloco(x, y, modelo, resolucao)
      if (parte === null) continue
      const [r, g, b] = (parte === 'costura' ? costura : 'faixa' in parte ? faixa![parte.tom] : 'calota' in parte ? calota![parte.tom] : gomos[parte.gomo][parte.tom])
      dados.set([r, g, b, 255], (y * lado + x) * 4)
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

/** Junta pedaços de bytes num só Uint8Array (sem espalhar dezenas de milhares de números em argumentos). */
function juntar(...partes: ArrayLike<number>[]) {
  const saida = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let em = 0
  for (const p of partes) {
    saida.set(p, em)
    em += p.length
  }
  return saida
}

function bloco(tipo: string, dados: Uint8Array | number[]) {
  const corpo = juntar(Array.from(tipo, (c) => c.charCodeAt(0)), dados)
  return juntar(u32(dados.length), corpo, u32(crc32(corpo)))
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
  const zlib = juntar([0x78, 0x01, 0x01, n & 255, n >> 8, ~n & 255, (~n >> 8) & 255], linhas, u32(((b << 16) | a) >>> 0))
  return juntar(
    [137, 80, 78, 71, 13, 10, 26, 10],
    bloco('IHDR', [...u32(largura), ...u32(altura), 8, 6, 0, 0, 0]),
    bloco('IDAT', zlib),
    bloco('IEND', []),
  )
}

const guardadas = new Map<string, string>()

function png(chave: string, pixels: () => Uint8Array, lado = LADO): string {
  let url = guardadas.get(chave)
  if (!url) {
    const bytes = codificarPng(pixels(), lado, lado)
    url = `data:image/png;base64,${btoa(Array.from({ length: Math.ceil(bytes.length / 8192) }, (_, i) => String.fromCharCode(...bytes.subarray(i * 8192, (i + 1) * 8192))).join(''))}`
    guardadas.set(chave, url)
  }
  return url
}

/** A bola como imagem (data URL de um PNG 40 × 40), na paleta pedida; a mesma paleta só é gerada uma vez. */
export function bolaPng(couro?: readonly string[], costura?: string): string {
  return png(`${couro?.join() ?? ''}|${costura ?? ''}`, () => pixelsDaBola(couro, costura))
}

/** A bola de vitrine do modelo como imagem (data URL de um PNG de LADO × RESOLUCAO_VITRINE pixels); cada modelo só é gerado uma vez. */
export function bolaModeloPng(modelo: ModeloBola): string {
  const { gomos, costura, canalLargo, faixa, grao, calota } = modelo
  return png(`modelo|${gomos.join()}|${costura}|${!!canalLargo}|${faixa ?? ''}|${!!grao}|${calota ?? ''}`, () => pixelsDoModelo(modelo), LADO * RESOLUCAO_VITRINE)
}
