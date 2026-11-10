import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken, type Noticia } from '../api'
import { NOTICIAS_MUDARAM, tempoAtras } from '../lib/noticias'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'
import { respostaEspn } from '../nba/exemplo-espn'
import { buscarLideres, lerLideres } from '../nba/lideres'
import { tempoDeGravacao } from './BarraNoticias'

// As estatísticas da NBA vêm da ESPN: aqui a busca é simulada (por padrão, falha e a barra fica só com as notícias).
vi.mock('../nba/lideres', async (original) => ({ ...(await original<typeof import('../nba/lideres')>()), buscarLideres: vi.fn() }))
beforeEach(() => vi.mocked(buscarLideres).mockRejectedValue(new Error('sem rede')))

const noticia = (extra: Partial<Noticia>): Noticia => ({
  id: 1,
  origin: 'gnews',
  title: 'Curry faz 40 pontos',
  sourceName: 'Veículo',
  url: 'https://veiculo.example/curry',
  publishedAt: new Date(Date.now() - 13 * 3_600_000).toISOString(),
  expiresAt: null,
  ...extra,
})

function abrir(news: Parameters<typeof apiFalsa>[0][string], rota = '/') {
  definirToken('tk')
  const api = apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /news': news })
  abrirApp(rota)
  return api
}

