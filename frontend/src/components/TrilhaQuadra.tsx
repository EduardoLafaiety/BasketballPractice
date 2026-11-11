import { useEffect, useRef, useState } from 'react'
import Icone from './Icone'

// A playlist do site: trocar as músicas no Spotify já muda o que toca aqui.
const PLAYLIST_ID = '0rshzJAoeKoS8nYiBCAEJG'
export const LINK_PLAYLIST = `https://open.spotify.com/playlist/${PLAYLIST_ID}`
export const SCRIPT_SPOTIFY = 'https://open.spotify.com/embed/iframe-api/v1'
const ALTURA_PLAYER = 352

// O pedaço da iFrame API do Spotify que o player usa.
type Controle = { addListener: (evento: 'playback_update', ouvir: (e: { data: { isPaused: boolean } }) => void) => void }
export type ApiSpotify = {
  createController: (
    el: HTMLElement,
    opcoes: { uri: string; width: string; height: number },
    pronto: (controle: Controle) => void,
  ) => void
}
declare global {
  interface Window { onSpotifyIframeApiReady?: (api: ApiSpotify) => void }
}

let carregando: Promise<ApiSpotify> | null = null
/** Baixa o script do Spotify uma vez só; se falhar, a próxima tentativa baixa de novo. */
function carregarApi() {
  carregando ??= new Promise<ApiSpotify>((resolver, rejeitar) => {
    window.onSpotifyIframeApiReady = resolver
    const script = document.createElement('script')
    script.src = SCRIPT_SPOTIFY
    script.async = true
    script.onerror = () => {
      carregando = null
      script.remove()
      rejeitar(new Error('Spotify fora do ar'))
    }
    document.body.appendChild(script)
  })
  return carregando
}

/** Só nos testes: esquece o script baixado. */
export function reiniciarTrilha() {
  carregando = null
}

/** Barras de equalizador: pulam enquanto a música toca. */
function Equalizador() {
  return (
    <span className="trilha-eq" aria-hidden>
      <i /><i /><i /><i />
    </span>
  )
}

/**
 * Player da playlist de rap no canto da tela, no visual da faixa de notícias.
 * O Spotify só carrega no primeiro clique (ele grava cookies) e, depois, nunca sai da tela:
 * minimizar só esconde o painel, para a música seguir enquanto o atleta navega.
 */
export default function TrilhaQuadra() {
  const [aberta, setAberta] = useState(false)
  const [ligada, setLigada] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const lugar = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)

  // Minimizado, nada do painel recebe o foco do teclado (o React 18 não conhece o atributo inert).
  useEffect(() => {
    if (painel.current) painel.current.inert = !aberta
  }, [aberta, ligada])

  useEffect(() => {
    if (!ligada) return
    let ativo = true
    carregarApi()
      .then((api) => {
        if (!ativo || !lugar.current) return
        // O Spotify troca o elemento pelo iframe dele; um filho próprio evita que o React perca a referência.
        const alvo = document.createElement('div')
        lugar.current.replaceChildren(alvo)
        api.createController(alvo, { uri: `spotify:playlist:${PLAYLIST_ID}`, width: '100%', height: ALTURA_PLAYER }, (controle) =>
          controle.addListener('playback_update', (e) => ativo && setTocando(!e.data.isPaused)),
        )
      })
      .catch(() => ativo && setFalhou(true))
    return () => {
      ativo = false
    }
  }, [ligada])

  useEffect(() => {
    if (!aberta) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setAberta(false)
      botao.current?.focus()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta])

  const alternar = () => {
    setLigada(true)
    setAberta((a) => !a)
  }

  return (
    <aside className={`trilha${tocando ? ' tocando' : ''}`} aria-label="Trilha da quadra">
      {ligada && (
        <div id="trilha-painel" className={`trilha-painel${aberta ? ' aberta' : ''}`} aria-hidden={!aberta || undefined} ref={painel}>
          <div className="trilha-topo">
            <span className="noticias-visor">
              <Icone nome="musica" tamanho={16} />
              <i className="noticias-rec-ponto" />
              {tocando ? 'No ar' : 'Pausado'}
            </span>
            <span className="trilha-titulo">Trilha da quadra</span>
            <button type="button" className="trilha-minimizar" onClick={alternar} aria-label="Minimizar o player" title="Minimizar">
              <Icone nome="minimizar" tamanho={16} />
            </button>
          </div>
          <div className="trilha-player" ref={lugar} style={{ height: ALTURA_PLAYER }}>
            {falhou && (
              <iframe
                title="Playlist da trilha da quadra no Spotify"
                src={`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?theme=0`}
                width="100%"
                height={ALTURA_PLAYER}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            )}
          </div>
          <div className="trilha-rodape">
            <span>Sem login no Spotify, toca uma prévia de 30 s.</span>
            <a href={LINK_PLAYLIST} target="_blank" rel="noopener noreferrer">Abrir no Spotify</a>
          </div>
        </div>
      )}
      <button ref={botao} type="button" className="trilha-botao" aria-expanded={aberta} aria-controls={ligada ? 'trilha-painel' : undefined} onClick={alternar}>
        <span className="noticias-visor trilha-visor">
          <Icone nome="musica" tamanho={16} />
          <Equalizador />
        </span>
        <span className="trilha-textos">
          <span className="trilha-rotulo">Trilha da quadra</span>
          <span className="trilha-sub">{tocando ? 'Tocando agora' : 'Rap pra entrar no clima'}</span>
        </span>
      </button>
    </aside>
  )
}
