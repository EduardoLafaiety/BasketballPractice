import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { ARTIGOS, CATEGORIAS, POR_FILEIRA, minutosDeLeitura } from '../artigos/dados'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

function abrir(caminho: string) {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
  abrirApp(caminho)
}

// Os cartões da lista; o destaque da semana, no alto, fica de fora da contagem.
const links = () =>
  screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/artigos/') && !l.classList.contains('artigo-destaque'))

describe('Artigos', () => {
  it('aparece no menu principal', async () => {
    abrir('/')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: /Artigos/ })).toHaveAttribute('href', '/artigos')
  })

  it('lista todos os artigos e filtra por categoria e por busca', async () => {
    abrir('/artigos')
    expect(await screen.findByRole('heading', { name: 'Artigos', level: 1 })).toBeInTheDocument()
    expect(links()).toHaveLength(ARTIGOS.length)

    await userEvent.click(screen.getByRole('button', { name: /Sono/ }))
    expect(screen.getByRole('button', { name: /Sono/ })).toHaveAttribute('aria-pressed', 'true')
    expect(links()).toHaveLength(ARTIGOS.filter((a) => a.categoria === 'sono').length)
    expect(screen.queryByText('De um cesto de pêssego à NBA')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver todas as categorias' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar artigo' }), 'hidratação')
    expect(links()).toHaveLength(1)

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar artigo' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar artigo' }), 'xyzw')
    expect(screen.getByText('Nenhum artigo encontrado.')).toBeInTheDocument()
  })

  it('abre o artigo com a ciência, a prática, as fontes e os relacionados', async () => {
    abrir('/artigos?categoria=sono')
    await userEvent.click(await screen.findByRole('link', { name: /Dormir mais acerta mais arremessos/ }))

    expect(screen.getByRole('heading', { name: 'Dormir mais acerta mais arremessos', level: 1 })).toBeInTheDocument()
    const ciencia = screen.getByRole('complementary', { name: 'O que a ciência diz' })
    const estudo = within(ciencia).getByRole('link', { name: /Mah CD, Mah KE, Kezirian EJ, Dement WC\. Sleep, 2011/ })
    expect(estudo).toHaveAttribute('href', 'https://doi.org/10.5665/sleep.1132')
    expect(estudo).toHaveAttribute('target', '_blank')
    expect(estudo).toHaveAttribute('rel', 'noopener noreferrer')
    const pratica = screen.getByRole('complementary', { name: 'Na prática' })
    expect(within(pratica).getByRole('link', { name: /Organizar minha rotina/ })).toHaveAttribute('href', '/rotina')
    // Cada fonte da lista é um link para o original.
    const fontes = screen.getByRole('heading', { name: 'Fontes' }).closest('section')!
    const itens = within(fontes).getAllByRole('listitem')
    expect(itens.length).toBeGreaterThan(0)
    for (const item of itens) expect(within(item).getByRole('link')).toHaveAttribute('href', expect.stringMatching(/^https:\/\//))
    // Uma fileira cheia: os 4 seguintes da mesma categoria.
    const leia = screen.getByRole('heading', { name: 'Leia também' }).nextElementSibling as HTMLElement
    expect(within(leia).getAllByRole('link')).toHaveLength(POR_FILEIRA)
    expect(screen.getByRole('link', { name: /Higiene do sono/ })).toHaveAttribute('href', '/artigos/higiene-do-sono')
  })

  it('artigo inexistente mostra a página não encontrada', async () => {
    abrir('/artigos/nao-existe')
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Na prática' })).not.toBeInTheDocument()
  })
})

describe('dados dos artigos', () => {
  it('cada artigo tem id único, categoria válida, prática e fontes', () => {
    expect(new Set(ARTIGOS.map((a) => a.id)).size).toBe(ARTIGOS.length)
    for (const a of ARTIGOS) {
      expect(CATEGORIAS.map((c) => c.id)).toContain(a.categoria)
      expect(a.pratica.length).toBeGreaterThan(0)
      expect(a.fontes.length).toBeGreaterThan(0)
      expect(minutosDeLeitura(a)).toBeGreaterThanOrEqual(1)
    }
    // Toda categoria tem oito artigos: duas fileiras cheias de 4, sem cartão sobrando.
    for (const c of CATEGORIAS) expect(ARTIGOS.filter((a) => a.categoria === c.id)).toHaveLength(2 * POR_FILEIRA)
    expect(ARTIGOS.length % POR_FILEIRA).toBe(0)
  })
})
