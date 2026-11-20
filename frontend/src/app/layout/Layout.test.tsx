import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../test/api-falsa'
import { abrirApp } from '../../test/renderizar'

function abrir(rota = '/treinos') {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [] })
  abrirApp(rota)
}
const botaoMenu = () => screen.findByRole('button', { name: /^(Menu|Fechar)$/ })
const tela = () => document.getElementById('menu-tela') as HTMLElement
beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}) })

describe('Menu em tela cheia', () => {
  it('leva o foco ao menu, mantém Tab dentro dele e fecha ao clicar de novo no botão do menu', async () => {
    const user = userEvent.setup()
    abrir()
    const abrirMenu = await botaoMenu()
    await user.click(abrirMenu)
    const dialogo = screen.getByRole('dialog', { name: 'Menu principal' })
    expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    const links = within(dialogo).getAllByRole('link')
    const sair = within(dialogo).getByRole('button', { name: 'Sair' })
    links[0].focus()
    await user.tab({ shift: true })
    expect(sair).toHaveFocus()
    await user.tab()
    expect(links[0]).toHaveFocus()
    await user.click(abrirMenu)
    expect(abrirMenu).toHaveFocus()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('a marca volta ao início da landing e o rótulo Início mantém a navegação dos treinos', async () => {
    const user = userEvent.setup()
    abrir('/')
    await botaoMenu()
    const topo = within(document.querySelector('.topo') as HTMLElement)
    await user.click(topo.getByRole('link', { name: 'Início' }))
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0)
    await user.click(topo.getByRole('link', { name: 'Basketball Practice, início' }))
    expect(await screen.findByRole('heading',{level:1})).toHaveTextContent('Seu jogo.')
    expect(screen.getByTestId('caminho')).toHaveTextContent('/conheca')
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
    expect(window.scrollTo).toHaveBeenLastCalledWith({top:0,left:0,behavior:'instant'})
  })
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
    screen.getAllByRole('link', { name: /Artigos/ })[0].focus()
    await user.keyboard('{Escape}')
    expect(tela()).not.toHaveClass('aberto')
    expect(botao).toHaveFocus()
  })

  it('navegar por um link de fora do menu também o fecha', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botaoMenu())
    await user.click(within(document.querySelector('.topo') as HTMLElement).getByRole('link', { name: /início/i }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/conheca'))
    expect(screen.queryByRole('dialog',{name:'Menu principal'})).toBeNull()
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

    await user.click(screen.getAllByRole('link', { name: /Artigos/ })[0])
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/artigos'))
    expect(tela()).not.toHaveClass('aberto')
    expect(screen.getByText('Artigos', { selector: '.topo-secao' })).toBeInTheDocument()
  })
})

describe('Barra de atalhos do celular', () => {
  const doca = () => within(screen.getByRole('navigation', { name: 'Atalhos' }))

  it('leva às seções principais e marca a atual', async () => {
    const user = userEvent.setup()
    abrir()
    await botaoMenu()
    expect(doca().getByRole('link', { name: 'Treinos' })).toHaveClass('active')

    await user.click(doca().getByRole('link', { name: 'Rotina' }))
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/rotina'))
    expect(doca().getByRole('link', { name: 'Rotina' })).toHaveClass('active')
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

  it('o menu não tem mais os dois, e a barra do celular leva à evolução', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botaoMenu())
    const menu = within(tela())
    expect(menu.getByRole('link', { name: 'Artigos' })).toHaveAttribute('href', '/artigos')
    expect(menu.queryByRole('link', { name: /Desafio do dia/ })).toBeNull()
    expect(menu.queryByRole('link', { name: /Quiz do dia/ })).toBeNull()

    const doca = within(screen.getByRole('navigation', { name: 'Atalhos' }))
    expect(doca.getAllByRole('link').map((l) => l.textContent?.trim())).toEqual(['Início', 'Treinos', 'Rotina', 'Evolução'])
    expect(doca.queryByRole('link', { name: /Desafio/ })).toBeNull()
  })
})
