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
    await user.click(within(document.querySelector('.topo') as HTMLElement).getByRole('link', { name: /início/i }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/))
    expect(tela()).not.toHaveClass('aberto')
  })

  it('o topo não tem mais o botão Gerar rotina: sobram a marca e o menu', async () => {
    abrir()
    await botaoMenu()
    const topo = within(document.querySelector('.topo') as HTMLElement)
    expect(topo.queryByRole('link', { name: /Gerar rotina/ })).toBeNull()
    expect(topo.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
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

describe('Barra de atalhos do celular', () => {
  const doca = () => within(screen.getByRole('navigation', { name: 'Atalhos' }))

  it('leva às seções principais e marca a atual', async () => {
    const user = userEvent.setup()
    abrir()
    await botaoMenu()
    expect(doca().getByRole('link', { name: 'Treinos' })).toHaveClass('active')

    await user.click(doca().getByRole('link', { name: 'Gerar rotina' }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/rotina'))
    expect(doca().getByRole('link', { name: 'Gerar rotina' })).toHaveClass('active')
    expect(doca().getByRole('link', { name: 'Treinos' })).not.toHaveClass('active')
  })

  it('o botão Mais abre o menu, e o Esc devolve o foco a ele', async () => {
    const user = userEvent.setup()
    abrir()
    await botaoMenu()
    const mais = doca().getByRole('button', { name: 'Mais seções' })
    await user.click(mais)
    expect(tela()).toHaveClass('aberto')
    expect(mais).toHaveAttribute('aria-expanded', 'true')
    expect(mais).toHaveTextContent('Fechar')

    await user.keyboard('{Escape}')
    expect(tela()).not.toHaveClass('aberto')
    expect(mais).toHaveFocus()
  })
})

describe('Desafio do dia e quiz do dia saíram do app', () => {
  it.each(['/desafio', '/quiz'])('o endereço antigo %s leva aos artigos', async (rota) => {
    abrir(rota)
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/artigos'))
    expect(await screen.findByRole('heading', { name: 'Artigos', level: 1 })).toBeInTheDocument()
  })

  it('o menu não tem mais os dois, e a barra do celular passa a levar aos artigos', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botaoMenu())
    const menu = within(tela())
    expect(menu.getByRole('link', { name: 'Artigos' })).toHaveAttribute('href', '/artigos')
    expect(menu.queryByRole('link', { name: /Desafio do dia/ })).toBeNull()
    expect(menu.queryByRole('link', { name: /Quiz do dia/ })).toBeNull()

    const doca = within(screen.getByRole('navigation', { name: 'Atalhos' }))
    expect(doca.getAllByRole('link').map((l) => l.textContent?.trim())).toEqual(['Início', 'Treinos', 'Gerar', 'Artigos'])
    expect(doca.queryByRole('link', { name: /Desafio/ })).toBeNull()
  })
})
