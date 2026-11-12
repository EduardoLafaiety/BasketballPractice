import { useState, type CSSProperties } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ARTIGOS, CATEGORIAS, POR_FILEIRA, categoria, minutosDeLeitura, type Artigo, type Categoria } from '../artigos/dados'
import { linkDaFonte } from '../artigos/links'
import ImagemArtigo from '../artigos/ImagemArtigo'
import Icone from '../components/Icone'
import NaoEncontrada from './NaoEncontrada'

const AVISO = 'Conteúdo educativo. Não substitui a orientação de médico, fisioterapeuta, nutricionista ou preparador físico.'

function CartaoArtigo({ artigo }: { artigo: Artigo }) {
  const cat = categoria(artigo.categoria)
  return (
    <Link to={`/artigos/${artigo.id}`} className="card artigo-cartao" style={{ '--c': cat.cor } as CSSProperties}>
      <ImagemArtigo id={artigo.id} />
      <span className="tag">{cat.nome}</span>
      <h3>{artigo.titulo}</h3>
      <p>{artigo.resumo}</p>
      <span className="artigo-cartao-rodape">
        <span>{minutosDeLeitura(artigo)} min</span>
        {artigo.ciencia.length > 0 && <span className="artigo-selo">Com estudos</span>}
        <Icone nome="seta" />
      </span>
    </Link>
  )
}

/** O artigo em destaque troca toda semana, passando pela lista inteira. */
function artigoDaSemana(agora = new Date()) {
  const semana = Math.floor(agora.getTime() / (7 * 24 * 60 * 60 * 1000))
  return ARTIGOS[semana % ARTIGOS.length]
}

function Destaque({ artigo }: { artigo: Artigo }) {
  const cat = categoria(artigo.categoria)
  return (
    <Link to={`/artigos/${artigo.id}`} className="card artigo-destaque" style={{ '--c': cat.cor } as CSSProperties}>
      <ImagemArtigo id={artigo.id} />
      <span className="artigo-destaque-texto">
        <span className="rotulo-forte">Destaque da semana</span>
        <span className="tag">{cat.nome}</span>
        <strong className="artigo-destaque-titulo">{artigo.titulo}</strong>
        <span className="artigo-destaque-resumo">{artigo.resumo}</span>
        <span className="link-forte">Ler em {minutosDeLeitura(artigo)} min <Icone nome="seta" /></span>
      </span>
    </Link>
  )
}

export default function Artigos() {
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState('')
  const filtro = CATEGORIAS.find((c) => c.id === params.get('categoria'))?.id
  const q = busca.trim().toLowerCase()

  const lista = ARTIGOS.filter(
    (a) => (!filtro || a.categoria === filtro) && (!q || `${a.titulo} ${a.resumo}`.toLowerCase().includes(q)),
  )
  const escolher = (c?: Categoria) => setParams(c ? { categoria: c } : {}, { replace: true })

  return (
    <>
      <h1>Artigos</h1>
      <p className="muted">
        Leituras curtas sobre a história do jogo, a cabeça do atleta, o corpo e o descanso. Cada ideia vem com o estudo por trás dela.
      </p>
      <Link to="/quiz" className="link-forte">Quiz do dia: 5 perguntas sobre o que está aqui</Link>

      {!filtro && !q && <Destaque artigo={artigoDaSemana()} />}

      <div className="grade artigo-categorias" role="group" aria-label="Categorias">
        {CATEGORIAS.map((c) => {
          const ativa = c.id === filtro
          return (
            <button
              key={c.id}
              className={`card artigo-categoria ${ativa ? 'ativo' : ''}`}
              style={{ '--c': c.cor } as CSSProperties}
              aria-pressed={ativa}
              onClick={() => escolher(ativa ? undefined : c.id)}
            >
              <strong>{c.nome}</strong>
              <span className="meta">{c.resumo}</span>
              <span className="artigo-contagem">{ARTIGOS.filter((a) => a.categoria === c.id).length} artigos</span>
            </button>
          )
        })}
      </div>

      <div className="filtros">
        <input className="input" type="search" placeholder="Buscar artigo" aria-label="Buscar artigo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {filtro && (
          <button className="chip" onClick={() => escolher()}>
            Ver todas as categorias
          </button>
        )}
      </div>

      {lista.length ? (
        <div className="grade artigo-lista">
          {lista.map((a) => <CartaoArtigo key={a.id} artigo={a} />)}
        </div>
      ) : (
        <div className="vazio">Nenhum artigo encontrado.</div>
      )}

      <p className="meta artigo-aviso">{AVISO}</p>
    </>
  )
}

