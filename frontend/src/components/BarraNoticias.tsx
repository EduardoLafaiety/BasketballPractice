import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, type Noticia } from '../api'
import { assuntoDa, NOTICIAS_MUDARAM, ROTULO_ASSUNTO, tempoAtras } from '../lib/noticias'
import { buscarLideres, numero, type Lideres } from '../nba/lideres'
import Icone from './Icone'

const ATUALIZAR_MS = 5 * 60_000
// Velocidade de leitura confortável: o tempo da volta cresce com a quantidade de texto.
const SEGUNDOS_POR_LETRA = 0.2
const VOLTA_MINIMA_S = 30
// Quantas categorias de estatística entram na faixa (pontos, rebotes, assistências e tocos).
const CATEGORIAS_NA_BARRA = 4

/** O líder de cada categoria vira uma linha da faixa, com link para a página de estatísticas. */
function destaquesDe(lideres: Lideres | null) {
  return (lideres?.categorias ?? []).slice(0, CATEGORIAS_NA_BARRA).map(({ categoria, lideres: [l] }) => ({
    id: categoria.id,
    texto: `Líder em ${categoria.curto}: ${l.nome} (${l.sigla})`,
    valor: `${numero(l.valor)} por jogo`,
  }))
}
type Destaque = ReturnType<typeof destaquesDe>[number]

function Itens({ noticias, destaques, copia }: { noticias: Noticia[]; destaques: Destaque[]; copia?: boolean }) {
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
      {destaques.map((d) => (
        <li key={d.id} className="noticias-item">
          <span className="noticias-assunto assunto-stats">Stats</span>
          <Link to="/nba" tabIndex={copia ? -1 : undefined}>{d.texto}</Link>
          <span className="noticias-fonte">{d.valor}</span>
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
  const [lideres, setLideres] = useState<Lideres | null>(null)
  const [pausada, setPausada] = useState(false)
  const janela = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const carregar = () => {
      if (document.hidden) return
      api.noticias().then(setNoticias).catch(() => {})
      // As estatísticas da NBA entram na faixa quando chegam; se a ESPN falhar, ficam só as notícias.
      buscarLideres().then(setLideres).catch(() => {})
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
  const destaques = destaquesDe(lideres)
  if ((!noticias.length && !destaques.length) || pathname === '/sessao') return null

  const letras =
    noticias.reduce((total, n) => total + n.title.length + (n.sourceName?.length ?? 0), 0) +
    destaques.reduce((total, d) => total + d.texto.length + d.valor.length, 0)
  const duracao = Math.max(VOLTA_MINIMA_S, letras * SEGUNDOS_POR_LETRA)

  // O foco do teclado rola a janela até o link; ao sair, ela volta ao início para o laço continuar sem emenda.
  const aoSairDoFoco = () => {
    const el = janela.current
    if (el && getComputedStyle(el.firstElementChild!).animationName !== 'none') el.scrollLeft = 0
  }

  return (
    <section className={`noticias${pausada ? ' pausada' : ''}`} aria-label="Notícias de basquete">
      {/* Como a faixa de um canal de esporte: selo "ao vivo" e o nome da faixa. */}
      <div className="noticias-marca">
        <span className="noticias-vivo" aria-hidden>
          <i />
          Ao vivo
        </span>
        <span className="noticias-rotulo">Últimas notícias</span>
      </div>
      <div className="noticias-janela" ref={janela} onBlur={aoSairDoFoco}>
        <div className="noticias-trilha" style={{ '--duracao': `${duracao}s` } as CSSProperties}>
          <Itens noticias={noticias} destaques={destaques} />
          <Itens noticias={noticias} destaques={destaques} copia />
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
