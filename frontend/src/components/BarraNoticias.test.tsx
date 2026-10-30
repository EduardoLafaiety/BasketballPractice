import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { definirToken, type Noticia } from '../api'
import { NOTICIAS_MUDARAM, tempoAtras } from '../lib/noticias'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

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

  it('a cópia da trilha não recebe foco do teclado', async () => {
    abrir([noticia({})])
    const barra = await screen.findByRole('region', { name: 'Notícias de basquete' })
    const copia = barra.querySelector('[aria-hidden="true"]')!
    expect(copia.querySelector('a')).toHaveAttribute('tabindex', '-1')
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
