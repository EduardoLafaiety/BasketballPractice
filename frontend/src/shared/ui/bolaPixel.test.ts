import { describe, expect, it } from 'vitest'
import { LADO, bolaModeloPng, bolaPng, codificarPng, parteDoBloco, pixelsDaBola, pixelsDoModelo, tomDoBloco } from './bolaPixel'

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

describe('bolas de vitrine, por modelo', () => {
  const cores = (dados: Uint8Array) => {
    const vistas = new Set<string>()
    for (let i = 0; i < dados.length; i += 4) if (dados[i + 3]) vistas.add(`#${[...dados.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`)
    return vistas
  }

  it('é redonda e simétrica: o que é costura de um lado é costura do outro', () => {
    for (const [x, y] of [[0, 0], [LADO - 1, 0], [0, LADO - 1], [LADO - 1, LADO - 1]]) expect(parteDoBloco(x, y)).toBeNull()
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO / 2; x++) {
        expect(parteDoBloco(x, y) === 'costura').toBe(parteDoBloco(LADO - 1 - x, y) === 'costura')
      }
    }
  })

  it('tem quatro faixas alternadas: calota de cima e faixa do logo numa cor, faixa da marca e calota de baixo na outra', () => {
    expect(parteDoBloco(20, 3)).toMatchObject({ gomo: 0 })
    expect(parteDoBloco(20, 13)).toMatchObject({ gomo: 1 })
    expect(parteDoBloco(20, 26)).toMatchObject({ gomo: 0 })
    expect(parteDoBloco(20, 36)).toMatchObject({ gomo: 1 })
    // Três canais; os de cima e de baixo acompanham a curva da bola (descem e sobem nas pontas).
    for (const linha of [6, 18, 33]) expect(parteDoBloco(20, linha)).toBe('costura')
    expect(parteDoBloco(4, 9)).toBe('costura')
    expect(parteDoBloco(4, 30)).toBe('costura')
  })

  it('pinta a bola de time com sombreado contínuo entre as duas cores e a cor do canal', () => {
    const vistas = cores(pixelsDoModelo({ gomos: ['#552583', '#fdb927'], costura: '#141414' }))
    expect(vistas.size).toBeGreaterThan(40)
    expect(vistas.has('#141414')).toBe(true)
  })

  it('o canal largo tem mais blocos de costura que o normal', () => {
    const costuras = (canalLargo: boolean) => {
      let n = 0
      for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) if (parteDoBloco(x, y, { canalLargo }) === 'costura') n++
      return n
    }
    expect(costuras(true)).toBeGreaterThan(costuras(false) * 1.2)
  })

  it('a faixa clara acompanha os canais de cima e de baixo por dentro, com um segundo canal a fechando', () => {
    const vistas = cores(pixelsDoModelo({ gomos: ['#d9661f', '#d9661f'], costura: '#1b1b1b', faixa: '#f1e6d2' }))
    expect(vistas.size).toBeGreaterThan(20)
    expect(parteDoBloco(20, 8, { faixa: '#f1e6d2' })).toMatchObject({ faixa: true })
    expect(parteDoBloco(20, 31, { faixa: '#f1e6d2' })).toMatchObject({ faixa: true })
    expect(parteDoBloco(20, 8)).toMatchObject({ gomo: 1 })
    // As calotas e o meio da bola não mudam.
    expect(parteDoBloco(20, 3, { faixa: '#f1e6d2' })).toEqual(parteDoBloco(20, 3))
    expect(parteDoBloco(20, 14, { faixa: '#f1e6d2' })).toEqual(parteDoBloco(20, 14))
  })

  it('o grão mistura os tons em pontilhado', () => {
    const liso = pixelsDoModelo({ gomos: ['#a8521e', '#a8521e'], costura: '#1b1b1b' })
    const grao = pixelsDoModelo({ gomos: ['#a8521e', '#a8521e'], costura: '#1b1b1b', grao: true })
    expect(grao).not.toEqual(liso)
  })

  it('gera uma imagem por modelo e a guarda', () => {
    const lakers = { gomos: ['#552583', '#fdb927'], costura: '#141414' } as const
    expect(bolaModeloPng(lakers)).toMatch(/^data:image\/png;base64,/)
    expect(bolaModeloPng(lakers)).toBe(bolaModeloPng({ ...lakers }))
    expect(bolaModeloPng({ ...lakers, grao: true })).not.toBe(bolaModeloPng(lakers))
    expect(bolaModeloPng(lakers)).not.toBe(bolaPng())
  })
})
