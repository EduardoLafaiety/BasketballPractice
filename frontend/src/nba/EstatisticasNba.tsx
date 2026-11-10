import { useEffect, useState, type CSSProperties } from 'react'
import { Carregando, ErroCarga } from '../components/Estado'
import { buscarLideres, numero, type Categoria, type Lider, type Lideres } from './lideres'

/** Uma categoria: o líder em destaque, na cor do time, e do 2º ao 10º com barras para comparar. */
function CartaoCategoria({ categoria, lideres }: { categoria: Categoria; lideres: Lider[] }) {
  const [primeiro, ...resto] = lideres
  const maior = primeiro.valor || 1
  const id = `nba-${categoria.id}`
  return (
    <section className="card nba-cartao" aria-labelledby={id}>
      <h2 id={id}>{categoria.rotulo}</h2>
      <div className="nba-lider" style={{ '--time': primeiro.cor } as CSSProperties}>
        <span className="nba-coroa">1º</span>
        <span className="nba-valor">{numero(primeiro.valor)}</span>
        <span className="nba-unidade">{categoria.unidade}</span>
        <strong className="nba-nome-lider">{primeiro.nome}</strong>
        <span className="nba-time">{primeiro.time}</span>
      </div>
      <ol className="nba-ranking" start={2}>
        {resto.map((l) => (
          <li key={l.posicao} style={{ '--time': l.cor, '--pct': l.valor / maior } as CSSProperties}>
            <span className="nba-pos" aria-hidden>{l.posicao}</span>
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

export default function EstatisticasNba() {
  const [dados, setDados] = useState<Lideres | null>(null)
  const [erro, setErro] = useState<Error | null>(null)

  const carregar = () => {
    setErro(null)
    buscarLideres().then(setDados, setErro)
  }
  useEffect(carregar, [])

  return (
    <>
      <h1>Estatísticas da NBA</h1>
      <p className="muted">
        Quem lidera a temporada{dados?.temporada ? ` ${dados.temporada}` : ''} em pontos, rebotes, assistências e tocos. Médias por
        jogo, na temporada regular.
      </p>
      {!dados ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto="Carregando as estatísticas da NBA…" />
      ) : (
        <div className="nba-grade">
          {dados.categorias.map((c) => (
            <CartaoCategoria key={c.categoria.id} {...c} />
          ))}
        </div>
      )}
      <p className="nba-fonte">Dados da ESPN, atualizados ao abrir a página (no máximo a cada 15 minutos).</p>
    </>
  )
}
