import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'
import { LINK_PLAYLIST, reiniciarTrilha, SCRIPT_SPOTIFY, type ApiSpotify } from './TrilhaQuadra'

function abrir(rota = '/treinos') {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [] })
  abrirApp(rota)
}
const botao = () => screen.findByRole('button', { name: /Trilha da quadra/ })
const scripts = () => [...document.querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SPOTIFY}"]`)]

/** Faz de conta que o script do Spotify chegou: devolve quem avisa o site de play e pause. */
async function spotifyCarregou() {
  let avisar: (pausado: boolean) => void = () => {}
  const api: ApiSpotify = {
    createController: vi.fn((el, _opcoes, pronto) => {
      el.replaceWith(Object.assign(document.createElement('iframe'), { title: 'Spotify' }))
      pronto({ addListener: (_evento: string, ouvir: (e: { data: { isPaused: boolean } }) => void) => { avisar = (isPaused) => ouvir({ data: { isPaused } }) } })
    }),
  }
  act(() => window.onSpotifyIframeApiReady!(api))
  await waitFor(() => expect(api.createController).toHaveBeenCalledOnce())
  return { api, avisar: (pausado: boolean) => act(() => avisar(pausado)) }
}

afterEach(() => {
  scripts().forEach((s) => s.remove())
  reiniciarTrilha()
})

describe('Trilha da quadra', () => {
  it('fica fechada e não baixa nada do Spotify até o clique', async () => {
    abrir()
    expect(await botao()).toHaveAttribute('aria-expanded', 'false')
    expect(scripts()).toHaveLength(0)
    expect(document.getElementById('trilha-painel')).toBeNull()
  })

  it('no clique, abre o painel com a playlist e o link para o Spotify', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botao())
    expect(await botao()).toHaveAttribute('aria-expanded', 'true')
    expect(scripts()).toHaveLength(1)

    const { api } = await spotifyCarregou()
    expect(vi.mocked(api.createController).mock.calls[0][1]).toMatchObject({ uri: 'spotify:playlist:0rshzJAoeKoS8nYiBCAEJG' })
    expect(screen.getByRole('link', { name: 'Abrir no Spotify' })).toHaveAttribute('href', LINK_PLAYLIST)
  })

  it('mostra quando está tocando: "No ar", equalizador e "Tocando agora"', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botao())
    const { avisar } = await spotifyCarregou()
    const trilha = screen.getByRole('complementary', { name: 'Trilha da quadra' })
    await waitFor(() => expect(trilha).toHaveTextContent('Pausado'))

    avisar(false)
    expect(trilha).toHaveClass('tocando')
    expect(trilha).toHaveTextContent('No ar')
    expect(trilha).toHaveTextContent('Tocando agora')

    avisar(true)
    expect(trilha).not.toHaveClass('tocando')
  })

  it('minimizar esconde o painel sem tirar o player, e a música segue ao trocar de página', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botao())
    const { avisar } = await spotifyCarregou()
    avisar(false)

    await user.click(screen.getByRole('button', { name: 'Minimizar o player' }))
    const painel = document.getElementById('trilha-painel')!
    expect(painel).not.toHaveClass('aberta')
    expect(painel).toHaveAttribute('aria-hidden', 'true')
    expect(painel.inert).toBe(true)

    await user.click(within(document.querySelector('.topo') as HTMLElement).getByRole('link', { name: 'Gerar treino' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/gerador')
    expect(document.querySelector('.trilha-player iframe')).toBe(painel.querySelector('iframe'))
    expect(screen.getByRole('complementary', { name: 'Trilha da quadra' })).toHaveClass('tocando')

    // Reabrir não baixa o script de novo nem cria outro player.
    await user.click(await botao())
    expect(scripts()).toHaveLength(1)
    expect(painel).toHaveClass('aberta')
  })

  it('Esc minimiza e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botao())
    await user.keyboard('{Escape}')
    expect(await botao()).toHaveAttribute('aria-expanded', 'false')
    expect(await botao()).toHaveFocus()
  })

  it('se o script do Spotify não carregar, usa o player simples', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(await botao())
    act(() => scripts()[0].dispatchEvent(new Event('error')))
    const player = await screen.findByTitle('Playlist da trilha da quadra no Spotify')
    expect(player).toHaveAttribute('src', expect.stringContaining('/embed/playlist/0rshzJAoeKoS8nYiBCAEJG'))
  })
})
