import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { definirToken, tokenAtual } from './api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from './test/api-falsa'
import { abrirApp } from './test/renderizar'

const menu = () => screen.getByRole('navigation')

describe('sessão do usuário', () => {
  it('reaproveita o token salvo e mostra o nome no topo', async () => {
    definirToken('tk-salvo')
    const { ultima } = apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa })
    abrirApp('/configuracoes')

    expect(screen.getByRole('status')).toHaveTextContent('Conferindo sua sessão')
    expect(await screen.findByText('Marina')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
    expect(ultima('GET', '/auth/me')?.headers.Authorization).toBe('Bearer tk-salvo')
  })

  it('descarta token inválido e volta para o login', async () => {
    definirToken('tk-expirado')
    apiFalsa({ 'GET /auth/me': new Resposta(401, { error: 'Não autenticado' }) })
    abrirApp('/rotina')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(tokenAtual()).toBeNull()
  })

  it('sair apaga o token e volta para o login', async () => {
    definirToken('tk-salvo')
    apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa })
    abrirApp('/configuracoes')

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(tokenAtual()).toBeNull()
    expect(localStorage.getItem('bp.token')).toBeNull()
  })
})

describe('acesso de administrador', () => {
  it('atleta comum não vê o link Admin nem abre a página', async () => {
    definirToken('tk')
    const { chamadas } = apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa })
    abrirApp('/admin')

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(within(menu()).queryByRole('link', { name: 'Admin' })).toBeNull()
    expect(chamadas.some((c) => c.caminho.startsWith('/admin'))).toBe(false)
  })

  it('admin vê o link no menu e abre o painel', async () => {
    definirToken('tk')
    apiFalsa({
      'GET /auth/me': usuarioFalso({ isAdmin: true }),
      'GET /settings': configFalsa,
      'GET /admin/users': [],
    })
    abrirApp('/configuracoes')

    await screen.findByText('Marina')
    const link = within(menu()).getByRole('link', { name: 'Admin' })
    await userEvent.click(link)
    expect(await screen.findByRole('heading', { name: 'Administração' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('0 contas · 0 admins')).toBeInTheDocument())
  })
})
