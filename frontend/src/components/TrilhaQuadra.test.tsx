import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'
import { LISTA_FAIXAS, reiniciarTrilha, SCRIPT_SPOTIFY, type ApiSpotify, type Controle, type Estado, type Faixa } from './TrilhaQuadra'

const FAIXAS: Faixa[] = [
  { id: 'a1', titulo: 'Middle Child', artista: 'J. Cole', duracao: 213_000 },
  { id: 'b2', titulo: 'Nonstop', artista: 'Drake', duracao: 238_000 },
  { id: 'c3', titulo: 'The Box', artista: 'Roddy Ricch', duracao: 196_000 },
]

/** Responde a lista de faixas e as capas; as outras rotas ficam com a API falsa. */
function abrir({ capas = true } = {}) {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [] })
  const original = globalThis.fetch
  vi.spyOn(globalThis, 'fetch').mockImplementation((entrada, init) => {
    const url = String(entrada)
    if (url === LISTA_FAIXAS) return Promise.resolve(Response.json({ faixas: FAIXAS }))
    if (url.startsWith('https://open.spotify.com/oembed'))
      return Promise.resolve(capas ? Response.json({ thumbnail_url: `https://capa.example/${url.split('/track/')[1]}` }) : new Response('', { status: 500 }))
    return original(entrada, init)
  })
  abrirApp('/treinos')
}
const trilha = () => screen.findByRole('complementary', { name: 'Trilha da quadra' })
const scripts = () => [...document.querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SPOTIFY}"]`)]

/** Faz de conta que o script do Spotify chegou: devolve o controle falso e quem avisa o site do estado. */
async function spotifyCarregou() {
  let ouvinte: (e: { data: Estado }) => void = () => {}
  const controle: Controle = {
    loadUri: vi.fn(),
    play: vi.fn(),
    togglePlay: vi.fn(),
    addListener: (_evento, ouvir) => { ouvinte = ouvir },
  }
  const api: ApiSpotify = { createController: vi.fn((_el, _opcoes, pronto) => pronto(controle)) }
  act(() => window.onSpotifyIframeApiReady!(api))
  await waitFor(() => expect(api.createController).toHaveBeenCalledOnce())
  const avisar = (estado: Partial<Estado>) => act(() => ouvinte({ data: { isPaused: false, position: 0, duration: 213_000, ...estado } }))
  return { api, controle, avisar }
}

afterEach(() => {
  scripts().forEach((s) => s.remove())
  reiniciarTrilha()
  vi.restoreAllMocks()
})

describe('Trilha da quadra', () => {
  it('fica à mostra com a primeira faixa e a capa, sem baixar o player do Spotify', async () => {
    abrir()
    const barra = await trilha()
    expect(barra).toHaveTextContent('Middle Child')
    expect(barra).toHaveTextContent('J. Cole')
    await waitFor(() => expect(barra.querySelector('img')).toHaveAttribute('src', 'https://capa.example/a1'))
    expect(screen.getByRole('link', { name: 'Ouvir Middle Child no Spotify' })).toHaveAttribute('href', 'https://open.spotify.com/track/a1')
    expect(scripts()).toHaveLength(0)
  })

  it('sem a capa, mostra a bola no lugar', async () => {
    abrir({ capas: false })
    await trilha()
    const capa = screen.getByRole('link', { name: 'Ouvir Middle Child no Spotify' })
    await waitFor(() => expect(capa.querySelector('.icone-svg')).not.toBeNull())
    expect(capa.querySelector('img')).toBeNull()
  })

  it('o play liga o Spotify escondido na faixa da vez e mostra "No ar"', async () => {
    const user = userEvent.setup()
    abrir()
    const barra = await trilha()
    await user.click(screen.getByRole('button', { name: 'Tocar' }))
    expect(scripts()).toHaveLength(1)

    const { api, controle, avisar } = await spotifyCarregou()
    expect(vi.mocked(api.createController).mock.calls[0][1]).toMatchObject({ uri: 'spotify:track:a1' })
    expect(controle.play).toHaveBeenCalled()
    expect(barra.querySelector('.trilha-spotify')).toHaveAttribute('aria-hidden', 'true')

    avisar({ isPaused: false })
    expect(barra).toHaveClass('tocando')
    expect(barra).toHaveTextContent('No ar')

    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(controle.togglePlay).toHaveBeenCalledOnce()
    avisar({ isPaused: true, position: 40_000 })
    expect(barra).not.toHaveClass('tocando')
    expect(screen.getByRole('button', { name: 'Tocar' })).toBeInTheDocument()
  })

  it('próxima e anterior trocam a faixa, a capa e o que o Spotify toca, dando a volta na lista', async () => {
    const user = userEvent.setup()
    abrir()
    const barra = await trilha()

    // Antes do play, só troca o que aparece.
    await user.click(screen.getByRole('button', { name: 'Música anterior' }))
    expect(barra).toHaveTextContent('The Box')
    expect(scripts()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Próxima música' }))
    await user.click(screen.getByRole('button', { name: 'Tocar' }))
    const { controle } = await spotifyCarregou()
    await user.click(screen.getByRole('button', { name: 'Próxima música' }))
    expect(barra).toHaveTextContent('Nonstop')
    expect(controle.loadUri).toHaveBeenLastCalledWith('spotify:track:b2')
    expect(controle.play).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(barra.querySelector('img')).toHaveAttribute('src', 'https://capa.example/b2'))
  })

  it('quando a faixa acaba, passa sozinho para a próxima', async () => {
    const user = userEvent.setup()
    abrir()
    const barra = await trilha()
    await user.click(screen.getByRole('button', { name: 'Tocar' }))
    const { controle, avisar } = await spotifyCarregou()

    avisar({ isPaused: false, position: 212_500 })
    avisar({ isPaused: true, position: 213_000 })
    expect(barra).toHaveTextContent('Nonstop')
    expect(controle.loadUri).toHaveBeenLastCalledWith('spotify:track:b2')

    // Pausar no meio da música não pula.
    avisar({ isPaused: false, position: 10_000 })
    avisar({ isPaused: true, position: 10_200 })
    expect(barra).toHaveTextContent('Nonstop')
  })

  it('sem login no Spotify, avisa que é a prévia de 30 s', async () => {
    const user = userEvent.setup()
    abrir()
    const barra = await trilha()
    await user.click(screen.getByRole('button', { name: 'Tocar' }))
    const { avisar } = await spotifyCarregou()
    avisar({ duration: 30_000 })
    expect(barra).toHaveTextContent('J. Cole · prévia de 30 s')
  })

  it('segue tocando ao trocar de página', async () => {
    const user = userEvent.setup()
    abrir()
    await trilha()
    await user.click(screen.getByRole('button', { name: 'Tocar' }))
    const { avisar } = await spotifyCarregou()
    avisar({ isPaused: false })
    const player = document.querySelector('.trilha-spotify')

    await user.click(screen.getAllByRole('link', { name: 'Gerar treino' })[0])
    expect(screen.getByTestId('caminho')).toHaveTextContent('/gerador')
    expect(document.querySelector('.trilha-spotify')).toBe(player)
    expect(await trilha()).toHaveClass('tocando')
  })

  it('se o script do Spotify não carregar, o play volta a funcionar no próximo clique', async () => {
    const user = userEvent.setup()
    abrir()
    await trilha()
    await user.click(screen.getByRole('button', { name: 'Tocar' }))
    act(() => scripts()[0].dispatchEvent(new Event('error')))
    await waitFor(() => expect(document.querySelector('.trilha-spotify')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'Tocar' }))
    expect(scripts()).toHaveLength(1)
  })
})
