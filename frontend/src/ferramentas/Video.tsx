import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { formatarTamanho, listarVideos, removerVideo, salvarVideo, type Video as VideoSalvo } from '../lib/videos'

const VELOCIDADES = [0.1, 0.25, 0.5, 1]
const QUADRO = 1 / 30

/** Formato que o navegador sabe gravar (Chrome/Firefox: webm; Safari: mp4). */
function formatoGravacao() {
  if (typeof MediaRecorder === 'undefined') return null
  return ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

function useUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return setUrl(null)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export default function Video() {
  const [videos, setVideos] = useState<VideoSalvo[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState<VideoSalvo | null>(null)
  const [comparar, setComparar] = useState<string[]>([])

  const recarregar = useCallback(() => {
    listarVideos()
      .then(setVideos)
      .catch((e: Error) => setErro(e.message))
  }, [])
  useEffect(recarregar, [recarregar])

  async function guardar(blob: Blob, nome: string) {
    setErro(null)
    try {
      const novo = await salvarVideo(blob, nome)
      recarregar()
      setAberto(novo)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function excluir(v: VideoSalvo) {
    if (!window.confirm(`Excluir o vídeo "${v.nome}"? Ele só existe neste navegador.`)) return
    await removerVideo(v.id)
    if (aberto?.id === v.id) setAberto(null)
    setComparar((c) => c.filter((id) => id !== v.id))
    recarregar()
  }

  const alternarComparar = (id: string) =>
    setComparar((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)))
  const pares = comparar.map((id) => videos.find((v) => v.id === id)).filter((v): v is VideoSalvo => !!v)

  return (
    <div className="ferramenta video">
      <p className="aviso-local meta">
        🔒 Os vídeos ficam guardados só neste navegador e não são enviados para o servidor. Limpar os dados do site apaga os vídeos.
      </p>

      <Gravador aoGravar={guardar} />
      {erro && <p className="erro" role="alert">{erro}</p>}

      {pares.length === 2 ? (
        <Comparacao videos={pares as [VideoSalvo, VideoSalvo]} aoFechar={() => setComparar([])} />
      ) : (
        aberto && <Player video={aberto} aoFechar={() => setAberto(null)} />
      )}

      <h3>Seus vídeos</h3>
      {videos.length === 0 ? (
        <p className="muted">Nenhum vídeo ainda. Grave ou escolha um vídeo do celular (câmera lenta funciona muito bem).</p>
      ) : (
        <>
          <p className="meta">Marque dois vídeos para comparar lado a lado.</p>
          <ul className="historico">
            {videos.map((v) => (
              <li key={v.id} className="card sessao">
                <div>
                  <button className="link botao-link" onClick={() => { setComparar([]); setAberto(v) }}>
                    {v.nome}
                  </button>
                  <span className="meta">
                    {new Date(v.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {formatarTamanho(v.tamanho)}
                  </span>
                </div>
                <div className="acoes">
                  <label className="check">
                    <input type="checkbox" checked={comparar.includes(v.id)} onChange={() => alternarComparar(v.id)} />
                    Comparar
                  </label>
                  <button className="remover" aria-label={`Excluir ${v.nome}`} onClick={() => excluir(v)}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function Gravador({ aoGravar }: { aoGravar: (blob: Blob, nome: string) => Promise<void> }) {
  const previa = useRef<HTMLVideoElement>(null)
  const fluxo = useRef<MediaStream | null>(null)
  const gravador = useRef<MediaRecorder | null>(null)
  const [camera, setCamera] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(0)
  const formato = formatoGravacao()

  const desligar = useCallback(() => {
    fluxo.current?.getTracks().forEach((t) => t.stop())
    fluxo.current = null
    setCamera(false)
  }, [])
  useEffect(() => desligar, [desligar])

  useEffect(() => {
    if (!gravando) return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [gravando])

  async function ligar() {
    setErro(null)
    try {
      fluxo.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', frameRate: { ideal: 60 } },
        audio: false,
      })
      setCamera(true)
      // O <video> aparece no próximo render.
      requestAnimationFrame(() => {
        if (previa.current) previa.current.srcObject = fluxo.current
      })
    } catch {
      setErro('Não foi possível abrir a câmera. Confira a permissão do navegador.')
    }
  }

  function gravar() {
    if (!fluxo.current || formato === null) return
    const pedacos: Blob[] = []
    const rec = new MediaRecorder(fluxo.current, formato ? { mimeType: formato } : undefined)
    rec.ondataavailable = (e) => e.data.size && pedacos.push(e.data)
    rec.onstop = () => {
      const blob = new Blob(pedacos, { type: rec.mimeType || 'video/webm' })
      const nome = `Arremesso ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
      void aoGravar(blob, nome)
    }
    rec.start()
    gravador.current = rec
    setSegundos(0)
    setGravando(true)
  }

  function parar() {
    gravador.current?.stop()
    setGravando(false)
  }

  function escolherArquivo(arquivo: File | undefined) {
    if (arquivo) void aoGravar(arquivo, arquivo.name.replace(/\.[^.]+$/, ''))
  }

  return (
    <div className="card gravador">
      {camera ? (
        <>
          <video ref={previa} className="video-previa" autoPlay muted playsInline />
          <div className="acoes centro-flex">
            {gravando ? (
              <button className="btn btn-erro" onClick={parar}>■ Parar ({segundos}s)</button>
            ) : (
              <button className="btn btn-primario" onClick={gravar} disabled={formato === null}>● Gravar</button>
            )}
            <button className="btn" onClick={desligar} disabled={gravando}>Fechar câmera</button>
          </div>
        </>
      ) : (
        <div className="acoes">
          {typeof navigator.mediaDevices?.getUserMedia === 'function' && <button className="btn btn-primario" onClick={ligar}>Abrir câmera</button>}
          <label className="btn">
            Escolher vídeo do aparelho
            <input
              type="file"
              accept="video/*"
              capture="environment"
              className="escondido"
              onChange={(e) => {
                escolherArquivo(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}
      {formato === null && camera && <p className="erro">Este navegador não grava vídeo; use “Escolher vídeo do aparelho”.</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  )
}

function Controles({ refs, velocidade, setVelocidade }: { refs: RefObject<HTMLVideoElement>[]; velocidade: number; setVelocidade: (v: number) => void }) {
  const todos = () => refs.map((r) => r.current).filter((v): v is HTMLVideoElement => !!v)
  const passo = (delta: number) =>
    todos().forEach((v) => {
      v.pause()
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta))
    })

  return (
    <div className="acoes centro-flex controles-video">
      <button className="btn" onClick={() => passo(-QUADRO)} aria-label="Voltar um quadro">⏮ Quadro</button>
      <button
        className="btn btn-primario"
        onClick={() => {
          const lista = todos()
          const pausado = lista.every((v) => v.paused)
          lista.forEach((v) => (pausado ? void v.play() : v.pause()))
        }}
      >
        ⏯
      </button>
      <button className="btn" onClick={() => passo(QUADRO)} aria-label="Avançar um quadro">Quadro ⏭</button>
      <div className="chips">
        {VELOCIDADES.map((v) => (
          <button key={v} className={`chip ${velocidade === v ? 'ativo' : ''}`} onClick={() => setVelocidade(v)}>
            {v}x
          </button>
        ))}
      </div>
    </div>
  )
}

function Player({ video, aoFechar }: { video: VideoSalvo; aoFechar: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const url = useUrl(video.blob)
  const [velocidade, setVelocidade] = useState(0.5)
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = velocidade
  }, [velocidade, url])

  return (
    <div className="card player">
      <div className="secao-topo">
        <strong>{video.nome}</strong>
        <button className="remover" aria-label="Fechar vídeo" onClick={aoFechar}>×</button>
      </div>
      {url && <video ref={ref} src={url} className="video-player" controls playsInline loop />}
      <Controles refs={[ref]} velocidade={velocidade} setVelocidade={setVelocidade} />
    </div>
  )
}

function Comparacao({ videos, aoFechar }: { videos: [VideoSalvo, VideoSalvo]; aoFechar: () => void }) {
  const a = useRef<HTMLVideoElement>(null)
  const b = useRef<HTMLVideoElement>(null)
  const urlA = useUrl(videos[0].blob)
  const urlB = useUrl(videos[1].blob)
  const [velocidade, setVelocidade] = useState(0.5)

  useEffect(() => {
    for (const v of [a.current, b.current]) if (v) v.playbackRate = velocidade
  }, [velocidade, urlA, urlB])

  return (
    <div className="card player">
      <div className="secao-topo">
        <strong>Comparação lado a lado</strong>
        <button className="remover" aria-label="Fechar comparação" onClick={aoFechar}>×</button>
      </div>
      <div className="comparacao">
        {[videos[0], videos[1]].map((v, i) => (
          <figure key={v.id}>
            {(i === 0 ? urlA : urlB) && (
              <video
                ref={i === 0 ? a : b}
                src={(i === 0 ? urlA : urlB)!}
                className="video-player"
                playsInline
                loop
                muted
              />
            )}
            <figcaption className="meta">{v.nome}</figcaption>
          </figure>
        ))}
      </div>
      <div className="acoes centro-flex">
        <button
          className="chip"
          onClick={() =>
            [a.current, b.current].forEach((v) => {
              if (v) v.currentTime = 0
            })
          }
        >
          Voltar os dois ao início
        </button>
      </div>
      <Controles refs={[a, b]} velocidade={velocidade} setVelocidade={setVelocidade} />
    </div>
  )
}
