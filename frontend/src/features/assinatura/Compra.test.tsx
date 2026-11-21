import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { apiFalsa } from '../../test/api-falsa'
import { abrirApp } from '../../test/renderizar'
import { prepararCompra } from './compra-local'

afterEach(() => sessionStorage.clear())
describe('Pagamento antes da conta', () => {
  it('o link de novo cliente na tela de login leva ao pagamento primeiro', async () => {
    apiFalsa({ 'GET /billing/availability': { ready: true } })
    abrirApp('/entrar')
    await userEvent.click(await screen.findByRole('link', { name: 'Escolher um plano' }))
    expect(await screen.findByLabelText('Seu e-mail de acesso')).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/assinatura')
  })
  it('voltar ao checkout com uma compra já paga leva ao cadastro sem pedir novo pagamento', async () => {
    prepararCompra('cliente@example.com', 'mensal')
    const fake = apiFalsa({ 'GET /billing/availability': { ready: true }, 'POST /billing/purchase/status': { email: 'cliente@example.com', plan: 'mensal', paid: true, paidUntil: '2099-01-01', status: 'authorized', url: null } })
    abrirApp('/assinatura')
    expect(await screen.findByRole('link', { name: 'Criar minha conta' })).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/compra')
    expect(fake.ultima('POST', '/billing/purchase')).toBeUndefined()
  })
  it('consulta uma compra paga e só então oferece cadastro com o e-mail preenchido', async () => {
    const local = prepararCompra('cliente@example.com', 'anual')
    const fake = apiFalsa({ 'POST /billing/purchase/status': { email: local.email, plan: 'anual', paid: true, paidUntil: '2099-01-01', status: 'authorized', url: null } })
    abrirApp('/compra?paid=true')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: 'Criar minha conta' }))
    expect(await screen.findByLabelText('E-mail')).toHaveValue('cliente@example.com')
    expect(screen.getByTestId('caminho')).toHaveTextContent('/cadastro')
    expect(fake.ultima('POST', '/billing/purchase/status')?.corpo).toEqual({ checkoutKey: local.key })
    expect(fake.ultima('POST', '/billing/purchase')).toBeUndefined()
  })
  it('pagamento autorizado ainda sem aprovação não oferece cadastro e ignora query falsa', async () => {
    prepararCompra('cliente@example.com', 'mensal')
    apiFalsa({ 'POST /billing/purchase/status': { email: 'cliente@example.com', plan: 'mensal', paid: false, paidUntil: null, status: 'authorized', url: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=teste' } })
    abrirApp('/compra?status=approved&paid=true')
    expect(await screen.findByText('Estamos aguardando a confirmação do Mercado Pago. Você não precisa pagar novamente.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Criar minha conta' })).not.toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/compra')
  })
  it('checkout público valida o redirecionamento e não pede nome ou senha', async () => {
    const fake = apiFalsa({ 'GET /billing/availability': { ready: true }, 'POST /billing/purchase': { url: 'https://fraude.example/pagar' } })
    abrirApp('/assinatura?plano=anual')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Seu e-mail de acesso'), 'cliente@example.com')
    await user.click(await screen.findByRole('button', { name: 'Continuar no Mercado Pago' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Endereço de pagamento inválido.')
    expect(fake.ultima('POST', '/billing/purchase')?.corpo).toEqual({ email: 'cliente@example.com', plan: 'anual', mode: 'avulso', checkoutKey: expect.stringMatching(/^[a-f0-9]{64}$/) })
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
  })
  it('o anual continua clicável e reutiliza a chave para conciliar a troca no servidor', async () => {
    const local = prepararCompra('primeiro@example.com', 'mensal')
    const fake = apiFalsa({ 'GET /billing/availability': { ready: true }, 'POST /billing/purchase': {url:'https://fraude.example/pagar'} })
    abrirApp('/assinatura?plano=anual')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Continuar no Mercado Pago' }))
    await waitFor(() => expect(fake.ultima('POST', '/billing/purchase')?.corpo).toEqual({email:local.email,plan:'anual',checkoutKey:local.key}))
    expect(screen.getByRole('radio', { name: /Anual/ })).toBeEnabled()
    expect(screen.getByRole('radio', { name: /Anual/ })).toBeChecked()
  })
  it('a escolha explícita mensal prevalece sobre uma escolha anual salva', async () => {
    prepararCompra('cliente@example.com','anual')
    apiFalsa({ 'GET /billing/availability': {ready:true} })
    abrirApp('/assinatura?plano=mensal')
    expect(await screen.findByRole('radio',{name:/Mensal/})).toBeChecked()
    await userEvent.click(screen.getByRole('radio',{name:/Anual/}))
    expect(screen.getByRole('radio',{name:/Anual/})).toBeChecked()
    expect(screen.getByText('Pix, boleto, débito ou crédito')).toBeInTheDocument()
  })
})
