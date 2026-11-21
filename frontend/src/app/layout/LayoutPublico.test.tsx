import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../test/api-falsa'
import { abrirApp } from '../../test/renderizar'

vi.mock('../../shared/lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

describe('Página aberta sem conta (Mercado Livre)', () => {
  it('Equipamentos abre para o visitante, com os links do Mercado Livre e o convite para entrar', async () => {
    apiFalsa({})
    abrirApp('/equipamentos')

    expect(await screen.findByRole('heading', { name: 'Equipamentos', level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/equipamentos')
    expect(screen.getAllByRole('link', { name: /Ver no Mercado Livre/ }).length).toBeGreaterThan(0)
    const topo = within(screen.getByRole('banner'))
    expect(topo.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(topo.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
    // O menu do app (treinos, rotina, configurações) é só para quem tem conta.
    expect(screen.queryByRole('button', { name: /Menu/ })).toBeNull()
  })

  it('Entrar leva ao login, levando junto a página aberta para voltar depois', async () => {
    const user = userEvent.setup()
    apiFalsa({})
    abrirApp('/equipamentos?aba=marcas')

    await user.click(await within(screen.getByRole('banner')).findByRole('link', { name: 'Entrar' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/entrar')
  })

  it.each(['/treinos', '/artigos', '/artigos/1', '/alimentacao', '/rotina'])('o resto do app continua pedindo login: %s', async rota => {
    apiFalsa({})
    abrirApp(rota)
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
