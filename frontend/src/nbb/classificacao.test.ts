import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarNbb, lerNbb, saldoComSinal } from './classificacao'
import { jsonNbb } from './exemplo-nbb'

describe('Classificação da NBB', () => {
  it('lê o JSON gerado na publicação, na ordem da classificação, com a temporada abreviada', () => {
    const tabela = lerNbb(jsonNbb)
    expect(tabela.temporada).toBe('2026/27')
    expect(tabela.atualizada).toBe('2026-11-13T12:53:37.973Z')
    expect(tabela.linhas).toHaveLength(18)
    expect(tabela.linhas.slice(0, 2).map((l) => `${l.posicao} ${l.sigla}`)).toEqual(['1 MIN', '2 MOG'])
    expect(tabela.linhas[0]).toEqual({
      posicao: 1,
      sigla: 'MIN',
      nome: 'Minas Storm',
      escudo: 'https://lnb.com.br/uploads/min-150.png',
      jogos: 7,
      vitorias: 7,
      derrotas: 0,
      aproveitamento: 1,
      saldo: 70,
      pontos: 14,
    })
  })

  it('deixa de fora linha sem posição, sem nome ou com escudo que não é https; resposta estranha não quebra', () => {
    const { linhas } = lerNbb({
      teams: [
        { position: 1, abbreviation: 'MIN', name: 'Minas', logo: 'https://x/y.png' },
        { position: 2, abbreviation: 'MOG', name: 'Mogi', logo: 'http://x/y.png' },
        { position: 0, abbreviation: 'PIN', name: 'Pinheiros', logo: 'https://x/z.png' },
        { position: 3, abbreviation: 'FLA', logo: 'https://x/w.png' },
      ],
    })
    expect(linhas.map((l) => l.sigla)).toEqual(['MIN'])
    expect(lerNbb(null).linhas).toEqual([])
    expect(lerNbb({ teams: 'nada' }).linhas).toEqual([])
  })

  it('mostra o saldo de pontos com sinal', () => {
    expect([saldoComSinal(144), saldoComSinal(-12), saldoComSinal(0)]).toEqual(['+144', '-12', '0'])
  })
})

describe('Busca da classificação da NBB', () => {
  const fetch = vi.fn()
  beforeEach(() => {
    buscarNbb.esquecer()
    fetch.mockReset()
    vi.stubGlobal('fetch', fetch)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lê o nbb.json do próprio site e reaproveita por 15 minutos', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify(jsonNbb)))
    const agora = Date.now()
    await buscarNbb(agora)
    await buscarNbb(agora + 14 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/nbb.json')
  })

  it('arquivo ausente, rede fora do ar ou tabela vazia viram a mesma mensagem clara', async () => {
    const mensagem = 'A classificação da NBB não está disponível agora.'
    fetch.mockImplementation(async () => new Response('não achei', { status: 404 }))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
    fetch.mockImplementation(async () => new Response('{"teams":[]}'))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
    fetch.mockImplementation(async () => new Response('<html>'))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
  })
})
