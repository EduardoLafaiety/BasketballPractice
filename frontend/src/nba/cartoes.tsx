import type { CSSProperties } from 'react'
import { Escudo } from './componentes'
import type { Escudos } from './escudos'
import { numero, type Categoria, type Lider } from './lideres'

/** Uma categoria: o líder em destaque, na cor do time, e do 2º ao 10º com barras para comparar. */
export function CartaoCategoria({ categoria, lideres, prefixo = 'nba' }: { categoria: Categoria; lideres: Lider[]; prefixo?: string }) {
  const [primeiro, ...resto] = lideres
  const maior = primeiro.valor || 1
  const id = `${prefixo}-${categoria.id}`
  return (
    <section className="card nba-cartao" aria-labelledby={id}>
      <h3 id={id}>{categoria.rotulo}</h3>
      <div className="nba-lider" style={{ '--time': primeiro.cor } as CSSProperties}>
        <span className="nba-coroa">1º</span>
        <Escudo time={primeiro} soEscuro className="nba-escudo-lider" />
        <span className="nba-valor">{numero(primeiro.valor)}</span>
        <span className="nba-unidade">{categoria.unidade}</span>
        <strong className="nba-nome-lider">{primeiro.nome}</strong>
        <span className="nba-time">{primeiro.time}</span>
      </div>
      <ol className="nba-ranking" start={2}>
        {resto.map((l) => (
          <li key={l.posicao} style={{ '--time': l.cor, '--pct': l.valor / maior } as CSSProperties}>
            <span className="nba-pos" aria-hidden>{l.posicao}</span>
            <Escudo time={l} className="nba-escudo-ranking" />
            <span className="nba-nome">{l.nome}</span>
            <abbr className="nba-sigla" title={l.time}>{l.sigla}</abbr>
            <span className="nba-barra" aria-hidden><i /></span>
            <span className="nba-num">{numero(l.valor)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export interface TimeNoCartao extends Escudos {
  sigla: string
  nome: string
}

/** Cartão de notícia: foto, fonte e quando saiu, os escudos dos times citados, título e resumo; abre a matéria no site de origem. */
export function CartaoNoticia({ url, imagem, fonte, quando, titulo, resumo, times }: { url: string; imagem: string | null; fonte: string; quando: string; titulo: string; resumo: string; times: TimeNoCartao[] }) {
  return (
    <a className="card nba-noticia" href={url} target="_blank" rel="noopener noreferrer">
      {imagem && <img className="nba-noticia-foto" src={imagem} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      <span className="nba-noticia-meta">
        <span>
          <strong>{fonte}</strong> · {quando}
        </span>
        {times.length > 0 && (
          <span className="nba-noticia-times" title={times.map((t) => t.nome).join(', ')}>
            {times.map((t) => (
              <Escudo key={t.sigla} time={t} />
            ))}
          </span>
        )}
      </span>
      <h3>{titulo}</h3>
      {resumo && <p>{resumo}</p>}
    </a>
  )
}
