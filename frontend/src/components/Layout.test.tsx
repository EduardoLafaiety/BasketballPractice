import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

function abrir(rota = '/treinos') {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [] })
  abrirApp(rota)
}
const botaoMenu = () => screen.findByRole('button', { name: /^(Menu|Fechar)$/ })
const tela = () => document.getElementById('menu-tela') as HTMLElement

describe('Menu em tela cheia', () => {
  it('abre e fecha pelo botão, que informa o estado', async () => {
    const user = userEvent.setup()
    abrir()
    const botao = await botaoMenu()
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(tela()).not.toHaveClass('aberto')

    await user.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(botao).toHaveTextContent('Fechar')
    expect(tela()).toHaveClass('aberto')
    expect(document.body.style.overflow).toBe('hidden')

    await user.click(botao)
    expect(tela()).not.toHaveClass('aberto')
    expect(document.body.style.overflow).toBe('')
  })

  it('Esc fecha e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    abrir()
    const botao = await botaoMenu()
    await user.click(botao)
    screen.getByRole('link', { name: /Ferramentas/ }).focus()
    await user.keyboard('{Escape}')
    expect(tela()).not.toHaveClass('aberto')
    expect(botao).toHaveFocus()
  })

  it('navegar por um link de fora do menu também o fecha', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botaoMenu())
    await user.click(within(document.querySelector('.topo') as HTMLElement).getByRole('link', { name: 'Gerar treino' }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/gerador'))
    expect(tela()).not.toHaveClass('aberto')
  })

  it('navegar fecha o menu, e o topo mostra a seção atual', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botaoMenu())
    expect(screen.getByText('Treinos', { selector: '.topo-secao' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Ferramentas/ }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/ferramentas'))
    expect(tela()).not.toHaveClass('aberto')
    expect(screen.getByText('Ferramentas', { selector: '.topo-secao' })).toBeInTheDocument()
  })
})
