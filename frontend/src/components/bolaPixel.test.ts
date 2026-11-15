import { describe, expect, it } from 'vitest'
import { LADO, bolaPng, codificarPng, pixelsDaBola, tomDoBloco } from './bolaPixel'

describe('bola em pixel art', () => {
  it('é redonda: os cantos da grade ficam vazios e o miolo, preenchido', () => {
    for (const [x, y] of [[0, 0], [LADO - 1, 0], [0, LADO - 1], [LADO - 1, LADO - 1]]) expect(tomDoBloco(x, y)).toBeNull()
    expect(tomDoBloco(10, 10)).not.toBeNull()
  })

  it('tem a cruz das costuras no meio e as curvas espelhadas dos lados', () => {
    expect(tomDoBloco(LADO / 2, 5)).toBe('costura')
    expect(tomDoBloco(5, LADO / 2)).toBe('costura')
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO / 2; x++) {
        expect(tomDoBloco(x, y) === 'costura').toBe(tomDoBloco(LADO - 1 - x, y) === 'costura')
      }
    }
  })

  it('vai do brilho, em cima à esquerda, para a sombra, embaixo à direita', () => {
    expect(tomDoBloco(14, 11)).toBe(0)
    expect(tomDoBloco(27, 36)).toBe(5)
  })

  it('pinta um pixel opaco para cada bloco da bola e deixa o resto transparente', () => {
    const dados = pixelsDaBola()
    let esperados = 0
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO; x++) {
        const dentro = tomDoBloco(x, y) !== null
        if (dentro) esperados++
        expect(dados[(y * LADO + x) * 4 + 3]).toBe(dentro ? 255 : 0)
      }
    }
    expect(esperados).toBeGreaterThan(1000)
  })

  it('aceita outra paleta: seis tons de couro e a cor da costura', () => {
    const tons = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006']
    const dados = pixelsDaBola(tons, '#ffffff')
    const cores = new Set<string>()
    for (let i = 0; i < dados.length; i += 4) if (dados[i + 3]) cores.add(`#${[...dados.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`)
    expect(cores).toEqual(new Set([...tons, '#ffffff']))
  })
})

describe('PNG do sprite', () => {
  it('é um PNG válido: assinatura, cabeçalho 40 × 40 RGBA e fim de arquivo', () => {
    const png = codificarPng(pixelsDaBola(), LADO, LADO)
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(String.fromCharCode(...png.subarray(12, 16))).toBe('IHDR')
    const v = new DataView(png.buffer)
    expect([v.getUint32(16), v.getUint32(20), png[24], png[25]]).toEqual([LADO, LADO, 8, 6])
    expect(String.fromCharCode(...png.subarray(png.length - 8, png.length - 4))).toBe('IEND')
  })

  it('o conteúdo comprimido (zlib) tem os pixels e o checksum Adler-32 certos', () => {
    const rgba = new Uint8Array([10, 20, 30, 255, 40, 50, 60, 128])
    const png = codificarPng(rgba, 2, 1)
    // 8 da assinatura + 25 do IHDR + 8 de tamanho/tipo do IDAT = 41: o zlib começa aí (2 de cabeçalho + 5 do bloco).
    const inicio = 41 + 2 + 5
    const dados = png.subarray(inicio, inicio + 9)
    expect([...dados]).toEqual([0, 10, 20, 30, 255, 40, 50, 60, 128])
    let a = 1
    let b = 0
    for (const x of dados) { a = (a + x) % 65521; b = (b + a) % 65521 }
    const v = new DataView(png.buffer, inicio + 9, 4)
    expect(v.getUint32(0)).toBe(((b << 16) | a) >>> 0)
  })

  it('devolve um data URL e guarda a imagem de cada paleta', () => {
    expect(bolaPng()).toMatch(/^data:image\/png;base64,/)
    expect(bolaPng()).toBe(bolaPng())
    expect(bolaPng(['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'], '#000000')).not.toBe(bolaPng())
  })
})
