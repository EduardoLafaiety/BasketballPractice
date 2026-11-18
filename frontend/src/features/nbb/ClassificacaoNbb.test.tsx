import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarNbb } from './classificacao'
import ClassificacaoNbb from './ClassificacaoNbb'
import { jsonNbb } from './exemplo-nbb'

const fetch = vi.fn()
const servir = (json: unknown) => fetch.mockImplementation(async () => new Response(JSON.stringify(json)))

beforeEach(() => {
  buscarNbb.esquecer()
  fetch.mockReset()
  vi.stubGlobal('fetch', fetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('Página da NBB', () => {
  it('mostra a classificação com as faixas de playoffs, fora dos playoffs e rebaixamento', async () => {
    servir(jsonNbb)
    render(<ClassificacaoNbb />)

    const tabela = await screen.findByRole('table', { name: 'NBB 2026/27' })
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(linhas).toHaveLength(18)
    expect(linhas[0]).toHaveTextContent(/^1Minas StormMIN701\.0007\+7014$/)
    expect(linhas[0]).toHaveClass('nba-direto')
    expect(linhas[15]).toHaveClass('nba-direto')
    expect(linhas[16]).toHaveClass('nba-fora')
    expect(linhas[17]).toHaveClass('nba-rebaixado')
    expect(linhas[17]).toHaveTextContent('Caxias do Sul Basquete')
    expect(linhas[17].querySelector('td.nba-seq-d')).toHaveTextContent('-70')

    expect(screen.getByText('1º ao 16º: playoffs (oitavas de final)')).toBeInTheDocument()
    expect(screen.getByText('17º: fora dos playoffs')).toBeInTheDocument()
    expect(screen.getByText('18º: rebaixado para a Liga Ouro')).toBeInTheDocument()
    expect(screen.getByText(/Dados da LNB.*lidos em/)).toBeInTheDocument()
  })

  it('o escudo é decorativo e, se não carregar, volta a bolinha do time', async () => {
    servir(jsonNbb)
    render(<ClassificacaoNbb />)

    const tabela = await screen.findByRole('table')
    const primeira = within(tabela).getAllByRole('row')[1]
    const escudos = [...primeira.querySelectorAll('img')]
    expect(escudos.map((i) => i.getAttribute('src'))).toEqual(['https://lnb.com.br/uploads/min-150.png', 'https://lnb.com.br/uploads/min-150.png'])
    act(() => escudos[0].dispatchEvent(new Event('error')))
    expect(primeira.querySelector('img')).toBeNull()
    expect(primeira.querySelector('.nba-time-cor')).not.toBeNull()
  })

  it('mostra as notícias da LNB em cartões, com o dia em palavras e os escudos dos times citados', async () => {
    servir(jsonNbb)
    render(<ClassificacaoNbb />)

    const secao = await screen.findByRole('region', { name: 'Notícias' })
    const cartoes = within(secao).getAllByRole('link')
    expect(cartoes.map((c) => within(c).getByRole('heading').textContent)).toEqual(['Minas Storm vence Mogi Basquete e segue invicto', 'Rodada do NBB CAIXA tem clássicos', 'Balanço da semana'])
    expect(cartoes[0]).toHaveAttribute('href', 'https://lnb.com.br/noticias/minas-vence-mogi/')
    expect(cartoes[0]).toHaveAttribute('target', '_blank')
    expect(cartoes[0]).toHaveTextContent('LNB · hoje')
    expect(cartoes[1]).toHaveTextContent('LNB · ontem')
    expect(cartoes[2]).toHaveTextContent('LNB · há 4 dias')

    const escudos = (c: HTMLElement) => [...c.querySelectorAll('.nba-noticia-times img.nba-escudo-claro')].map((i) => i.getAttribute('src')?.match(/\/(\w+)-150\.png/)?.[1])
    expect(escudos(cartoes[0])).toEqual(['min', 'mog'])
    expect(cartoes[0].querySelector('.nba-noticia-times')).toHaveAttribute('title', 'Minas Storm, Mogi Basquete')
    expect(cartoes[1].querySelector('.nba-noticia-times')).toBeNull()
    expect(cartoes[1].querySelector('img.nba-noticia-foto')).toBeNull()
    expect(cartoes[0].querySelector('img.nba-noticia-foto')).toHaveAttribute('src', 'https://lnb.com.br/uploads/minas-400x320.jpg')
  })

  it('mostra os líderes por categoria, o primeiro em destaque e os seguintes em ranking, com o escudo do time', async () => {
    servir(jsonNbb)
    render(<ClassificacaoNbb />)

    const secao = await screen.findByRole('region', { name: 'Líderes da temporada' })
    expect(within(secao).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Pontos', 'Rebotes'])
    const pontos = within(secao).getByRole('region', { name: 'Pontos' })
    expect(within(pontos).getByText('23,3')).toBeInTheDocument()
    expect(within(pontos).getByText('pontos por jogo')).toBeInTheDocument()
    expect(within(pontos).getByText('Dupree #11')).toBeInTheDocument()
    expect(within(pontos).getByText('Basquete Cearense')).toBeInTheDocument()
    const ranking = within(pontos).getByRole('list')
    expect(ranking).toHaveAttribute('start', '2')
    const itens = within(ranking).getAllByRole('listitem')
    expect(itens.map((i) => i.querySelector('.nba-nome')?.textContent)).toEqual(['Harris #1', 'Time Novo #7'])
    expect(itens[0].querySelector('img')).toHaveAttribute('src', 'https://lnb.com.br/uploads/mog-150.png')
    // Time que não bate com a classificação não tem escudo: fica a bolinha, não uma imagem vazia.
    expect(itens[1].querySelector('img')).toBeNull()
    expect(itens[1].querySelector('.nba-time-cor')).not.toBeNull()
  })

  it('uma parte que a LNB não entregou mostra o aviso dela, sem derrubar o resto da página', async () => {
    servir({ ...jsonNbb, leaders: [], news: [] })
    render(<ClassificacaoNbb />)

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText(/As notícias não está disponível agora/)).toBeInTheDocument()
    expect(screen.getByText(/As estatísticas não está disponível agora/)).toBeInTheDocument()
  })

  it('sem o nbb.json mostra o aviso e deixa tentar de novo', async () => {
    fetch.mockImplementation(async () => new Response('', { status: 404 }))
    render(<ClassificacaoNbb />)

    expect(await screen.findByText(/não estão disponíveis agora/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
