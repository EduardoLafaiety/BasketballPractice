import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EstatisticasNba from './EstatisticasNba'
import { respostaEspn, respostaNoticiasEspn, respostaTabela, rssCbs } from './exemplo-espn'
import { esquecerLideres, lerLideres, URL_LIDERES } from './lideres'
import { buscarNoticiasNba, URL_NOTICIAS_CBS, URL_NOTICIAS_ESPN } from './noticias'
import { buscarTabela, URL_TABELA } from './tabela'

const fetch = vi.fn()
/** Cada endereço responde com o exemplo da sua fonte; `falhar` derruba os que forem passados. */
function fontes({ falhar = [] as string[], noticiasEspn = respostaNoticiasEspn(Date.now()) as unknown } = {}) {
  fetch.mockImplementation(async (url: string) => {
    if (falhar.includes(url)) throw new TypeError('Failed to fetch')
    if (url === URL_LIDERES) return new Response(JSON.stringify(respostaEspn))
    if (url === URL_TABELA) return new Response(JSON.stringify(respostaTabela))
    if (url === URL_NOTICIAS_ESPN) return new Response(JSON.stringify(noticiasEspn))
    if (url === URL_NOTICIAS_CBS) return new Response(rssCbs(Date.now()))
    return new Response('', { status: 404 })
  })
}

