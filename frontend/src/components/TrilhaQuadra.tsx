import { useEffect, useRef, useState } from 'react'
import Icone from './Icone'

// A lista sai da playlist do Spotify a cada build (scripts/exportar-playlist.mjs).
export const LISTA_FAIXAS = `${import.meta.env.BASE_URL}playlist.json`
export const SCRIPT_SPOTIFY = 'https://open.spotify.com/embed/iframe-api/v1'
// Sem login no Spotify, o player toca só 30 s de cada faixa.
const PREVIA_MS = 31_000
// Perto do fim da faixa, um pause é o fim dela: hora de passar para a próxima.
const FIM_MS = 1_500

export type Faixa = { id: string; titulo: string; artista: string; duracao: number }
export type Estado = { isPaused: boolean; position: number; duration: number }

// O pedaço da iFrame API do Spotify que o player usa.
export type Controle = {
  loadUri: (uri: string) => void
  play: () => void
  togglePlay: () => void
  addListener: (evento: 'playback_update', ouvir: (e: { data: Estado }) => void) => void
}
export type ApiSpotify = {
  createController: (el: HTMLElement, opcoes: { uri: string; width: string; height: number }, pronto: (controle: Controle) => void) => void
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

const capas = new Map<string, Promise<string | null>>()
/** A capa do álbum vem do oEmbed do Spotify (aberto a qualquer site); sem ela, fica a bola. */
function capaDa(id: string) {
  if (!capas.has(id))
    capas.set(
      id,
      fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { thumbnail_url?: string } | null) => d?.thumbnail_url ?? null)
        .catch(() => null),
    )
  return capas.get(id)!
}

/** Só nos testes: esquece o script e as capas já baixados. */
export function reiniciarTrilha() {
  carregando = null
  capas.clear()
}

const linkDa = (f: Faixa) => `https://open.spotify.com/track/${f.id}`

/**
 * Player da playlist de rap no canto de baixo, à direita, colado na faixa de notícias.
 * O player do Spotify fica escondido e só carrega no primeiro play (ele grava cookies);
 * os botões e a capa à mostra são do site.
 */
export default function TrilhaQuadra() {
  const [faixas, setFaixas] = useState<Faixa[]>([])
  const [indice, setIndice] = useState(0)
  const [ligada, setLigada] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [previa, setPrevia] = useState(false)
  const [capa, setCapa] = useState<string | null>(null)
  const lugar = useRef<HTMLDivElement>(null)
  const controle = useRef<Controle | null>(null)
  const ultimo = useRef<Estado | null>(null)
  const avancar = useRef<() => void>(() => {})

  useEffect(() => {
    fetch(LISTA_FAIXAS)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { faixas?: Faixa[] } | null) => setFaixas(d?.faixas ?? []))
      .catch(() => {})
  }, [])

  const faixa = faixas[indice] as Faixa | undefined

  useEffect(() => {
    if (!faixa) return
    let ativo = true
    setCapa(null)
    capaDa(faixa.id).then((url) => ativo && setCapa(url))
    return () => {
      ativo = false
    }
  }, [faixa])

  // Liga o Spotify no primeiro play, já com a faixa da vez.
  useEffect(() => {
    if (!ligada || !faixa) return
    let ativo = true
    carregarApi()
      .then((api) => {
        if (!ativo || !lugar.current) return
        // O Spotify troca o elemento pelo iframe dele; um filho próprio evita que o React perca a referência.
        const alvo = document.createElement('div')
        lugar.current.replaceChildren(alvo)
        // Escondido, o player do Spotify também fica fora do Tab.
        lugar.current.inert = true
        api.createController(alvo, { uri: `spotify:track:${faixa.id}`, width: '100%', height: 80 }, (c) => {
          controle.current = c
          c.addListener('playback_update', ({ data }) => {
            if (!ativo) return
            const antes = ultimo.current
            ultimo.current = data
            setTocando(!data.isPaused)
            if (data.duration > 0) setPrevia(data.duration < PREVIA_MS)
            const acabou = antes && !antes.isPaused && data.isPaused && antes.duration > 0 && antes.duration - antes.position < FIM_MS
            if (acabou) avancar.current()
          })
          c.play()
        })
      })
      .catch(() => ativo && setLigada(false))
    return () => {
      ativo = false
    }
    // A faixa inicial só vale na criação do player; depois, quem troca é o loadUri.
  }, [ligada])

  const ir = (passo: number) => {
    if (!faixas.length) return
    const novo = (indice + passo + faixas.length) % faixas.length
    setIndice(novo)
    ultimo.current = null
    if (controle.current) {
      controle.current.loadUri(`spotify:track:${faixas[novo].id}`)
      controle.current.play()
    }
  }
  avancar.current = () => ir(1)

  const alternar = () => {
    if (controle.current) controle.current.togglePlay()
    else setLigada(true)
  }

  if (!faixa) return null

  return (
    <aside className={`trilha${tocando ? ' tocando' : ''}`} aria-label="Trilha da quadra">
      <a className="trilha-capa" href={linkDa(faixa)} target="_blank" rel="noopener noreferrer" title="Ouvir no Spotify" aria-label={`Ouvir ${faixa.titulo} no Spotify`}>
        {capa ? <img src={capa} alt="" width={48} height={48} /> : <Icone nome="bola" tamanho={26} />}
      </a>
      <div className="trilha-info">
        <span className="trilha-rotulo">
          {tocando ? 'No ar' : 'Trilha da quadra'}
        </span>
        <span className="trilha-titulo" aria-live="polite">{faixa.titulo}</span>
        <span className="trilha-artista">{previa ? `${faixa.artista} · prévia de 30 s` : faixa.artista}</span>
      </div>
      <div className="trilha-controles">
        <button type="button" onClick={() => ir(-1)} aria-label="Música anterior" title="Anterior">
          <Icone nome="anterior" tamanho={14} />
        </button>
        <button type="button" className="trilha-play" onClick={alternar} aria-label={tocando ? 'Pausar' : 'Tocar'} title={tocando ? 'Pausar' : 'Tocar'}>
          <Icone nome={tocando ? 'pausa' : 'play'} tamanho={14} />
        </button>
        <button type="button" onClick={() => ir(1)} aria-label="Próxima música" title="Próxima">
          <Icone nome="proxima" tamanho={14} />
        </button>
      </div>
      {ligada && <div className="trilha-spotify" ref={lugar} aria-hidden />}
    </aside>
  )
}
