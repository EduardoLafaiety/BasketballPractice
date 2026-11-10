import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { api, type Noticia } from '../api'
import { assuntoDa, NOTICIAS_MUDARAM, ROTULO_ASSUNTO, tempoAtras } from '../lib/noticias'
import Icone from './Icone'

const ATUALIZAR_MS = 5 * 60_000
// Velocidade de leitura confortável: o tempo da volta cresce com a quantidade de texto.
const SEGUNDOS_POR_LETRA = 0.2
const VOLTA_MINIMA_S = 30
const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function Itens({ noticias, copia }: { noticias: Noticia[]; copia?: boolean }) {
  return (
    <ul className="noticias-lista" aria-hidden={copia || undefined}>
      {noticias.map((n) => (
        <li key={n.id} className="noticias-item">
          {n.origin === 'admin' ? (
            <span className="noticias-selo">Breaking news</span>
          ) : (
            <Assunto titulo={n.title} />
          )}
          {n.url ? (
            <a href={n.url} target="_blank" rel="noopener noreferrer" tabIndex={copia ? -1 : undefined}>{n.title}</a>
          ) : (
            <span>{n.title}</span>
          )}
          <span className="noticias-fonte">{[n.sourceName, tempoAtras(n.publishedAt)].filter(Boolean).join(' · ')}</span>
        </li>
      ))}
    </ul>
  )
}

function Assunto({ titulo }: { titulo: string }) {
  const assunto = assuntoDa(titulo)
  return <span className={`noticias-assunto assunto-${assunto}`}>{ROTULO_ASSUNTO[assunto]}</span>
}

/** Faixa no rodapé com as manchetes correndo. Falha ao buscar não atrapalha o app: mantém o que já tinha. */
export default function BarraNoticias() {
  const { pathname } = useLocation()
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [pausada, setPausada] = useState(false)
  const [atualizada, setAtualizada] = useState<Date | null>(null)
  const janela = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const carregar = () => {
      if (document.hidden) return
      api
        .noticias()
        .then((lista) => {
          setNoticias(lista)
          setAtualizada(new Date())
        })
        .catch(() => {})
    }
    carregar()
    const timer = window.setInterval(carregar, ATUALIZAR_MS)
    window.addEventListener(NOTICIAS_MUDARAM, carregar)
    document.addEventListener('visibilitychange', carregar)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener(NOTICIAS_MUDARAM, carregar)
      document.removeEventListener('visibilitychange', carregar)
    }
  }, [])

  // Na sessão guiada, a atenção é do treino.
  if (!noticias.length || pathname === '/sessao') return null

  const letras = noticias.reduce((total, n) => total + n.title.length + (n.sourceName?.length ?? 0), 0)
  const duracao = Math.max(VOLTA_MINIMA_S, letras * SEGUNDOS_POR_LETRA)

  // O foco do teclado rola a janela até o link; ao sair, ela volta ao início para o laço continuar sem emenda.
  const aoSairDoFoco = () => {
    const el = janela.current
    if (el && getComputedStyle(el.firstElementChild!).animationName !== 'none') el.scrollLeft = 0
  }

  return (
    <section className={`noticias${pausada ? ' pausada' : ''}`} aria-label="Notícias de basquete">
      {/* Como a faixa de um canal de esporte: selo "ao vivo", o nome da faixa e a hora da última atualização. */}
      <div className="noticias-marca">
        <span className="noticias-vivo" aria-hidden>
          <i />
          Ao vivo
        </span>
        <span className="noticias-rotulo">
          Últimas notícias
          {atualizada && <small className="noticias-hora">Atualizado às {HORA.format(atualizada)}</small>}
        </span>
      </div>
      <div className="noticias-janela" ref={janela} onBlur={aoSairDoFoco}>
        <div className="noticias-trilha" style={{ '--duracao': `${duracao}s` } as CSSProperties}>
          <Itens noticias={noticias} />
          <Itens noticias={noticias} copia />
        </div>
      </div>
      <button
        className="botao-icone noticias-pausa"
        onClick={() => setPausada((p) => !p)}
        aria-label={pausada ? 'Continuar as notícias' : 'Pausar as notícias'}
        title={pausada ? 'Continuar' : 'Pausar'}
      >
        <Icone nome={pausada ? 'play' : 'pausa'} tamanho={16} />
      </button>
    </section>
  )
}
