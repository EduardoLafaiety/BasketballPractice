import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { definirToken, tokenAtual } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const caminho = () => screen.getByTestId('caminho').textContent
const sessao = { token: 'tk-novo', user: usuarioFalso() }

describe('Sair', () => {
  it('revoga o token na API com o token que estava em uso, e limpa o navegador', async () => {
    definirToken('tk-salvo')
    const { ultima } = apiFalsa({
      'GET /auth/me': usuarioFalso(),
      'GET /settings': configFalsa,
      'POST /auth/logout': new Resposta(204),
    })
    abrirApp('/configuracoes')

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(ultima('POST', '/auth/logout')?.headers.Authorization).toBe('Bearer tk-salvo')
    expect(tokenAtual()).toBeNull()
  })

  it('sem conexão com a API, sai deste navegador do mesmo jeito', async () => {
    definirToken('tk-salvo')
    apiFalsa({
      'GET /auth/me': usuarioFalso(),
      'GET /settings': configFalsa,
      'POST /auth/logout': new Resposta(503, { error: 'fora do ar' }),
    })
    abrirApp('/configuracoes')

    await userEvent.click(await screen.findByRole('button', { name: 'Sair da conta' }))
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(tokenAtual()).toBeNull()
  })

  it('token recusado pela API limpa o navegador sem tentar revogar de novo', async () => {
    definirToken('tk-revogado')
    const { chamadas } = apiFalsa({ 'GET /auth/me': new Resposta(401, { error: 'Não autenticado' }) })
    abrirApp('/rotina')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(chamadas.some((c) => c.caminho === '/auth/logout')).toBe(false)
  })
})

