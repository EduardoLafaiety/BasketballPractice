import { useState, type CSSProperties } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ARTIGOS, CATEGORIAS, categoria, minutosDeLeitura, type Artigo, type Categoria } from '../artigos/dados'
import { linkDaFonte } from '../artigos/links'
import Icone from '../components/Icone'
import NaoEncontrada from './NaoEncontrada'

const AVISO = 'Conteúdo educativo. Não substitui a orientação de médico, fisioterapeuta, nutricionista ou preparador físico.'

function CartaoArtigo({ artigo }: { artigo: Artigo }) {
  const cat = categoria(artigo.categoria)
  return (
    <Link to={`/artigos/${artigo.id}`} className="card artigo-cartao" style={{ '--c': cat.cor } as CSSProperties}>
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
  const mais = ARTIGOS.filter((a) => a.categoria === artigo.categoria && a.id !== artigo.id)

  return (
    <article className="artigo" style={{ '--c': cat.cor } as CSSProperties}>
      <Link to="/artigos" className="link-forte voltar">← Todos os artigos</Link>
      <header className="artigo-topo">
        <Link to={`/artigos?categoria=${cat.id}`} className="tag">{cat.nome}</Link>
        <h1>{artigo.titulo}</h1>
        <p className="artigo-texto artigo-linha-fina">{artigo.resumo}</p>
        <span className="meta">{minutosDeLeitura(artigo)} min de leitura</span>
      </header>

      <div className="artigo-corpo artigo-texto">
        {artigo.secoes.map((s) => (
          <section key={s.titulo}>
            <h2>{s.titulo}</h2>
            {s.paragrafos.map((p) => <p key={p}>{p}</p>)}
          </section>
        ))}

        {artigo.ciencia.length > 0 && (
          <aside className="artigo-ciencia" aria-label="O que a ciência diz">
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

        <aside className="card artigo-pratica" aria-label="Na prática">
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

        <section className="artigo-fontes">
          <h2>Fontes</h2>
          <ol>
            {artigo.fontes.map((f) => <li key={f}><Fonte texto={f} /></li>)}
          </ol>
          <p className="meta">{AVISO}</p>
        </section>
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
