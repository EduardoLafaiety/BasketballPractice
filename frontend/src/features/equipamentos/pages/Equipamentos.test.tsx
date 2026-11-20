import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { TAG_AFILIADO, TIMES } from '../dados'
import { ICONES_TIMES } from '../icones-times'
import { apiFalsa, configFalsa, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp, abrirMenu } from '../../../test/renderizar'

vi.mock('../../../shared/lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

function abrir(caminho: string) {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
  abrirApp(caminho)
}

describe('Equipamentos', () => {
  it('aparece no menu principal', async () => {
    abrir('/')
    await abrirMenu()
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: /Equipamentos/ })).toHaveAttribute('href', '/equipamentos')
  })

  it('mostra uma bola de cada time, com link de afiliado e o aviso da Amazon', async () => {
    abrir('/equipamentos')
    expect(await screen.findByText(/Como Associado da Amazon/, {}, { timeout: 8000 })).toBeInTheDocument()
    expect(TIMES).toHaveLength(30)

    const lakers = screen.getByRole('link', { name: /Los Angeles Lakers/ })
    const href = new URL(lakers.getAttribute('href')!)
    expect(href.hostname).toBe('www.amazon.com.br')
    expect(href.searchParams.get('tag')).toBe(TAG_AFILIADO)
    expect(href.searchParams.get('k')).toMatch(/Lakers/)
    expect(lakers).toHaveAttribute('target', '_blank')
    expect(lakers).toHaveAttribute('rel', expect.stringContaining('sponsored'))
    expect(screen.getByRole('link', { name: /Dallas Mavericks/ })).toBeInTheDocument()
  })

  it('filtra por conferência e pela busca', async () => {
    abrir('/equipamentos')
    await screen.findByRole('link', { name: /Boston Celtics/ })

    await userEvent.click(screen.getByRole('button', { name: 'Oeste' }))
    expect(screen.queryByRole('link', { name: /Boston Celtics/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Ver na Amazon/ })).toHaveLength(15)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar time' }), 'warriors')
    expect(screen.getAllByRole('link', { name: /Ver na Amazon/ })).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Golden State Warriors/ })).toBeInTheDocument()
  })

  it('aba de marcas com Wilson, Spalding e Molten', async () => {
    abrir('/equipamentos')
    await userEvent.click(await screen.findByRole('tab', { name: /Bolas de marca/ }))
    expect(screen.getByRole('link', { name: /NBA Official Game Ball/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /TF-1000 Legacy/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /BG4500/ })).toBeInTheDocument()
  })
})

describe('Ícones dos times', () => {
  it('cada time tem um ícone próprio, diferente dos outros', () => {
    for (const t of TIMES) expect(ICONES_TIMES[t.icone], t.nome).toBeDefined()
    expect(new Set(TIMES.map((t) => t.icone)).size).toBe(TIMES.length)
  })
})

describe('bolas de time: réplica da Wilson NBA Team Tribute', () => {
  it('cada bola leva a marca e o logo do time, em alta resolução', async () => {
    abrir('/equipamentos')
    const lakers = await screen.findByRole('link', { name: /Los Angeles Lakers/ })
    expect(lakers.querySelector('.bola-nome')).toHaveTextContent('Wilson')
    const logo = lakers.querySelector('.bola-logo')!
    // Faixa roxa (escura): logo na versão para fundo escuro.
    expect(logo.getAttribute('href')).toBe('https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500-dark/lal.png&h=90&w=90')
    // A ESPN abrevia alguns times de outro jeito.
    const jazz = screen.getByRole('link', { name: /Utah Jazz/ })
    expect(jazz.querySelector('.bola-logo')!.getAttribute('href')).toContain('/utah.png')
    expect(document.querySelectorAll('.bola-logo')).toHaveLength(TIMES.length)
  })

  it('se o logo não carregar, entra o ícone próprio do time', async () => {
    abrir('/equipamentos')
    const bulls = await screen.findByRole('link', { name: /Chicago Bulls/ })
    fireEvent.error(bulls.querySelector('.bola-logo')!)
    expect(bulls.querySelector('.bola-logo')).toBeNull()
    expect(bulls.querySelector('svg g')).not.toBeNull()
  })

  it('as bolas de marca levam a marca e o nome do modelo, sem logo', async () => {
    abrir('/equipamentos?aba=marcas')
    const drv = await screen.findByRole('link', { name: /NBA DRV Pro/ })
    expect([...drv.querySelectorAll('.bola-nome')].map((t) => t.textContent)).toEqual(['Wilson', 'DRV PRO'])
    expect(document.querySelector('.bola-logo')).toBeNull()
  })
})

describe('bolas Wilson NBA All Team', () => {
  it('a Retro leva os logos retrô redesenhados, e a All Team os logos dos times nas calotas', async () => {
    abrir('/equipamentos')
    await userEvent.click(await screen.findByRole('tab', { name: /Bolas de marca/ }))
    const retro = screen.getByRole('link', { name: /NBA All Team Retro/ })
    const logosRetro = [...retro.querySelectorAll('.bola-adesivo')].map((l) => l.getAttribute('data-logo'))
    expect(logosRetro.length).toBeGreaterThan(20)
    expect(new Set(logosRetro)).toEqual(new Set(['rockets', 'hawks', 'kings', 'jazz', 'suns', 'pistons', 'celtics', 'warriors', 'raptors', 'blazers', 'magic', 'nuggets', 'grizzlies', 'knicks']))
    // Desenhos próprios: nenhuma imagem de fora na Retro.
    expect(retro.querySelectorAll('image.bola-colagem-logo')).toHaveLength(0)
    expect(retro.querySelector('.bola-nome')).toHaveTextContent('Wilson')

    const todas = screen.getByRole('link', { name: /NBA All Team(?! Retro)/ })
    const logos = [...todas.querySelectorAll('.bola-colagem-logo')].map((l) => l.getAttribute('href'))
    expect(new Set(logos).size).toBeGreaterThan(8)
    expect(logos.every((h) => h!.includes('teamlogos/nba/500/'))).toBe(true)
    expect(screen.getByRole('link', { name: /TF-1000 Legacy/ }).querySelector('.bola-colagem-logo')).toBeNull()
  })
})