describe('Entrar e cadastro', () => {
  it('o login oferece a recuperação de senha, e o erro 429 da API chega à tela', async () => {
    const user = userEvent.setup()
    apiFalsa({ 'POST /auth/login': new Resposta(429, { error: 'Muitas tentativas nesta conta. Recupere a senha para entrar agora ou tente de novo em 15 min.' }) })
    abrirApp('/entrar')

    await user.type(screen.getByLabelText('E-mail'), 'marina@example.com')
    await user.type(screen.getByLabelText(/^Senha/), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Recupere a senha')
    // A dica de ativação é só para a senha recusada.
    expect(screen.queryByText(/ative pelo link/)).toBeNull()

    await user.click(screen.getByRole('link', { name: 'Esqueci minha senha' }))
    expect(caminho()).toBe('/recuperar-senha')
  })

  it('senha recusada lembra de ativar a conta', async () => {
    const user = userEvent.setup()
    apiFalsa({ 'POST /auth/login': new Resposta(401, { error: 'E-mail ou senha incorretos' }) })
    abrirApp('/entrar')

    await user.type(screen.getByLabelText('E-mail'), 'marina@example.com')
    await user.type(screen.getByLabelText(/^Senha/), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/ative pelo link/)).toBeInTheDocument()
  })

  it('o cadastro liga para os dois documentos e mostra no campo a recusa de senha óbvia', async () => {
    const user = userEvent.setup()
    const obvia = 'Essa senha é fácil demais de adivinhar. Escolha outra.'
    apiFalsa({ 'POST /auth/register': new Resposta(400, { error: 'Dados inválidos', details: { password: [obvia] } }) })
    abrirApp('/cadastro')

    const declaracao = screen.getByText(/você declara ter lido/)
    expect(within(declaracao).getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos')
    expect(within(declaracao).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')

    await user.type(screen.getByLabelText('Nome'), 'Marina')
    await user.type(screen.getByLabelText('E-mail'), 'marina@example.com')
    await user.type(screen.getByLabelText(/^Senha/), '12345678')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText(obvia)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled()
  })
})

describe('Recuperar a senha', () => {
  it('mostra o aviso da API, sem afirmar que a conta existe', async () => {
    const user = userEvent.setup()
    const aviso = 'Se houver uma conta com este e-mail, enviamos um link para criar uma senha nova.'
    const { ultima } = apiFalsa({ 'POST /auth/forgot-password': new Resposta(202, { message: aviso }) })
    abrirApp('/recuperar-senha')

    await user.type(screen.getByLabelText('E-mail'), ' marina@example.com ')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByRole('status')).toHaveTextContent(aviso)
    expect(ultima('POST', '/auth/forgot-password')?.corpo).toEqual({ email: 'marina@example.com' })
  })

  it('mostra o erro no campo e libera nova tentativa', async () => {
    const user = userEvent.setup()
    apiFalsa({ 'POST /auth/forgot-password': new Resposta(400, { error: 'Dados inválidos', details: { email: ['E-mail inválido.'] } }) })
    abrirApp('/recuperar-senha')

    await user.type(screen.getByLabelText('E-mail'), 'marina@')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeEnabled()
  })
})

describe('Links do e-mail', () => {
  const rotasDoApp = { 'GET /settings': configFalsa }

  it('senha nova: usa o token do endereço, entra e vai para o início', async () => {
    const user = userEvent.setup()
    const { ultima } = apiFalsa({ ...rotasDoApp, 'POST /auth/reset-password': sessao })
    abrirApp('/redefinir-senha#token=abc-123_x')

    await user.type(screen.getByLabelText(/^Senha nova/), 'outra-senha-boa')
    await user.click(screen.getByRole('button', { name: 'Salvar e entrar' }))

    await waitFor(() => expect(tokenAtual()).toBe('tk-novo'))
    expect(ultima('POST', '/auth/reset-password')?.corpo).toEqual({ token: 'abc-123_x', password: 'outra-senha-boa' })
    await waitFor(() => expect(caminho()).toBe('/'))
    expect(await screen.findByText('Marina')).toBeInTheDocument()
  })

  it('senha óbvia: mostra no campo e o link continua utilizável', async () => {
    const user = userEvent.setup()
    const obvia = 'Essa senha é fácil demais de adivinhar. Escolha outra.'
    let tentativa = 0
    apiFalsa({
      ...rotasDoApp,
      'POST /auth/reset-password': () => (tentativa++ ? sessao : new Resposta(400, { error: 'Dados inválidos', details: { password: [obvia] } })),
    })
    abrirApp('/redefinir-senha#token=abc')

    await user.type(screen.getByLabelText(/^Senha nova/), '12345678')
    await user.click(screen.getByRole('button', { name: 'Salvar e entrar' }))
    expect(await screen.findByText(obvia)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Pedir outro link' })).toBeNull()

    await user.clear(screen.getByLabelText(/^Senha nova/))
    await user.type(screen.getByLabelText(/^Senha nova/), 'outra-senha-boa')
    await user.click(screen.getByRole('button', { name: 'Salvar e entrar' }))
    await waitFor(() => expect(tokenAtual()).toBe('tk-novo'))
  })

  it('link vencido: troca o formulário pelo caminho de pedir outro', async () => {
    const user = userEvent.setup()
    apiFalsa({ 'POST /auth/reset-password': new Resposta(400, { error: 'Este link é inválido ou já venceu. Peça outro.' }) })
    abrirApp('/redefinir-senha#token=velho')

    await user.type(screen.getByLabelText(/^Senha nova/), 'outra-senha-boa')
    await user.click(screen.getByRole('button', { name: 'Salvar e entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('inválido ou já venceu')
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute('href', '/recuperar-senha')
    expect(screen.queryByRole('button', { name: 'Salvar e entrar' })).toBeNull()
    expect(tokenAtual()).toBeNull()
  })

  it('endereço sem token: não oferece formulário nem chama a API', () => {
    const { chamadas } = apiFalsa({})
    abrirApp('/redefinir-senha')
    expect(screen.getByRole('alert')).toHaveTextContent('incompleto')
    expect(screen.queryByRole('button', { name: 'Salvar e entrar' })).toBeNull()
    expect(chamadas).toHaveLength(0)
  })

  it('ativar a conta: pede a senha do cadastro, entra e vai para o início', async () => {
    const user = userEvent.setup()
    const { ultima } = apiFalsa({ ...rotasDoApp, 'POST /auth/confirm': new Resposta(201, sessao) })
    abrirApp('/confirmar-conta#token=xyz')

    await user.type(screen.getByLabelText(/^Senha/), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Ativar e entrar' }))

    await waitFor(() => expect(tokenAtual()).toBe('tk-novo'))
    expect(ultima('POST', '/auth/confirm')?.corpo).toEqual({ token: 'xyz', password: 'senha-segura' })
    await waitFor(() => expect(caminho()).toBe('/'))
  })

  it('ativar com a senha errada: mostra no campo, sem entrar', async () => {
    const user = userEvent.setup()
    const erro = 'Esta não é a senha escolhida no cadastro.'
    apiFalsa({ 'POST /auth/confirm': new Resposta(403, { error: 'Senha incorreta', details: { password: [erro] } }) })
    abrirApp('/confirmar-conta#token=xyz')

    await user.type(screen.getByLabelText(/^Senha/), 'outra')
    await user.click(screen.getByRole('button', { name: 'Ativar e entrar' }))
    expect(await screen.findByText(erro)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar e entrar' })).toBeEnabled()
    expect(tokenAtual()).toBeNull()
  })
})

describe('Configurações da conta', () => {
  const abrir = (rotas: Parameters<typeof apiFalsa>[0]) => {
    definirToken('tk-antigo')
    const falsa = apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, ...rotas })
    abrirApp('/configuracoes')
    return falsa
  }

  it('trocar a senha guarda o token novo: o token antigo já não vale', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir({ 'PUT /auth/password': sessao })

    await user.type(await screen.findByLabelText('Senha atual'), 'senha-segura')
    await user.type(screen.getByLabelText('Senha nova'), 'outra-senha-boa')
    await user.click(screen.getByRole('button', { name: 'Trocar a senha' }))

    expect(await screen.findByText(/Senha trocada/)).toBeInTheDocument()
    expect(ultima('PUT', '/auth/password')?.corpo).toEqual({ currentPassword: 'senha-segura', newPassword: 'outra-senha-boa' })
    expect(tokenAtual()).toBe('tk-novo')
    expect(localStorage.getItem('bp.token')).toBe('tk-novo')
    expect(screen.getByLabelText('Senha atual')).toHaveValue('')
    expect(screen.getByLabelText('Senha nova')).toHaveValue('')
  })

  it('senha atual errada: mostra no campo e a pessoa segue logada', async () => {
    const user = userEvent.setup()
    abrir({ 'PUT /auth/password': new Resposta(403, { error: 'Senha incorreta', details: { currentPassword: ['Senha incorreta.'] } }) })

    await user.type(await screen.findByLabelText('Senha atual'), 'errada')
    await user.type(screen.getByLabelText('Senha nova'), 'outra-senha-boa')
    await user.click(screen.getByRole('button', { name: 'Trocar a senha' }))

    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument()
    expect(tokenAtual()).toBe('tk-antigo')
    expect(screen.queryByText(/Senha trocada/)).toBeNull()
  })

  it('excluir pede a senha e só então apaga; depois vai para o login sem tentar revogar', async () => {
    const user = userEvent.setup()
    const { ultima, chamadas } = abrir({ 'DELETE /auth/me': new Resposta(204) })

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }))
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)
    expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeDisabled()

    await user.type(screen.getByLabelText('Confirme com sua senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(ultima('DELETE', '/auth/me')?.corpo).toEqual({ password: 'senha-segura' })
    expect(tokenAtual()).toBeNull()
    expect(chamadas.some((c) => c.caminho === '/auth/logout')).toBe(false)
  })

  it('senha errada ao excluir: mostra no campo e a conta continua aberta', async () => {
    const user = userEvent.setup()
    abrir({ 'DELETE /auth/me': new Resposta(403, { error: 'Senha incorreta', details: { password: ['Senha incorreta.'] } }) })

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }))
    await user.type(screen.getByLabelText('Confirme com sua senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))

    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument()
    expect(tokenAtual()).toBe('tk-antigo')
    expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeEnabled()
  })

  it('único administrador: mostra o motivo da recusa da API', async () => {
    const user = userEvent.setup()
    abrir({ 'DELETE /auth/me': new Resposta(409, { error: 'Você é o único administrador. Passe o papel a outra conta antes de excluir a sua.' }) })

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }))
    await user.type(screen.getByLabelText('Confirme com sua senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('único administrador')
    expect(tokenAtual()).toBe('tk-antigo')
  })

  it('cancelar fecha a confirmação e esquece a senha digitada', async () => {
    const user = userEvent.setup()
    abrir({})

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }))
    await user.type(screen.getByLabelText('Confirme com sua senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }))
    expect(screen.getByLabelText('Confirme com sua senha')).toHaveValue('')
  })
})

