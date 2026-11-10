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
// O tempo de gravação conta desde que o site abriu, não desde que a faixa apareceu.
const INICIO_GRAVACAO = Date.now()

const doisDigitos = (n: number) => String(n).padStart(2, '0')
/** Segundos no formato do visor de uma câmera: 01:02:03. */
export function tempoDeGravacao(segundos: number) {
  return [Math.floor(segundos / 3600), Math.floor(segundos / 60) % 60, segundos % 60].map(doisDigitos).join(':')
}

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

/** Separado da faixa para que só o relógio redesenhe a cada segundo. */
function Gravacao() {
  const segundos = () => Math.floor((Date.now() - INICIO_GRAVACAO) / 1000)
  const [s, setS] = useState(segundos)
  useEffect(() => {
    const timer = window.setInterval(() => setS(segundos()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return <span className="noticias-tempo">{tempoDeGravacao(s)}</span>
}

/** Faixa no rodapé com as manchetes correndo. Falha ao buscar não atrapalha o app: mantém o que já tinha. */
export default function BarraNoticias() {
  const { pathname } = useLocation()
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [lideres, setLideres] = useState<Lideres | null>(null)
  // Cada flash é um elemento novo (pela key), para a animação rodar de novo.
  const [flash, setFlash] = useState(0)
  const janela = useRef<HTMLDivElement>(null)
  const vistas = useRef<Set<number> | null>(null)

  useEffect(() => {
    const carregar = () => {
      if (document.hidden) return
      api
        .noticias()
        .then((lista) => {
          // Notícia que não estava na faixa dispara o flash (a primeira carga, não).
          if (vistas.current && lista.some((n) => !vistas.current!.has(n.id))) setFlash((f) => f + 1)
          vistas.current = new Set(lista.map((n) => n.id))
          setNoticias(lista)
        })
        .catch(() => {})
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
    <section className="noticias" aria-label="Notícias de basquete">
      {/* Como o visor de uma câmera de reportagem: cantos do enquadramento, REC e o tempo gravando. */}
      <div className="noticias-marca" aria-hidden>
        <span className="noticias-visor">
          <Icone nome="video" tamanho={16} />
          <i className="noticias-rec-ponto" />
          Rec
        </span>
        <Gravacao />
        <span className="noticias-rotulo">Breaking news</span>
      </div>
      {/* O flash do fotógrafo: a cada volta da faixa e quando chega notícia nova. */}
      {flash > 0 && <span key={flash} className="noticias-flash" aria-hidden />}
      <div className="noticias-janela" ref={janela} onBlur={aoSairDoFoco}>
        <div
          className="noticias-trilha"
          style={{ '--duracao': `${duracao}s` } as CSSProperties}
          onAnimationIteration={() => setFlash((f) => f + 1)}
        >
          <Itens noticias={noticias} destaques={destaques} />
          <Itens noticias={noticias} destaques={destaques} copia />
        </div>
      </div>
    </section>
  )
}
