import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respostaTabela } from './exemplo-espn'
import { aproveitamento, buscarTabela, jogosAtras, lerTabela, URL_TABELA } from './tabela'

describe('Classificação das conferências', () => {
  it('separa Leste e Oeste e ordena pela posição, com as cores dos times', () => {
    const { leste, oeste } = lerTabela(respostaTabela)
    expect(leste.map((l) => `${l.posicao} ${l.sigla}`)).toEqual(['1 PHI', '5 NYK', '15 MIL'])
    expect(oeste.map((l) => `${l.posicao} ${l.sigla}`)).toEqual(['1 LAL', '2 SAS'])
    expect(oeste[0]).toMatchObject({ nome: 'Los Angeles Lakers', vitorias: 10, derrotas: 2, atras: 0, sequencia: 'V6', cor: '#552583' })
  })

  it('usa as siglas do site (a ESPN escreve NY, SA, GS…) e traduz a sequência', () => {
    const { leste, oeste } = lerTabela(respostaTabela)
    expect(leste.find((l) => l.nome === 'New York Knicks')?.sigla).toBe('NYK')
    expect(oeste.find((l) => l.nome === 'San Antonio Spurs')).toMatchObject({ sigla: 'SAS', sequencia: 'V9' })
    expect(leste.find((l) => l.sigla === 'MIL')?.sequencia).toBe('D6')
  })

  it('resposta vazia não quebra', () => {
    expect(lerTabela(null)).toEqual({ leste: [], oeste: [] })
  })

  it('formata o aproveitamento e os jogos atrás como nas tabelas da NBA', () => {
    expect(aproveitamento(0.8181)).toBe('.818')
    expect(aproveitamento(1)).toBe('1.000')
    expect(jogosAtras(0)).toBe('—')
    expect(jogosAtras(7.5)).toBe('7,5')
  })
})

describe('Busca da classificação', () => {
  const fetch = vi.fn()
  beforeEach(() => {
    buscarTabela.esquecer()
    fetch.mockReset()
    vi.stubGlobal('fetch', fetch)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('busca na ESPN e reaproveita por 15 minutos', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify(respostaTabela)))
    const agora = Date.now()
    await buscarTabela(agora)
    await buscarTabela(agora + 14 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(URL_TABELA)
  })

  it('erro de rede ou tabela vazia viram mensagem clara', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(buscarTabela()).rejects.toThrow('Não foi possível carregar a classificação da NBA agora.')
    fetch.mockImplementation(async () => new Response('{}'))
    await expect(buscarTabela()).rejects.toThrow(/veio vazia/)
  })
})
