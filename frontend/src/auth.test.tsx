import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken, tokenAtual } from './api'
import { AuthProvider, REVERIFICAR_MS, useAuth } from './auth'
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

describe('falha passageira ao conferir a sessão', () => {
  /** Responde cada GET /auth/me com o próximo item da lista; o último se repete. */
  const respostasEu = (...respostas: unknown[]) => {
    let i = 0
    return () => respostas[Math.min(i++, respostas.length - 1)]
  }
  const falha503 = () => new Resposta(503, { error: 'Serviço indisponível' })
  const semRede = () => {
    throw new TypeError('Failed to fetch')
  }
  const passarEspera = () => act(() => vi.advanceTimersByTimeAsync(REVERIFICAR_MS))
  const chamadasEu = (chamadas: { caminho: string }[]) => chamadas.filter((c) => c.caminho === '/auth/me').length
  /** Relógio falso que ainda anda sozinho, para o findBy e o userEvent seguirem funcionando. */
  const usarRelogioFalso = () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  }

  it.each([
    ['503', falha503, 'Serviço indisponível'],
    ['falha de rede', semRede, 'Não foi possível falar com o servidor'],
  ])('%s em /admin mostra o erro com opção de tentar de novo, sem abrir o painel', async (_nome, falha, mensagem) => {
    definirToken('tk')
    const { chamadas } = apiFalsa({ 'GET /auth/me': falha, 'GET /settings': configFalsa })
    abrirApp('/admin')

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(mensagem)
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByText('Conferindo sua sessão…')).toBeNull()
    expect(tokenAtual()).toBe('tk')
    expect(chamadas.some((c) => c.caminho.startsWith('/admin'))).toBe(false)
  })

  it('tentar de novo volta a conferir e abre o painel do admin', async () => {
    definirToken('tk')
    let liberar: (u: unknown) => void = () => {}
    const segunda = new Promise((resolver) => { liberar = resolver })
    apiFalsa({
      'GET /auth/me': respostasEu(falha503(), segunda),
      'GET /settings': configFalsa,
      'GET /admin/users': [],
    })
    abrirApp('/admin')

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(screen.getByText('Conferindo sua sessão…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()

    liberar(usuarioFalso({ isAdmin: true }))
    expect(await screen.findByRole('heading', { name: 'Administração' })).toBeInTheDocument()
  })

  it('tentar de novo mostra "não encontrada" para quem não é admin', async () => {
    definirToken('tk')
    const { chamadas } = apiFalsa({
      'GET /auth/me': respostasEu(falha503(), usuarioFalso()),
      'GET /settings': configFalsa,
    })
    abrirApp('/admin')

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(chamadas.some((c) => c.caminho.startsWith('/admin'))).toBe(false)
  })

  it('401 ao tentar de novo sai da conta', async () => {
    definirToken('tk')
    apiFalsa({
      'GET /auth/me': respostasEu(falha503(), new Resposta(401, { error: 'Não autenticado' })),
      'GET /settings': configFalsa,
    })
    abrirApp('/admin')

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(tokenAtual()).toBeNull()
  })

  it('as outras telas seguem abertas e o menu se recupera sozinho, mesmo com falhas seguidas', async () => {
    usarRelogioFalso()
    definirToken('tk')
    const { chamadas } = apiFalsa({
      'GET /auth/me': respostasEu(falha503(), falha503(), usuarioFalso({ isAdmin: true })),
      'GET /settings': configFalsa,
    })
    abrirApp('/configuracoes')

    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
    expect(chamadasEu(chamadas)).toBe(1)
    expect(screen.queryByText('Marina')).toBeNull()
    expect(within(menu()).queryByRole('link', { name: 'Admin' })).toBeNull()

    await passarEspera()
    expect(chamadasEu(chamadas)).toBe(2)
    expect(screen.queryByText('Marina')).toBeNull()

    await passarEspera()
    expect(chamadasEu(chamadas)).toBe(3)
    expect(screen.getByText('Marina')).toBeInTheDocument()
    expect(within(menu()).getByRole('link', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()

    await passarEspera()
    expect(chamadasEu(chamadas)).toBe(3)
  })

  it('/admin abre sozinho quando a API volta', async () => {
    usarRelogioFalso()
    definirToken('tk')
    apiFalsa({
      'GET /auth/me': respostasEu(falha503(), usuarioFalso({ isAdmin: true })),
      'GET /settings': configFalsa,
      'GET /admin/users': [],
    })
    abrirApp('/admin')

    await screen.findByRole('alert')
    await passarEspera()
    expect(await screen.findByRole('heading', { name: 'Administração' })).toBeInTheDocument()
  })

  it('a nova conferência que dá certo apaga o erro guardado', async () => {
    usarRelogioFalso()
    definirToken('tk')
    apiFalsa({ 'GET /auth/me': respostasEu(falha503(), usuarioFalso()) })
    const Sonda = () => {
      const { usuario, erroSessao } = useAuth()
      return <p>{usuario?.name ?? 'sem usuário'} / {erroSessao?.message ?? 'sem erro'}</p>
    }
    render(<AuthProvider><Sonda /></AuthProvider>)

    expect(await screen.findByText('sem usuário / Serviço indisponível')).toBeInTheDocument()
    await passarEspera()
    expect(screen.getByText('Marina Silva / sem erro')).toBeInTheDocument()
  })

  it('sair para as novas tentativas', async () => {
    const user = usarRelogioFalso()
    definirToken('tk')
    const { chamadas } = apiFalsa({ 'GET /auth/me': falha503, 'GET /settings': configFalsa })
    abrirApp('/admin')

    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()

    const antes = chamadasEu(chamadas)
    await passarEspera()
    expect(chamadasEu(chamadas)).toBe(antes)
  })

  it('resposta atrasada de uma conferência não reabre a sessão depois de sair', async () => {
    definirToken('tk')
    let liberar: (u: unknown) => void = () => {}
    const segunda = new Promise((resolver) => { liberar = resolver })
    apiFalsa({ 'GET /auth/me': respostasEu(falha503(), segunda), 'GET /settings': configFalsa })
    abrirApp('/admin')

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()

    await act(async () => {
      liberar(usuarioFalso({ isAdmin: true }))
      await segunda
      await new Promise((resolver) => setTimeout(resolver, 0))
    })
    expect(screen.getByTestId('caminho')).toHaveTextContent('/entrar')
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('falha atrasada de uma conferência não rearma as tentativas depois de sair', async () => {
    const user = usarRelogioFalso()
    definirToken('tk')
    let rejeitar: () => void = () => {}
    const segunda = new Promise((_, r) => { rejeitar = () => r(new TypeError('Failed to fetch')) })
    const { chamadas } = apiFalsa({ 'GET /auth/me': respostasEu(falha503(), segunda), 'GET /settings': configFalsa })
    abrirApp('/admin')

    await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    await screen.findByRole('heading', { name: 'Entrar' })

    await act(async () => {
      rejeitar()
      await vi.advanceTimersByTimeAsync(0)
    })
    const antes = chamadasEu(chamadas)
    await passarEspera()
    expect(chamadasEu(chamadas)).toBe(antes)
  })

  it.each([
    ['/entrar', 'POST /auth/login', 'Entrar'],
    ['/cadastro', 'POST /auth/register', 'Criar conta'],
  ])('entrar por %s depois da falha para as novas tentativas', async (rota, post, botao) => {
    const user = usarRelogioFalso()
    definirToken('tk-antigo')
    const { chamadas } = apiFalsa({
      'GET /auth/me': falha503,
      [post]: { token: 'tk-novo', user: usuarioFalso() },
      'GET /settings': configFalsa,
    })
    abrirApp(rota)
    await waitFor(() => expect(chamadasEu(chamadas)).toBe(1))

    if (rota === '/cadastro') await user.type(screen.getByLabelText('Nome'), 'Marina')
    await user.type(screen.getByLabelText('E-mail'), 'marina@example.com')
    await user.type(screen.getByLabelText(/^Senha/), '12345678')
    await user.click(screen.getByRole('button', { name: botao }))
    await screen.findByText('Marina')
    expect(tokenAtual()).toBe('tk-novo')

    const antes = chamadasEu(chamadas)
    await passarEspera()
    expect(chamadasEu(chamadas)).toBe(antes)
  })
})