/** A referência como link para a fonte original, que abre em outra aba. */
function Fonte({ texto }: { texto: string }) {
  const url = linkDaFonte(texto)
  if (!url) return <>{texto}</>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="artigo-fonte-link" title="Abre a fonte em outra aba">
      {texto}
      <span aria-hidden> ↗</span>
    </a>
  )
}

export function ArtigoDetalhe() {
  const { id } = useParams()
  const artigo = ARTIGOS.find((a) => a.id === id)
  if (!artigo) return <NaoEncontrada />

  const cat = categoria(artigo.categoria)
  // Uma fileira cheia de 4: os próximos da mesma categoria, voltando ao começo da lista.
  const mesmos = ARTIGOS.filter((a) => a.categoria === artigo.categoria)
  const i = mesmos.indexOf(artigo)
  const mais = [...mesmos.slice(i + 1), ...mesmos.slice(0, i)].slice(0, POR_FILEIRA)

  return (
    <article className="artigo" style={{ '--c': cat.cor } as CSSProperties}>
      <Link to="/artigos" className="link-forte voltar">← Todos os artigos</Link>
      <header className="artigo-topo">
        <Link to={`/artigos?categoria=${cat.id}`} className="tag">{cat.nome}</Link>
        <h1>{artigo.titulo}</h1>
        <p className="artigo-texto artigo-linha-fina">{artigo.resumo}</p>
        <span className="meta">{minutosDeLeitura(artigo)} min de leitura</span>
      </header>
      <ImagemArtigo id={artigo.id} capa />

      {/* No computador, um sumário fixo ao lado do texto leva a cada parte do artigo. */}
      <div className="artigo-leitura">
        <nav className="artigo-sumario" aria-label="Neste artigo">
          <span className="artigo-rotulo">Neste artigo</span>
          <ol>
            {[
              ...artigo.secoes.map((s, i) => ({ id: `secao-${i}`, titulo: s.titulo })),
              ...(artigo.ciencia.length ? [{ id: 'artigo-ciencia', titulo: 'O que a ciência diz' }] : []),
              { id: 'artigo-pratica', titulo: 'Na prática' },
              { id: 'artigo-fontes', titulo: 'Fontes' },
            ].map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  {item.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="artigo-corpo artigo-texto">
          {artigo.secoes.map((s, i) => (
            <section key={s.titulo} id={`secao-${i}`}>
              <h2>{s.titulo}</h2>
              {s.paragrafos.map((p) => <p key={p}>{p}</p>)}
            </section>
          ))}

          {artigo.ciencia.length > 0 && (
            <aside className="artigo-ciencia" id="artigo-ciencia" aria-label="O que a ciência diz">
              <span className="artigo-rotulo">O que a ciência diz</span>
              <ul>
                {artigo.ciencia.map((c) => (
                  <li key={c.fonte}>
                    {c.achado}
                    <cite><Fonte texto={c.fonte} /></cite>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <aside className="card artigo-pratica" id="artigo-pratica" aria-label="Na prática">
            <span className="artigo-rotulo">Na prática</span>
            <ul>
              {artigo.pratica.map((p) => (
                <li key={p}><Icone nome="check" tamanho={16} />{p}</li>
              ))}
            </ul>
            {artigo.noApp && (
              <Link to={artigo.noApp.to} className="link-forte artigo-no-app">
                {artigo.noApp.rotulo} <Icone nome="seta" />
              </Link>
            )}
          </aside>

          <section className="artigo-fontes" id="artigo-fontes">
            <h2>Fontes</h2>
            <ol>
              {artigo.fontes.map((f) => <li key={f}><Fonte texto={f} /></li>)}
            </ol>
            <p className="meta">{AVISO}</p>
          </section>
        </div>
      </div>

      {mais.length > 0 && (
        <>
          <h2>Leia também</h2>
          <div className="grade artigo-lista">
            {mais.map((a) => <CartaoArtigo key={a.id} artigo={a} />)}
          </div>
        </>
      )}
    </article>
  )
}
