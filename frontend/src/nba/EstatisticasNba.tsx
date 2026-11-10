import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Carregando, ErroCarga } from '../components/Estado'
import { tempoAtras } from '../lib/noticias'
import { buscarLideres, numero, type Categoria, type Lider } from './lideres'
import { buscarNoticiasNba, ultimas24h, type NoticiaNba } from './noticias'
import { aproveitamento, buscarTabela, jogosAtras, type LinhaTabela } from './tabela'

// As notícias se atualizam sozinhas com a página aberta; as que passam de 24 horas saem da lista.
const ATUALIZAR_NOTICIAS_MS = 10 * 60_000
const NOTICIAS_VISIVEIS = 3

/** Busca ao abrir, com carregando, erro e "tentar de novo". */
function useCarga<T>(buscar: () => Promise<T>) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const carregar = useCallback(() => {
    setErro(null)
    buscar().then(setDados, setErro)
  }, [buscar])
  useEffect(carregar, [carregar])
  return { dados, erro, carregar }
}

function Estado({ erro, carregar, texto }: { erro: Error | null; carregar: () => void; texto: string }) {
  return erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto={texto} />
}

function TabelaConferencia({ titulo, linhas }: { titulo: string; linhas: LinhaTabela[] }) {
  return (
    <table className="nba-tabela">
      <caption>{titulo}</caption>
      <thead>
        <tr>
          <th scope="col"><abbr title="Posição">#</abbr></th>
          <th scope="col">Time</th>
          <th scope="col"><abbr title="Vitórias">V</abbr></th>
          <th scope="col"><abbr title="Derrotas">D</abbr></th>
          <th scope="col"><abbr title="Aproveitamento">%</abbr></th>
          <th scope="col"><abbr title="Jogos atrás do líder">JA</abbr></th>
          <th scope="col"><abbr title="Sequência: V = vitórias seguidas, D = derrotas seguidas">Seq.</abbr></th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.sigla} className={l.posicao <= 6 ? 'nba-direto' : l.posicao <= 10 ? 'nba-playin' : undefined} style={{ '--time': l.cor } as CSSProperties}>
            <td>{l.posicao}</td>
            <th scope="row">
              <span className="nba-time-cor" aria-hidden />
              <span className="nba-time-nome">{l.nome}</span>
              <abbr className="nba-time-sigla" title={l.nome}>{l.sigla}</abbr>
            </th>
            <td>{l.vitorias}</td>
            <td>{l.derrotas}</td>
            <td>{aproveitamento(l.aproveitamento)}</td>
            <td>{jogosAtras(l.atras)}</td>
            <td className={l.sequencia.startsWith('V') ? 'nba-seq-v' : 'nba-seq-d'}>{l.sequencia}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Classificacao() {
  const { dados, erro, carregar } = useCarga(buscarTabela)
  return (
    <section className="nba-secao" aria-labelledby="nba-classificacao">
      <h2 id="nba-classificacao">Classificação</h2>
      {!dados ? (
        <Estado erro={erro} carregar={carregar} texto="Carregando a classificação…" />
      ) : (
        <>
          <div className="nba-conferencias">
            <TabelaConferencia titulo="Conferência Leste" linhas={dados.leste} />
            <TabelaConferencia titulo="Conferência Oeste" linhas={dados.oeste} />
          </div>
          <p className="nba-legenda">
            <span className="nba-legenda-direto">1º ao 6º: vaga direta nos playoffs</span>
            <span className="nba-legenda-playin">7º ao 10º: play-in</span>
          </p>
        </>
      )}
    </section>
  )
}

/** Uma categoria: o líder em destaque, na cor do time, e do 2º ao 10º com barras para comparar. */
function CartaoCategoria({ categoria, lideres }: { categoria: Categoria; lideres: Lider[] }) {
  const [primeiro, ...resto] = lideres
  const maior = primeiro.valor || 1
  const id = `nba-${categoria.id}`
  return (
    <section className="card nba-cartao" aria-labelledby={id}>
      <h3 id={id}>{categoria.rotulo}</h3>
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

function Lideres() {
  const { dados, erro, carregar } = useCarga(buscarLideres)
  return (
    <section className="nba-secao" aria-labelledby="nba-lideres">
      <h2 id="nba-lideres">Líderes da temporada</h2>
      {!dados ? (
        <Estado erro={erro} carregar={carregar} texto="Carregando as estatísticas da NBA…" />
      ) : (
        <div className="nba-grade">
          {dados.categorias.map((c) => (
            <CartaoCategoria key={c.categoria.id} {...c} />
          ))}
        </div>
      )}
    </section>
  )
}

function CartaoNoticia({ n }: { n: NoticiaNba }) {
  return (
    <a className="card nba-noticia" href={n.url} target="_blank" rel="noopener noreferrer">
      {n.imagem && <img src={n.imagem} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      <span className="nba-noticia-meta">
        <strong>{n.fonte}</strong> · {tempoAtras(n.publicada)}
      </span>
      <h3>{n.titulo}</h3>
      {n.resumo && <p>{n.resumo}</p>}
    </a>
  )
}

function Noticias() {
  const { dados, erro, carregar } = useCarga(buscarNoticiasNba)
  const [agora, setAgora] = useState(() => Date.now())
  const [todas, setTodas] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      // Passado o tempo do cache, busca de novo; se falhar, a lista que já estava continua na tela.
      setAgora(Date.now())
      carregar()
    }, ATUALIZAR_NOTICIAS_MS)
    return () => window.clearInterval(timer)
  }, [carregar])

  const lista = dados ? ultimas24h(dados, agora) : []
  const visiveis = todas ? lista : lista.slice(0, NOTICIAS_VISIVEIS)

  return (
    <section className="nba-secao" aria-labelledby="nba-noticias">
      <h2 id="nba-noticias">Notícias</h2>
      <p className="nba-legenda">Das últimas 24 horas, da ESPN e da CBS Sports (em inglês). A lista se atualiza sozinha.</p>
      {!dados ? (
        <Estado erro={erro} carregar={carregar} texto="Carregando as notícias…" />
      ) : (
        <>
          <div className="nba-noticias">
            {visiveis.map((n) => (
              <CartaoNoticia key={n.id} n={n} />
            ))}
          </div>
          {lista.length > NOTICIAS_VISIVEIS && (
            <button className="btn nba-mais" onClick={() => setTodas((t) => !t)} aria-expanded={todas}>
              {todas ? 'Mostrar menos' : `Mais notícias (${lista.length - NOTICIAS_VISIVEIS})`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default function EstatisticasNba() {
  return (
    <>
      <h1>Estatísticas da NBA</h1>
      <p className="muted">A classificação das conferências, quem lidera a temporada em pontos, rebotes, assistências e tocos, e as notícias do dia.</p>
      <Classificacao />
      <Lideres />
      <Noticias />
      <p className="nba-fonte">Dados da ESPN e da CBS Sports, atualizados ao abrir a página. As notícias abrem no site de origem.</p>
    </>
  )
}
