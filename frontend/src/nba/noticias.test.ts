import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respostaNoticiasEspn, rssCbs } from './exemplo-espn'
import { buscarNoticiasNba, juntar, lerCbs, lerEspn, ultimas24h, URL_NOTICIAS_CBS, URL_NOTICIAS_ESPN, type NoticiaNba } from './noticias'

const AGORA = Date.parse('2026-11-10T15:00:00Z')
const H = 3_600_000

describe('Notícias da NBA', () => {
  it('da ESPN entram matérias e manchetes, com link em https; prévias automáticas de jogo ficam de fora', () => {
    const noticias = lerEspn(respostaNoticiasEspn(AGORA))
    expect(noticias.map((n) => n.titulo)).toEqual(['As Jaylen Brown faces the Celtics for the first time', 'Victor Wembanyama scores 40 points in 25 minutes'])
    expect(noticias[0]).toMatchObject({ fonte: 'ESPN', imagem: 'https://a.espncdn.com/photo/brown.jpg', url: 'https://www.espn.com/nba/story/_/id/1' })
    expect(noticias[1]).toMatchObject({ imagem: null, url: 'https://www.espn.com/nba/story/_/id/2' })
  })

  it('da CBS Sports lê o RSS e tira a propaganda de aposta', () => {
    const noticias = lerCbs(rssCbs(AGORA))
    expect(noticias).toHaveLength(1)
    expect(noticias[0]).toMatchObject({
      titulo: 'Re-grading the Jaylen Brown-Paul George trade',
      url: 'https://www.cbssports.com/nba/news/re-grading/',
      imagem: 'https://sportshub.cbsistatic.com/i/brown.jpg',
      fonte: 'CBS Sports',
    })
  })

  it('o que está na seção de apostas da CBS sai pelo endereço, mesmo sem palavra de aposta no título', () => {
    const xml = rssCbs(AGORA).replace('https://www.cbssports.com/nba/news/re-grading/', 'https://www.cbssports.com/betting/news/celtics-76ers-prediction/')
    expect(lerCbs(xml)).toEqual([])
  })

  it('notícia de troca com "picks" não é confundida com aposta', () => {
    const xml = rssCbs(AGORA).replace('Re-grading the Jaylen Brown-Paul George trade', 'Hawks trade two first-round picks for a center')
    expect(lerCbs(xml).map((n) => n.titulo)).toEqual(['Hawks trade two first-round picks for a center'])
  })

  it('junta as fontes da mais nova para a mais antiga, sem repetir a mesma manchete', () => {
    const espn = lerEspn(respostaNoticiasEspn(AGORA))
    const cbs = lerCbs(rssCbs(AGORA))
    const repetida = { ...cbs[0], id: 'outra', fonte: 'ESPN' as const, titulo: cbs[0].titulo.toUpperCase() }
    expect(juntar(espn, cbs, [repetida]).map((n) => n.fonte)).toEqual(['CBS Sports', 'ESPN', 'ESPN'])
  })

  it('mostra só as das últimas 24 horas; num dia fraco, completa com as mais recentes', () => {
    const nova = (id: string, horas: number): NoticiaNba => ({ id, titulo: id, resumo: '', url: 'https://x', imagem: null, fonte: 'ESPN', publicada: new Date(AGORA - horas * H).toISOString() })
    const lista = [nova('a', 1), nova('b', 5), nova('c', 23), nova('d', 30), nova('e', 50)]
    expect(ultimas24h(lista, AGORA).map((n) => n.id)).toEqual(['a', 'b', 'c'])
    // Passadas mais 2 horas, a "c" sai das 24 h, mas a lista mantém 3 notícias.
    expect(ultimas24h(lista, AGORA + 2 * H).map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(ultimas24h([nova('a', 1), nova('b', 2), nova('c', 3), nova('d', 4)], AGORA + 3.5 * H).map((n) => n.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('Busca das notícias', () => {
  const fetch = vi.fn()
  beforeEach(() => {
    buscarNoticiasNba.esquecer()
    fetch.mockReset()
    vi.stubGlobal('fetch', fetch)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('busca as duas fontes e, se uma falhar, mostra a outra', async () => {
    fetch.mockImplementation(async (url: string) =>
      url === URL_NOTICIAS_ESPN ? new Response(JSON.stringify(respostaNoticiasEspn(Date.now()))) : new Response('', { status: 503 }),
    )
    const noticias = await buscarNoticiasNba()
    expect(fetch).toHaveBeenCalledWith(URL_NOTICIAS_CBS)
    expect(noticias.map((n) => n.fonte)).toEqual(['ESPN', 'ESPN'])
  })

  it('só dá erro se as duas fontes falharem', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(buscarNoticiasNba()).rejects.toThrow('Não foi possível carregar as notícias da NBA agora.')
  })

  it('reaproveita por 10 minutos e depois busca de novo', async () => {
    fetch.mockImplementation(async (url: string) =>
      url === URL_NOTICIAS_ESPN ? new Response(JSON.stringify(respostaNoticiasEspn(Date.now()))) : new Response(rssCbs(Date.now())),
    )
    const agora = Date.now()
    await buscarNoticiasNba(agora)
    await buscarNoticiasNba(agora + 9 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(2)
    await buscarNoticiasNba(agora + 11 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(4)
  })
})
