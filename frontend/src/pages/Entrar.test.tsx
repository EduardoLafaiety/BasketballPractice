import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { tokenAtual } from '../api'
import { AuthProvider } from '../auth'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'
import Entrar from './Entrar'

const campo = (nome: RegExp) => screen.getByLabelText(nome)

describe('Entrar na demonstração', () => {
  it('avisa que é demonstração, entra sem conta e não oferece criar conta', async () => {
    const user = userEvent.setup()
    const { ultima } = apiFalsa({ 'POST /auth/login': { token: 'demo', user: usuarioFalso() } })
    render(
      <MemoryRouter initialEntries={['/entrar']}>
        <AuthProvider>
          <Routes>
            <Route path="/entrar" element={<Entrar modo="entrar" demonstracao />} />
            <Route path="/" element={<p>Dentro do app</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/use qualquer e-mail e senha/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Entrar sem conta' }))
    expect(await screen.findByText('Dentro do app')).toBeInTheDocument()
    expect(ultima('POST', '/auth/login')?.corpo).toEqual({ email: 'visitante@demo.local', password: '-' })
  })
})

describe('Entrar', () => {
  it('sem login, manda para /entrar e depois volta para a página pedida', async () => {
    const user = userEvent.setup()
    const { ultima } = apiFalsa({
      'POST /auth/login': { token: 'tk-1', user: usuarioFalso() },
      'GET /settings': configFalsa,
    })
    abrirApp('/metas')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    const entrar = screen.getByRole('button', { name: 'Entrar' })
    expect(entrar).toBeDisabled()

    await user.type(campo(/e-mail/i), '  marina@example.com ')
    await user.type(campo(/senha/i), 'senha-segura')
    await user.click(entrar)

    expect(await screen.findByRole('heading', { name: 'Metas e conquistas' })).toBeInTheDocument()
    expect(ultima('POST', '/auth/login')?.corpo).toEqual({ email: 'marina@example.com', password: 'senha-segura' })
    expect(tokenAtual()).toBe('tk-1')
    expect(screen.getByText('Marina')).toBeInTheDocument()
  })

  it('mostra o erro de senha incorreta e libera nova tentativa', async () => {
    const user = userEvent.setup()
    apiFalsa({ 'POST /auth/login': new Resposta(401, { error: 'E-mail ou senha incorretos' }) })
    abrirApp('/entrar')

    await user.type(campo(/e-mail/i), 'marina@example.com')
    await user.type(campo(/senha/i), 'errada123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    expect(tokenAtual()).toBeNull()
  })

  it('no cadastro, barra senha curta antes de chamar a API', async () => {
    const user = userEvent.setup()
    const { chamadas } = apiFalsa({})
    abrirApp('/cadastro')

    await user.type(campo(/nome/i), 'Marina')
    await user.type(campo(/e-mail/i), 'marina@example.com')
    await user.type(campo(/senha/i), '1234')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument()
    expect(chamadas).toHaveLength(0)
  })

  it('traduz os erros de validação que vêm do backend', async () => {
    const user = userEvent.setup()
    apiFalsa({
      'POST /auth/register': new Resposta(400, {
        error: 'Dados inválidos',
        details: { email: ['Invalid email'], name: ['String must contain at least 2 character(s)'] },
      }),
    })
    abrirApp('/cadastro')

    await user.type(campo(/nome/i), 'M')
    await user.type(campo(/e-mail/i), 'marina@')
    await user.type(campo(/senha/i), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument()
    expect(screen.getByText('O nome precisa ter pelo menos 2 letras.')).toBeInTheDocument()
    // Com erros por campo, a mensagem geral não se repete.
    expect(screen.queryByText('Dados inválidos')).toBeNull()
  })

  it('pede a ativação por e-mail em vez de entrar, mostrando o aviso da API', async () => {
    const user = userEvent.setup()
    const { ultima } = apiFalsa({
      'POST /auth/register': new Resposta(202, { message: 'Se este e-mail puder ser cadastrado, enviamos um link.' }),
    })
    abrirApp('/cadastro')

    await user.type(campo(/nome/i), ' Joana Lima ')
    await user.type(campo(/e-mail/i), 'joana@example.com')
    await user.type(campo(/senha/i), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Se este e-mail puder ser cadastrado, enviamos um link.')
    expect(screen.getByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(ultima('POST', '/auth/register')?.corpo).toMatchObject({ name: 'Joana Lima', email: 'joana@example.com' })
    expect(tokenAtual()).toBeNull()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/cadastro')
  })
})
