import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../test/api-falsa'
import { abrirApp } from '../../test/renderizar'
import { ARTIGOS } from '../../features/artigos/dados'

vi.mock('../../shared/lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

describe('Páginas abertas sem conta', () => {
  it('Equipamentos abre para o visitante, com os links da Amazon e o convite para entrar', async () => {
    apiFalsa({})
    abrirApp('/equipamentos')

    expect(await screen.findByRole('heading', { name: 'Equipamentos', level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/equipamentos')
    expect(screen.getAllByRole('link', { name: /Ver na Amazon/ }).length).toBeGreaterThan(0)
    const topo = within(screen.getByRole('banner'))
    expect(topo.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(topo.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
    // O menu do app (treinos, rotina, configurações) é só para quem tem conta.
    expect(screen.queryByRole('button', { name: /Menu/ })).toBeNull()
  })

  it('a lista e cada artigo abrem sem conta, e o visitante anda entre as duas páginas pelo topo', async () => {
    const user = userEvent.setup()
    apiFalsa({})
    abrirApp(`/artigos/${ARTIGOS[0].id}`)

    expect(await screen.findByRole('heading', { name: ARTIGOS[0].titulo, level: 1 })).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Páginas abertas' })).getByRole('link', { name: 'Artigos' }))
    expect(await screen.findByRole('heading', { name: 'Artigos', level: 1 })).toBeInTheDocument()
  })

  it('Entrar leva ao login, levando junto a página aberta para voltar depois', async () => {
    const user = userEvent.setup()
    apiFalsa({})
    abrirApp('/equipamentos?aba=marcas')

    await user.click(await within(screen.getByRole('banner')).findByRole('link', { name: 'Entrar' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/entrar')
  })

  it('o resto do app continua pedindo login', async () => {
    apiFalsa({})
    abrirApp('/treinos')
    expect(await screen.findByTestId('caminho')).toHaveTextContent('/entrar')
  })

  it('quem tem conta vê as mesmas páginas dentro do app de sempre', async () => {
    definirToken('tk')
    apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
    abrirApp('/equipamentos')

    expect(await screen.findByRole('heading', { name: 'Equipamentos', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Menu|Mais/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Criar conta' })).toBeNull()
  })
})
