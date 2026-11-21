import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { definirToken, type UsuarioAdmin } from '../../../shared/api/backend'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp } from '../../../test/renderizar'

const conta = (extra: Partial<UsuarioAdmin>): UsuarioAdmin => ({ id: 1, name: 'Agatha Lafaiety', email: 'agatha.lafaietyy@gmail.com', isAdmin: true, createdAt: '2026-10-01T12:00:00Z', workouts: 0, sessions: 0, lastSessionAt: null, blocked: false, ...extra })
const contas = () => [conta({}), conta({ id: 2, name: 'Joana Lima', email: 'joana@example.com', isAdmin: false, workouts: 3, sessions: 12, paidUntil: '2099-01-01T00:00:00Z', plan: 'anual' }), conta({ id: 3, name: 'Pedro Alves', email: 'pedro@example.com', isAdmin: false })]
function abrirPainel(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk-admin')
  const api = apiFalsa({ 'GET /auth/me': usuarioFalso({ id: 1, isAdmin: true }), 'GET /settings': configFalsa, 'GET /admin/users': contas(), 'GET /admin/users/1': { ...contas()[0], audit: [] }, 'GET /admin/users/2': { ...contas()[1], audit: [] }, 'GET /admin/users/3': { ...contas()[2], audit: [] }, 'GET /news': [], ...rotas })
  abrirApp('/admin')
  return api
}
const detalhes = async (name: string) => { await userEvent.click(await screen.findByRole('button', { name: `Ver detalhes de ${name}` })); return screen.findByRole('dialog') }

describe('Gestão de usuários', () => {
  it('inicia vazia quando há somente os responsáveis e mostra os dois no filtro de administradores', async () => {
    const user = userEvent.setup()
    abrirPainel({ 'GET /admin/users': [conta({}), conta({ id: 4, name: 'Eduardo Lopes', email: 'deveducontato@gmail.com' })] })
    expect(await screen.findByText('Nenhum usuário cadastrado')).toBeInTheDocument()
    expect(screen.getByText('0 contas encontradas')).toBeInTheDocument()
    expect(screen.queryByText('Agatha Lafaiety')).toBeNull()
    expect(screen.queryByText('Eduardo Lopes')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Administradores 2' }))
    expect(screen.getByText('Agatha Lafaiety')).toBeInTheDocument()
    expect(screen.getByText('Eduardo Lopes')).toBeInTheDocument()
  })
  it('busca por nome ou e-mail, filtra assinantes e limpa resultado vazio', async () => {
    const user = userEvent.setup(); abrirPainel()
    expect(await screen.findByText('2 contas encontradas')).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'PEDRO@')
    expect(screen.getByText('Pedro Alves')).toBeInTheDocument(); expect(screen.queryByText('Joana Lima')).toBeNull()
    await user.clear(screen.getByRole('searchbox')); await user.type(screen.getByRole('searchbox'), 'inexistente')
    expect(screen.getByText('Nenhuma conta encontrada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await user.click(screen.getByRole('button', { name: 'Assinantes 1' }))
    expect(screen.getByText('Joana Lima')).toBeInTheDocument(); expect(screen.queryByText('Pedro Alves')).toBeNull()
  })
  it('protege administradores e não oferece promoção de outras contas', async () => {
    abrirPainel(); await userEvent.click(await screen.findByRole('button', { name: 'Administradores 1' })); const dialog = await detalhes('Agatha Lafaiety')
    expect(within(dialog).getByText(/Conta responsável protegida/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Bloquear conta' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Tornar admin/ })).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fechar detalhes' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('salva o nome e mostra o histórico', async () => {
    const user = userEvent.setup(); const { ultima } = abrirPainel({ 'PATCH /admin/users/2': body => ({ ...contas()[1], name: (body as { name: string }).name }), 'GET /admin/users/2': { ...contas()[1], audit: [{ id: 1, action: 'sessions_revoked', actorName: 'Agatha Lafaiety', createdAt: '2026-11-20' }] } })
    const dialog = await detalhes('Joana Lima')
    expect(await within(dialog).findByText('Sessões encerradas')).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('Nome')); await user.type(within(dialog).getByLabelText('Nome'), 'Joana Silva')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar nome' }))
    await waitFor(() => expect(ultima('PATCH', '/admin/users/2')?.corpo).toEqual({ name: 'Joana Silva' }))
    expect(await within(dialog).findByRole('heading', { name: 'Joana Silva' })).toBeInTheDocument()
  })
  it('bloqueio requer confirmação e mantém o formulário após falha da API', async () => {
    const user = userEvent.setup(); const { chamadas } = abrirPainel({ 'PATCH /admin/users/3': new Resposta(403, { error: 'Ação recusada' }) })
    const dialog = await detalhes('Pedro Alves')
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear conta' }))
    expect(chamadas.some(c => c.metodo === 'PATCH')).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ação recusada')
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })
  it('encerra sessões após confirmação', async () => {
    const user = userEvent.setup(); const { chamadas } = abrirPainel({ 'POST /admin/users/3/revoke-sessions': new Resposta(204) })
    const dialog = await detalhes('Pedro Alves')
    await user.click(within(dialog).getByRole('button', { name: 'Encerrar sessões' }))
    expect(chamadas.some(c => c.url.pathname.includes('revoke-sessions'))).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await within(dialog).findByRole('status')).toHaveTextContent('Sessões encerradas.')
  })
  it('exige o e-mail exato antes de excluir a conta', async () => {
    const user = userEvent.setup(); abrirPainel({ 'DELETE /admin/users/3': new Resposta(204) })
    const dialog = await detalhes('Pedro Alves')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir conta' }))
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    await user.type(within(dialog).getByLabelText('E-mail para confirmar'), 'pedro@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(screen.queryByText('Pedro Alves')).toBeNull())
    expect(screen.getByText('1 contas encontradas')).toBeInTheDocument()
  })
  it('permite tentar de novo quando a lista falha', async () => {
    let falhar = true; abrirPainel({ 'GET /admin/users': () => falhar ? new Resposta(500, { error: 'Erro interno do servidor' }) : contas() })
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor')
    falhar = false; await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('2 contas encontradas')).toBeInTheDocument()
  })
})
