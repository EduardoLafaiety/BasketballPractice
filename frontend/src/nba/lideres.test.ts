import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respostaEspn } from './exemplo-espn'
import { buscarLideres, CATEGORIAS, esquecerLideres, lerLideres, numero, URL_LIDERES } from './lideres'

describe('Líderes da NBA', () => {
  it('lê as categorias do site, na ordem do site, e deixa de fora as que não usa', () => {
    const { temporada, categorias } = lerLideres(respostaEspn)
    expect(temporada).toBe('2026-27')
    expect(categorias.map((c) => c.categoria.id)).toEqual(['pointsPerGame', 'reboundsPerGame'])
    expect(categorias[0].lideres[0]).toEqual({ posicao: 1, nome: 'Luka Doncic', time: 'Los Angeles Lakers', sigla: 'LAL', cor: '#552583', valor: 39.29999923706055 })
  })

  it('ignora quem vem sem nome e usa cinza quando a cor do time não é válida', () => {
    const pontos = lerLideres(respostaEspn).categorias[0].lideres
    expect(pontos.map((l) => l.nome)).toEqual(['Luka Doncic', 'Stephen Curry'])
    expect(pontos[1].cor).toBe('#6b6b6b')
  })

  it('resposta vazia ou estranha não quebra: só não traz categorias', () => {
    expect(lerLideres({}).categorias).toEqual([])
    expect(lerLideres(null as unknown).categorias).toEqual([])
  })

  it('mostra uma casa decimal com vírgula', () => {
    expect(numero(39.29999923706055)).toBe('39,3')
    expect(numero(3)).toBe('3,0')
    expect(numero(30.16)).toBe('30,2')
  })

  it('as categorias pedidas estão todas lá: pontos, rebotes, assistências e tocos', () => {
    expect(CATEGORIAS.map((c) => c.rotulo).slice(0, 4)).toEqual(['Pontos', 'Rebotes', 'Assistências', 'Tocos'])
  })
})

describe('Busca dos líderes', () => {
  const fetch = vi.fn()
  beforeEach(() => {
    esquecerLideres()
    fetch.mockReset()
    vi.stubGlobal('fetch', fetch)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('busca na ESPN e reaproveita por 15 minutos', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify(respostaEspn)))
    const agora = Date.now()
    await buscarLideres(agora)
    await buscarLideres(agora + 14 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(URL_LIDERES)
    await buscarLideres(agora + 16 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('sem internet ou com erro da ESPN, avisa com uma mensagem clara', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(buscarLideres()).rejects.toThrow('Não foi possível carregar as estatísticas da NBA agora.')
    fetch.mockResolvedValue(new Response('{}', { status: 503 }))
    await expect(buscarLideres()).rejects.toThrow('Não foi possível carregar as estatísticas da NBA agora.')
  })

  it('resposta sem nenhuma categoria conta como erro e não fica guardada', async () => {
    fetch.mockResolvedValue(new Response('{}'))
    await expect(buscarLideres()).rejects.toThrow(/vieram vazias/)
    fetch.mockImplementation(async () => new Response(JSON.stringify(respostaEspn)))
    expect((await buscarLideres()).categorias).toHaveLength(2)
  })
})