beforeEach(() => {
  esquecerLideres()
  buscarTabela.esquecer()
  buscarNoticiasNba.esquecer()
  fetch.mockReset()
  vi.stubGlobal('fetch', fetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('Estatísticas da NBA', () => {
  it('mostra a classificação do Leste e do Oeste, com o líder no topo e as faixas de playoff e play-in', async () => {
    fontes()
    render(<EstatisticasNba />)

    const leste = await screen.findByRole('table', { name: 'Conferência Leste' })
    const linhas = within(leste).getAllByRole('row').slice(1)
    expect(linhas.map((l) => within(l).getByRole('rowheader').textContent)).toEqual(['Philadelphia 76ersPHI', 'New York KnicksNYK', 'Milwaukee BucksMIL'])
    expect(linhas[0]).toHaveTextContent(/^1Philadelphia 76ersPHI92\.818—V1$/)
    expect(linhas[0]).toHaveClass('nba-direto')
    expect(linhas[2]).not.toHaveClass('nba-direto')
    // Escudo do time, decorativo; se não carregar, volta a bolinha na cor do time.
    const escudo = linhas[0].querySelector('img.nba-escudo-escuro')
    expect(escudo).toHaveAttribute('src', expect.stringContaining('/500-dark/phi.png'))
    act(() => escudo!.dispatchEvent(new Event('error')))
    expect(linhas[0].querySelector('img')).toBeNull()
    expect(linhas[0].querySelector('.nba-time-cor')).not.toBeNull()
    expect(screen.getByRole('table', { name: 'Conferência Oeste' })).toHaveTextContent('Los Angeles Lakers')
    expect(screen.getByText('7º ao 10º: play-in')).toBeInTheDocument()
  })

  it('mostra um cartão por categoria, com o líder em destaque e os seguintes em ranking', async () => {
    fontes()
    render(<EstatisticasNba />)

    const pontos = await screen.findByRole('region', { name: 'Pontos' })
    expect(within(pontos).getByText('39,3')).toBeInTheDocument()
    expect(within(pontos).getByText('Luka Doncic')).toBeInTheDocument()
    const ranking = within(pontos).getByRole('list')
    expect(ranking).toHaveAttribute('start', '2')
    expect(within(ranking).getByRole('listitem')).toHaveTextContent('Stephen Curry')

    // Escudos: o do líder só na versão escura (o cartão tem o fundo na cor do time); os do ranking nos dois temas.
    const lider = pontos.querySelectorAll('.nba-escudo-lider img')
    expect([...lider].map((i) => i.getAttribute('src'))).toEqual([expect.stringContaining('/500-dark/lal.png')])
    expect(within(ranking).getByRole('listitem').querySelector('img.nba-escudo-claro')).toHaveAttribute('src', expect.stringContaining('/500/gs.png'))
    // Sem o escudo, o líder fica sem nada no lugar; no ranking volta a bolinha na cor do time.
    act(() => lider[0].dispatchEvent(new Event('error')))
    expect(pontos.querySelector('.nba-escudo-lider')).toBeNull()
  })

  it('dados guardados antes dos escudos (sem os endereços) mostram a bolinha, não uma imagem vazia', async () => {
    fontes()
    const { categorias } = lerLideres(respostaEspn)
    const semEscudos = categorias.map((c) => ({ ...c, lideres: c.lideres.map(({ escudo: _e, escudoEscuro: _ee, ...l }) => l) }))
    sessionStorage.setItem('bp.nba.lideres', JSON.stringify({ quando: Date.now(), dados: { temporada: '2026-27', categorias: semEscudos } }))
    render(<EstatisticasNba />)

    const pontos = await screen.findByRole('region', { name: 'Pontos' })
    expect(pontos.querySelector('img')).toBeNull()
    expect(within(pontos).getByRole('listitem').querySelector('.nba-time-cor')).not.toBeNull()
  })

  it('mostra as notícias em cartões, que abrem a matéria no site de origem', async () => {
    fontes()
    render(<EstatisticasNba />)

    const secao = await screen.findByRole('region', { name: 'Notícias' })
    const cartoes = await within(secao).findAllByRole('link')
    expect(cartoes.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      'Re-grading the Jaylen Brown-Paul George trade',
      'As Jaylen Brown faces the Celtics for the first time',
      'Victor Wembanyama scores 40 points in 25 minutes',
    ])
    expect(cartoes[0]).toHaveAttribute('href', 'https://www.cbssports.com/nba/news/re-grading/')
    expect(cartoes[0]).toHaveAttribute('target', '_blank')
    expect(cartoes[0]).toHaveTextContent('CBS Sports · há 30 min')
    expect(within(secao).queryByText(/promo code/i)).toBeNull()
    expect(within(secao).queryByRole('button')).toBeNull()
    // Escudos dos times citados: "76ers" (no resumo) e Celtics; sem time citado, sem escudos.
    const escudos = (c: HTMLElement) => [...c.querySelectorAll('.nba-noticia-times img.nba-escudo-claro')].map((i) => i.getAttribute('src')?.match(/\/(\w+)\.png/)?.[1])
    expect(escudos(cartoes[1])).toEqual(['bos', 'phi'])
    expect(cartoes[1].querySelector('.nba-noticia-times')).toHaveAttribute('title', 'Boston Celtics, Filadélfia 76ers')
    expect(escudos(cartoes[2])).toEqual(['sa'])
    expect(cartoes[0].querySelector('.nba-noticia-times')).toBeNull()
  })

  it('com muitas notícias do dia, mostra 12 e as outras entram conforme a página rola, até acabar', async () => {
    // O jsdom não tem IntersectionObserver: este finge o fim da lista chegando perto da tela.
    let avisar: (visivel: boolean) => void = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(chamar: (itens: { isIntersecting: boolean }[]) => void) {
          avisar = (visivel) => chamar([{ isIntersecting: visivel }])
        }
        observe() {}
        disconnect() {}
      },
    )
    const agora = Date.now()
    const materia = (id: number) => ({
      id,
      type: 'Story',
      headline: `Matéria ${id}`,
      published: new Date(agora - id * 60_000).toISOString(),
      links: { web: { href: `https://www.espn.com/nba/story/_/id/${id}` } },
    })
    fontes({ noticiasEspn: { articles: Array.from({ length: 30 }, (_, i) => materia(i + 1)) } })
    const { container } = render(<EstatisticasNba />)

    const secao = await screen.findByRole('region', { name: 'Notícias' })
    await within(secao).findAllByRole('link')
    expect(within(secao).getAllByRole('link')).toHaveLength(12)
    expect(within(secao).queryByRole('button')).toBeNull()

    act(() => avisar(false))
    expect(within(secao).getAllByRole('link')).toHaveLength(12)
    act(() => avisar(true))
    expect(within(secao).getAllByRole('link')).toHaveLength(24)
    act(() => avisar(true))
    // 30 da ESPN e a da CBS: todas na tela, e o marcador do fim some.
    expect(within(secao).getAllByRole('link')).toHaveLength(31)
    expect(container.querySelector('.nba-noticias-fim')).toBeNull()
  })

  it('com a página aberta, as notícias se atualizam sozinhas a cada 10 minutos', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    try {
      fontes()
      render(<EstatisticasNba />)
      const secao = await screen.findByRole('region', { name: 'Notícias' })
      await within(secao).findByText('As Jaylen Brown faces the Celtics for the first time')

      const chegou = { id: 9, type: 'HeadlineNews', headline: 'Breaking: trade completed', published: new Date(Date.now() + 9 * 60_000).toISOString(), links: { web: { href: 'https://www.espn.com/nba/story/_/id/9' } } }
      fontes({ noticiasEspn: { articles: [chegou, ...respostaNoticiasEspn(Date.now()).articles] } })
      await act(async () => {
        vi.advanceTimersByTime(10 * 60_000)
      })
      expect(await within(secao).findByText('Breaking: trade completed')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('se uma fonte cair, só a parte dela avisa; o resto da página continua', async () => {
    const user = userEvent.setup()
    fontes({ falhar: [URL_TABELA] })
    render(<EstatisticasNba />)

    const classificacao = screen.getByRole('region', { name: 'Classificação' })
    expect(await within(classificacao).findByRole('alert')).toHaveTextContent('Não foi possível carregar a classificação da NBA agora.')
    expect(await screen.findByRole('region', { name: 'Pontos' })).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)

    fontes()
    await user.click(within(classificacao).getByRole('button', { name: /Tentar de novo/i }))
    expect(await screen.findByRole('table', { name: 'Conferência Leste' })).toBeInTheDocument()
  })
})