describe('Barra de notícias', () => {
  it('mostra a manchete com fonte, tempo e link para a matéria em outra aba', async () => {
    abrir([noticia({})])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })

    expect(within(barra).getByText('Últimas notícias')).toBeInTheDocument()
    const link = within(barra).getByRole('link', { name: 'Curry faz 40 pontos' })
    expect(link).toHaveAttribute('href', 'https://veiculo.example/curry')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(barra).getAllByText('Veículo · há 13 h').length).toBeGreaterThan(0)
  })

  it('só a manchete do admin leva o selo de breaking news, e sem link vira texto', async () => {
    abrir([noticia({ id: 2, origin: 'admin', title: 'LeBron muda de time', sourceName: null, url: null }), noticia({})])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })

    // A trilha repete as manchetes para o laço: cada uma aparece duas vezes, e a cópia fica fora da árvore acessível.
    expect(within(barra).getAllByText('Breaking news')).toHaveLength(2)
    expect(within(barra).getAllByRole('link')).toHaveLength(1)
    expect(within(barra).getByRole('list').querySelector('.noticias-selo')!.nextElementSibling).toHaveTextContent('LeBron muda de time')
  })

  it('como câmera de reportagem: REC, tempo gravando, "Últimas notícias" e o assunto de cada manchete', async () => {
    abrir([noticia({}), noticia({ id: 3, title: 'Brandon Miller acerta extensão com o Hornets' }), noticia({ id: 4, title: 'NBB 2026/27 é lançado no Rio' })])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })

    expect(barra.querySelector('.noticias-visor')).toHaveTextContent(/^Rec$/)
    expect(barra.querySelector('.noticias-tempo')!.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(barra.querySelector('.noticias-rotulo')).toHaveTextContent(/^Últimas notícias$/)
    expect(within(barra).queryByText(/Atualizado/)).toBeNull()
    const lista = within(barra).getByRole('list')
    expect([...lista.querySelectorAll('.noticias-assunto')].map((e) => e.textContent)).toEqual(['Basquete', 'Mercado', 'NBB'])
  })

  it('o líder de cada estatística da NBA entra na faixa e leva à página de estatísticas', async () => {
    vi.mocked(buscarLideres).mockResolvedValue(lerLideres(respostaEspn))
    abrir([noticia({})])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })

    const pontos = await within(barra).findByRole('link', { name: 'Líder em pontos: Luka Doncic (LAL)' })
    expect(pontos).toHaveAttribute('href', '/nba')
    expect(pontos.previousElementSibling).toHaveTextContent('Stats')
    expect(pontos.nextElementSibling).toHaveTextContent('39,3 por jogo')
    expect(within(barra).getByRole('link', { name: 'Líder em rebotes: Domantas Sabonis (SAC)' })).toBeInTheDocument()
  })

  it('sem notícias, a faixa aparece só com as estatísticas', async () => {
    vi.mocked(buscarLideres).mockResolvedValue(lerLideres(respostaEspn))
    abrir([])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })
    expect(within(barra).getAllByRole('link').map((l) => l.textContent)).toEqual(['Líder em pontos: Luka Doncic (LAL)', 'Líder em rebotes: Domantas Sabonis (SAC)'])
  })

  it('a cópia da trilha não recebe foco do teclado', async () => {
    abrir([noticia({})])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })
    const copia = barra.querySelector('.noticias-lista[aria-hidden="true"]')!
    expect(copia.querySelector('a')).toHaveAttribute('tabindex', '-1')
  })

  it('o flash dispara quando chega notícia nova e a cada volta da faixa, mas não na primeira carga', async () => {
    let lista = [noticia({})]
    abrir(() => lista)
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })
    expect(barra.querySelector('.noticias-flash')).toBeNull()

    // Atualizar com as mesmas manchetes não pisca.
    window.dispatchEvent(new Event(NOTICIAS_MUDARAM))
    await new Promise((r) => setTimeout(r, 20))
    expect(barra.querySelector('.noticias-flash')).toBeNull()

    lista = [noticia({ id: 9, origin: 'admin', title: 'Troca bombástica', url: null }), noticia({})]
    window.dispatchEvent(new Event(NOTICIAS_MUDARAM))
    await within(barra).findAllByText('Troca bombástica')
    const primeiro = barra.querySelector('.noticias-flash')
    expect(primeiro).not.toBeNull()

    // Cada volta troca o elemento, para a animação rodar de novo.
    fireEvent.animationIteration(barra.querySelector('.noticias-trilha')!)
    expect(barra.querySelector('.noticias-flash')).not.toBe(primeiro)
  })

  it('pausa e continua pelo botão', async () => {
    const user = userEvent.setup()
    abrir([noticia({})])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })

    await user.click(within(barra).getByRole('button', { name: 'Pausar as notícias' }))
    expect(barra).toHaveClass('pausada')
    await user.click(within(barra).getByRole('button', { name: 'Continuar as notícias' }))
    expect(barra).not.toHaveClass('pausada')
  })

  it.each([
    ['sem notícias', []],
    ['quando a API falha', new Resposta(500, { error: 'Erro' })],
  ])('não aparece %s, e o app segue funcionando', async (_caso, resposta) => {
    const { ultima } = abrir(resposta)
    expect(await screen.findByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    await waitFor(() => expect(ultima('GET', '/news')).toBeDefined())
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('region', { name: 'Notícias de basquete' })).toBeNull()
  })

  it('uma falha ao atualizar mantém as manchetes que já estavam na barra', async () => {
    let falhar = false
    abrir(() => (falhar ? new Resposta(500, { error: 'Erro' }) : [noticia({})]))
    expect(await screen.findByRole('link', { name: 'Curry faz 40 pontos' })).toBeInTheDocument()

    falhar = true
    window.dispatchEvent(new Event(NOTICIAS_MUDARAM))
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByRole('link', { name: 'Curry faz 40 pontos' })).toBeInTheDocument()
  })

  it('some durante a sessão guiada', async () => {
    const { ultima } = abrir([noticia({})], '/sessao')
    await waitFor(() => expect(ultima('GET', '/news')).toBeDefined())
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('region', { name: 'Notícias de basquete' })).toBeNull()
  })
})

describe('tempoDeGravacao', () => {
  it.each([
    [0, '00:00:00'],
    [59, '00:00:59'],
    [61, '00:01:01'],
    [3_725, '01:02:05'],
  ])('%i s → %s', (segundos, esperado) => {
    expect(tempoDeGravacao(segundos)).toBe(esperado)
  })
})

describe('tempoAtras', () => {
  const agora = Date.parse('2026-10-30T12:00:00Z')
  it.each([
    ['2026-10-30T11:59:40Z', 'agora'],
    ['2026-10-30T11:55:00Z', 'há 5 min'],
    ['2026-10-29T23:00:00Z', 'há 13 h'],
    ['2026-10-29T10:00:00Z', 'há 1 dia'],
    ['2026-10-26T12:00:00Z', 'há 4 dias'],
  ])('%s → %s', (iso, esperado) => {
    expect(tempoAtras(iso, agora)).toBe(esperado)
  })
})
