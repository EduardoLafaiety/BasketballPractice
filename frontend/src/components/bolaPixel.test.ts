import { describe, expect, it } from 'vitest'
import { FAIXAS_DA_BOLA, LADO, faixasDaBola, tomDoBloco } from './bolaPixel'

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

  it('as faixas cobrem cada bloco da bola uma vez só, sem sair da grade', () => {
    const blocos = new Set<string>()
    for (const f of FAIXAS_DA_BOLA) {
      expect(f.x + f.largura).toBeLessThanOrEqual(LADO)
      for (let i = 0; i < f.largura; i++) {
        const chave = `${f.x + i},${f.y}`
        expect(blocos.has(chave)).toBe(false)
        blocos.add(chave)
      }
    }
    let esperados = 0
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) if (tomDoBloco(x, y) !== null) esperados++
    expect(blocos.size).toBe(esperados)
  })

  it('aceita outra paleta: seis tons de couro e a cor da costura', () => {
    const tons = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006']
    const cores = new Set(faixasDaBola(tons, '#ffffff').map((f) => f.cor))
    expect(cores).toEqual(new Set([...tons, '#ffffff']))
  })
})
