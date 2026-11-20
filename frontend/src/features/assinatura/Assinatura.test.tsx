import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp } from '../../test/renderizar'
import { apiFalsa, configFalsa, usuarioFalso, Resposta } from '../../test/api-falsa'
import { definirToken, tokenAtual } from '../../shared/api/backend'
import type { EstadoAssinatura } from '../../../../contracts/billing'

const status: EstadoAssinatura = { required: true, hasAccess: false, ready: true, canManage: true, paidUntil: null, subscription: null }
function abrir(extra: Record<string, object | ((body: unknown) => unknown)> = {}, rota = '/assinatura?plano=anual') {
  definirToken('tk')
  const fake = apiFalsa({ 'GET /auth/me': { ...usuarioFalso(), billing: { required: true, hasAccess: false } }, 'GET /settings': configFalsa, 'GET /billing/status': status, ...extra })
  abrirApp(rota)
  return fake
}
describe('Assinatura', () => {
  it('preserva o plano e o destino ao pedir login', async () => {
    apiFalsa({})
    abrirApp('/assinatura?plano=anual')
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/entrar'))
    expect(screen.getByRole('heading', { name: /^Entrar$/ })).toBeInTheDocument()
    expect(localStorage.getItem('bp.plano-escolhido')).toBe('anual')
  })
  it('envia apenas o identificador do plano e recusa redirecionamento externo inválido', async () => {
    const user = userEvent.setup()
    const fake = abrir({ 'POST /billing/checkout': { url: 'https://outro.example/pagar' } })
    await user.click(await screen.findByRole('button', { name: 'Continuar no Mercado Pago' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Endereço de pagamento inválido')
    expect(fake.ultima('POST', '/billing/checkout')?.corpo).toEqual({ plan: 'anual' })
  })
  it('sem configuração não permite iniciar cobrança', async () => {
    abrir({ 'GET /billing/status': { ...status, ready: false } })
    expect(await screen.findByRole('button', { name: 'Continuar no Mercado Pago' })).toBeDisabled()
    expect(screen.getByText(/As assinaturas estão em configuração/)).toBeInTheDocument()
  })
  it('pagamento ainda pendente mantém acesso bloqueado e não cria outro checkout ao consultar', async () => {
    const user = userEvent.setup()
    const pending = { ...status, subscription: { plan: 'anual', status: 'authorized' } }
    const fake = abrir({ 'GET /billing/status': pending, 'POST /billing/refresh': pending })
    await user.click(await screen.findByRole('button', { name: 'Verificar pagamento' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ainda não recebemos a confirmação de pagamento')
    expect(screen.queryByRole('link', { name: 'Ir para os treinos' })).not.toBeInTheDocument()
    expect(fake.ultima('POST', '/billing/checkout')).toBeUndefined()
  })
  it('falha de comunicação ao cancelar mantém confirmação disponível sem anunciar sucesso', async () => {
    const user = userEvent.setup()
    const paid = { ...status, hasAccess: true, paidUntil: '2027-12-01T12:00:00Z', subscription: { plan: 'anual', status: 'authorized' } }
    abrir({ 'GET /billing/status': paid, 'POST /billing/cancel': () => new Resposta(503, { error: 'Não foi possível confirmar o cancelamento.' }) })
    await user.click(await screen.findByRole('button', { name: 'Cancelar renovação' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar o cancelamento.')
    expect(screen.getByRole('button', { name: 'Confirmar cancelamento' })).toBeEnabled()
    expect(screen.queryByText('Renovação cancelada')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para os treinos' })).toBeInTheDocument()
  })
  it('cancelamento exige confirmação e mantém o acesso pago', async () => {
    const user = userEvent.setup()
    const paid = { ...status, hasAccess: true, paidUntil: '2027-12-01T12:00:00Z', subscription: { plan: 'anual', status: 'authorized' } }
    const fake = abrir({ 'GET /billing/status': paid, 'POST /billing/cancel': { ...paid, subscription: { plan: 'anual', status: 'cancelled' } } })
    await user.click(await screen.findByRole('button', { name: 'Cancelar renovação' }))
    expect(fake.ultima('POST', '/billing/cancel')).toBeUndefined()
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    expect(await screen.findByText('Renovação cancelada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para os treinos' })).toBeInTheDocument()
  })
  it('conta sem assinatura vai para o pagamento antes de carregar os treinos', async () => {
    const fake = abrir({}, '/treinos')
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/assinatura'))
    expect(fake.ultima('GET', '/exercises')).toBeUndefined()
  })
  it.each(['/treinos', '/treinos/1', '/rotina', '/sessao', '/programas', '/jogue-como', '/nba', '/nbb', '/alimentacao', '/conquistas', '/evolucao', '/overall', '/artigos', '/artigos/1', '/equipamentos'])('bloqueia o acesso direto sem pagamento em %s', async rota => {
    abrir({}, rota)
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/assinatura'))
  })
  it('dados de assinatura ausentes não concedem acesso ao aplicativo', async () => {
    const user = { ...usuarioFalso(), billing: undefined }
    const fake = abrir({ 'GET /auth/me': user }, '/treinos')
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/assinatura'))
    expect(fake.ultima('GET', '/exercises')).toBeUndefined()
  })
  it.each([undefined, null, 'inválida', '2020-01-01T00:00:00Z'])('validade ausente, inválida ou vencida não libera artigos: %s', async paidUntil => {
    abrir({ 'GET /auth/me': { ...usuarioFalso(), billing: { required: true, hasAccess: true, paidUntil } } }, '/artigos')
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/assinatura'))
  })
  it('acesso que vence no servidor volta à assinatura sem encerrar a sessão', async () => {
    let consultas = 0
    abrir({
      'GET /auth/me': () => ({ ...usuarioFalso(), billing: { required: true, hasAccess: consultas++ === 0, paidUntil: new Date(Date.now() + 86400_000).toISOString() } }),
      'GET /exercises': () => new Resposta(402, { error: 'Uma assinatura ativa é necessária para acessar os treinos.' }),
    }, '/treinos')
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/assinatura'))
    expect(tokenAtual()).toBe('tk')
    expect(consultas).toBeGreaterThanOrEqual(2)
  })
})

describe('Contato', () => {
  it('abre sem login e permite copiar o endereço sem aplicativo de e-mail', async () => {
    apiFalsa({})
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator.clipboard, 'writeText', { value: writeText, configurable: true })
    abrirApp('/contato')
    await user.click(screen.getByRole('button', { name: 'Copiar endereço' }))
    expect(writeText).toHaveBeenCalledWith('contatobasketballpractice@gmail.com')
    expect(await screen.findByRole('status')).toHaveTextContent('E-mail copiado.')
    expect(screen.getByRole('link', { name: '@basketballpratice ↗' })).toHaveAttribute('href', 'https://www.instagram.com/basketballpratice/')
  })
})