describe('Documentos', () => {
  it.each([
    ['/privacidade', 'Política de Privacidade'],
    ['/termos', 'Termos de Uso'],
  ])('%s abre sem login, marcado como rascunho e com a idade mínima e os menores a decidir', (rota, titulo) => {
    apiFalsa({})
    abrirApp(rota)

    expect(screen.getByRole('heading', { name: titulo, level: 1 })).toBeInTheDocument()
    const aviso = screen.getByRole('note')
    expect(aviso).toHaveTextContent('Rascunho')
    expect(aviso).toHaveTextContent('revisado por um advogado')
    expect(screen.getByText('Idade mínima:').closest('li')).toHaveTextContent('a definir')
    expect(screen.getByText('Menores de idade:').closest('li')).toHaveTextContent('a definir')
  })

  it.each(['/privacidade', '/termos'])('%s não afirma estar em conformidade com a lei', (rota) => {
    apiFalsa({})
    const { container } = abrirApp(rota)
    expect(container).not.toHaveTextContent(/em conformidade|conforme a lgpd|em acordo com a|cumprimos|atendemos à/i)
  })

  it('o rodapé do app liga para os dois documentos', async () => {
    definirToken('tk')
    apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa })
    abrirApp('/configuracoes')

    const rodape = within(await screen.findByRole('contentinfo'))
    expect(rodape.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
    expect(rodape.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos')
  })

  it('as telas de conta também mostram os links', () => {
    apiFalsa({})
    abrirApp('/entrar')
    const links = within(screen.getByRole('navigation', { name: 'Documentos' }))
    expect(links.getByRole('link', { name: 'Termos de Uso' })).toBeInTheDocument()
    expect(links.getByRole('link', { name: 'Política de Privacidade' })).toBeInTheDocument()
  })
})
