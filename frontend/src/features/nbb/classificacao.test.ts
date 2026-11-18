import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarNbb, diaRelativo, lerNbb, saldoComSinal, timesCitadosNbb } from './classificacao'
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

describe('Líderes e notícias da NBB', () => {
  it('lê as categorias com os líderes na ordem da posição, ligados ao escudo do time, e deixa de fora a categoria vazia', () => {
    const { categorias } = lerNbb(jsonNbb)
    expect(categorias.map((c) => c.id)).toEqual(['pontos', 'rebotes'])
    expect(categorias[0]).toMatchObject({ rotulo: 'Pontos', unidade: 'pontos por jogo', curto: 'pontos' })
    expect(categorias[0].lideres.map((l) => `${l.posicao} ${l.nome}`)).toEqual(['1 Dupree #11', '2 Harris #1', '3 Time Novo #7'])
    expect(categorias[0].lideres[1]).toEqual({ posicao: 2, nome: 'Harris #1', time: 'Mogi Basquete', sigla: 'MOG', escudo: 'https://lnb.com.br/uploads/mog-150.png', valor: 21.71 })
    expect(categorias[0].lideres[2]).toMatchObject({ sigla: '', escudo: '' })
  })

  it('lê as notícias com link, título, resumo, foto e dia; foto sem https vira nulo e dia inválido deixa a notícia de fora', () => {
    const { noticias } = lerNbb({
      news: [
        { url: 'https://lnb.com.br/n/1', title: 'Um', summary: 'a', image: 'http://x/y.jpg', date: '2026-11-12' },
        { url: 'https://lnb.com.br/n/2', title: 'Dois', date: '12/11/2026' },
        { url: 'http://lnb.com.br/n/3', title: 'Três', date: '2026-11-12' },
      ],
    })
    expect(noticias).toEqual([{ url: 'https://lnb.com.br/n/1', titulo: 'Um', resumo: 'a', imagem: null, data: '2026-11-12' }])
  })

  it('conta o dia em palavras: hoje, ontem e há N dias', () => {
    const agora = new Date(2026, 10, 13, 15, 0)
    expect([diaRelativo('2026-11-13', agora), diaRelativo('2026-11-12', agora), diaRelativo('2026-11-09', agora), diaRelativo('2026-11-14', agora)]).toEqual(['hoje', 'ontem', 'há 4 dias', 'hoje'])
  })
})

describe('Times citados nas notícias da NBB', () => {
  const linha = (posicao: number, sigla: string, nome: string) => ({ posicao, sigla, nome, escudo: `https://lnb.com.br/${sigla}.png`, jogos: 7, vitorias: 4, derrotas: 3, aproveitamento: 0.5, saldo: 0, pontos: 11 })
  const linhas = [
    linha(1, 'MIN', 'Minas Storm'),
    linha(2, 'PIN', 'Pinheiros'),
    linha(3, 'FRA', 'Sesi Franca'),
    linha(4, 'COR', 'Corinthians'),
    linha(5, 'UCO', 'Ceisc/União Corinthians'),
    linha(6, 'PAT', 'Pato Basquete'),
    linha(7, 'BOT', 'Botafogo'),
  ]
  const siglas = (texto: string) => timesCitadosNbb(texto, linhas).map((t) => t.sigla)

  it('acha os times pelo nome da classificação e pelos apelidos, na ordem em que aparecem', () => {
    expect(siglas('Pinheiros bate o Minas na rodada')).toEqual(['PIN', 'MIN'])
    expect(siglas('Franca vence o Botafogo')).toEqual(['FRA', 'BOT'])
    expect(siglas('Sesi Franca cresce no terceiro período')).toEqual(['FRA'])
    expect(timesCitadosNbb('Minas Storm vence', linhas)[0]).toEqual({ sigla: 'MIN', nome: 'Minas Storm', escudo: 'https://lnb.com.br/MIN.png', escudoEscuro: 'https://lnb.com.br/MIN.png' })
  })

  it('separa o Corinthians do Ceisc/União Corinthians', () => {
    expect(siglas('Corinthians 79 x 91 Pinheiros')).toEqual(['COR', 'PIN'])
    expect(siglas('Ceisc/União Corinthians recebe o Pinheiros')).toEqual(['UCO', 'PIN'])
  })

  it('só conta nome com maiúscula e palavra inteira, e "Minas Gerais" não é o Minas', () => {
    expect(siglas('O pato nadou, mas Patos de Minas Gerais não conta')).toEqual([])
    expect(siglas('Pato Basquete reage no último período')).toEqual(['PAT'])
  })

  it('no máximo três escudos, e cada time uma vez só', () => {
    expect(siglas('Minas, Pinheiros, Franca e Botafogo; Minas de novo')).toEqual(['MIN', 'PIN', 'FRA'])
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

  it('lê o nbb.json do próprio site e reaproveita por 2 minutos', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify(jsonNbb)))
    const agora = Date.now()
    await buscarNbb(agora)
    await buscarNbb(agora + 119_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    // Sempre revalida com o servidor: o cache HTTP do Pages (10 minutos) mostrava a leitura da publicação anterior.
    expect(fetch).toHaveBeenCalledWith('/nbb.json', { cache: 'no-cache' })
  })

  it('busca de novo passados 2 minutos e ignora a leitura velha que abas antigas guardaram na chave anterior', async () => {
    // Uma aba aberta antes das notícias e dos líderes existirem guardou a classificação sozinha, e ela ficava na tela.
    const velha = { quando: Date.now(), dados: { temporada: '2026/27', atualizada: '2026-11-13T13:09:00Z', linhas: lerNbb(jsonNbb).linhas } }
    sessionStorage.setItem('bp.nbb.classificacao', JSON.stringify(velha))
    fetch.mockImplementation(async () => new Response(JSON.stringify(jsonNbb)))

    const agora = Date.now()
    const primeira = await buscarNbb(agora)
    expect(primeira.noticias).toHaveLength(3)
    expect(primeira.categorias).toHaveLength(2)
    await buscarNbb(agora + 121_000)
    expect(fetch).toHaveBeenCalledTimes(2)
    sessionStorage.removeItem('bp.nbb.classificacao')
  })

  it('arquivo ausente, rede fora do ar ou tabela vazia viram a mesma mensagem clara', async () => {
    const mensagem = 'Os dados da NBB não estão disponíveis agora.'
    fetch.mockImplementation(async () => new Response('não achei', { status: 404 }))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
    fetch.mockImplementation(async () => new Response('{"teams":[],"leaders":[],"news":[]}'))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
    fetch.mockImplementation(async () => new Response('<html>'))
    await expect(buscarNbb()).rejects.toThrow(mensagem)
  })
})
