import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken, type UsuarioAdmin } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const conta = (extra: Partial<UsuarioAdmin>): UsuarioAdmin => ({
  id: 1,
  name: 'Marina Silva',
  email: 'marina@example.com',
  isAdmin: false,
  createdAt: '2026-10-01T12:00:00.000Z',
  workouts: 0,
  sessions: 0,
  lastSessionAt: null,
  ...extra,
})

const contas = () => [
  conta({ id: 1, name: 'Marina Silva', email: 'marina@example.com', isAdmin: true }),
  conta({ id: 2, name: 'Joana Lima', email: 'joana@example.com', workouts: 3, sessions: 12, lastSessionAt: '2026-10-27T21:00:00.000Z' }),
  conta({ id: 3, name: 'Pedro Alves', email: 'pedro@example.com' }),
]

function abrirPainel(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk-admin')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso({ id: 1, isAdmin: true }),
    'GET /settings': configFalsa,
    'GET /admin/users': contas(),
    ...rotas,
  })
  abrirApp('/admin')
  return api
}

const cartao = async (nome: string) => (await screen.findByText(nome)).closest('li') as HTMLElement

describe('Painel admin', () => {
  it('lista as contas com o resumo de uso', async () => {
    abrirPainel()

    expect(await screen.findByText('3 contas · 1 admin')).toBeInTheDocument()
    const joana = await cartao('Joana Lima')
    expect(joana).toHaveTextContent('joana@example.com')
    expect(joana).toHaveTextContent('3 treinos · 12 sessões · última em')
  })

  it('não oferece ações na própria conta', async () => {
    abrirPainel()
    const eu = await cartao('Marina Silva')
    expect(eu).toHaveTextContent('(você)')
    expect(within(eu).queryByRole('button')).toBeNull()
  })

  it('promove e rebaixa administradores', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirPainel({
      'PATCH /admin/users/2': (corpo) => conta({ ...contas()[1], isAdmin: (corpo as { isAdmin: boolean }).isAdmin }),
    })
    const joana = await cartao('Joana Lima')

    await user.click(within(joana).getByRole('button', { name: 'Tornar admin' }))
    expect(await within(joana).findByRole('button', { name: 'Remover admin' })).toBeInTheDocument()
    expect(within(joana).getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('3 contas · 2 admins')).toBeInTheDocument()
    expect(ultima('PATCH', '/admin/users/2')?.corpo).toEqual({ isAdmin: true })

    await user.click(within(joana).getByRole('button', { name: 'Remover admin' }))
    expect(await within(joana).findByRole('button', { name: 'Tornar admin' })).toBeInTheDocument()
    expect(ultima('PATCH', '/admin/users/2')?.corpo).toEqual({ isAdmin: false })
  })

  it('só exclui a conta depois de confirmar', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { chamadas } = abrirPainel({ 'DELETE /admin/users/3': new Resposta(204) })
    const pedro = await cartao('Pedro Alves')

    await user.click(within(pedro).getByRole('button', { name: 'Excluir' }))
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('Pedro Alves (pedro@example.com)'))
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)

    confirmar.mockReturnValue(true)
    await user.click(within(pedro).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(screen.queryByText('Pedro Alves')).toBeNull())
    expect(screen.getByText('2 contas · 1 admin')).toBeInTheDocument()
  })

  it('mostra o erro quando a API recusa a ação', async () => {
    const user = userEvent.setup()
    abrirPainel({ 'PATCH /admin/users/3': new Resposta(403, { error: 'Acesso restrito a administradores' }) })
    const pedro = await cartao('Pedro Alves')

    await user.click(within(pedro).getByRole('button', { name: 'Tornar admin' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso restrito a administradores')
    expect(within(pedro).getByRole('button', { name: 'Tornar admin' })).toBeEnabled()
  })

  it('permite tentar de novo quando a lista não carrega', async () => {
    const user = userEvent.setup()
    let falhar = true
    abrirPainel({
      'GET /admin/users': () => (falhar ? new Resposta(500, { error: 'Erro interno do servidor' }) : contas()),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor')
    falhar = false
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('3 contas · 1 admin')).toBeInTheDocument()
  })
})
