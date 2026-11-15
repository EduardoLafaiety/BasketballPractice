import { describe, expect, it } from 'vitest'
import { NIVEIS, reduzirCores, tamanhoPixelado } from './pixelar'

describe('tamanhoPixelado', () => {
  it('dá um bloco a cada 4 px da caixa, mantendo a proporção da foto', () => {
    expect(tamanhoPixelado(300, 225, 200, 150)).toEqual({ largura: 50, altura: 38 })
  })

  it('segue o lado que o object-fit: cover usa para preencher a caixa', () => {
    // Foto larga numa caixa alta: quem manda é a altura.
    expect(tamanhoPixelado(400, 200, 100, 200)).toEqual({ largura: 100, altura: 50 })
  })

  it('nunca passa do tamanho original nem fica com menos de 8 blocos', () => {
    expect(tamanhoPixelado(20, 20, 400, 400).largura).toBe(20)
    expect(tamanhoPixelado(1000, 1000, 16, 16).largura).toBe(8)
  })
})

describe('reduzirCores', () => {
  const tons = new Set(Array.from({ length: NIVEIS }, (_, i) => (i * 255) / (NIVEIS - 1)))

  it('deixa cada canal com um dos poucos tons da paleta e não mexe na transparência', () => {
    const dados = new Uint8ClampedArray(8 * 8 * 4).map((_, i) => (i % 4 === 3 ? 200 : (i * 37) % 256))
    reduzirCores(dados, 8)
    dados.forEach((v, i) => (i % 4 === 3 ? expect(v).toBe(200) : expect(tons.has(v)).toBe(true)))
  })

  it('mantém preto e branco puros', () => {
    const dados = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    expect(Array.from(reduzirCores(dados, 2))).toEqual([0, 0, 0, 255, 255, 255, 255, 255])
  })

  it('pontilha um tom intermediário entre os dois tons vizinhos', () => {
    // 76 fica a meio caminho entre 51 e 102: parte dos pixels vai para cada lado.
    const dados = new Uint8ClampedArray(4 * 4 * 4).map((_, i) => (i % 4 === 3 ? 255 : 76))
    reduzirCores(dados, 4)
    const vermelhos = new Set(dados.filter((_, i) => i % 4 === 0))
    expect([...vermelhos].sort((a, b) => a - b)).toEqual([51, 102])
  })
})
