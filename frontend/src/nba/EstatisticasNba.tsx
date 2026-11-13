import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { tempoAtras } from '../lib/noticias'
import { CartaoCategoria, CartaoNoticia } from './cartoes'
import { Escudo, Estado } from './componentes'
import { buscarLideres } from './lideres'
import { timesCitados } from './escudos'
import { buscarNoticiasNba, ultimas24h } from './noticias'
import { useCarga } from './useCarga'
import { aproveitamento, buscarTabela, jogosAtras, type LinhaTabela } from './tabela'

// As notícias se atualizam sozinhas com a página aberta; as que passam de 24 horas saem da lista.
const ATUALIZAR_NOTICIAS_MS = 10 * 60_000
// Entram de 12 em 12 conforme a página rola (12 fecha fileiras de 1, 2, 3 ou 4 cartões).
const NOTICIAS_POR_VEZ = 12

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
          <tr key={l.sigla} className={l.posicao <= 6 ? 'nba-direto' : l.posicao <= 10 ? 'nba-playin' : 'nba-fora'} style={{ '--time': l.cor } as CSSProperties}>
            <td>{l.posicao}</td>
            <th scope="row">
              <Escudo time={l} />
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
        <Estado erro={erro} carregar={carregar} texto="Carregando a classificação" />
      ) : (
        <>
          <div className="nba-conferencias">
            <TabelaConferencia titulo="Conferência Leste" linhas={dados.leste} />
            <TabelaConferencia titulo="Conferência Oeste" linhas={dados.oeste} />
          </div>
          <p className="nba-legenda">
            <span className="nba-legenda-direto">1º ao 6º: vaga direta nos playoffs</span>
            <span className="nba-legenda-playin">7º ao 10º: play-in</span>
            <span className="nba-legenda-fora">11º ao 15º: fora dos playoffs</span>
          </p>
        </>
      )}
    </section>
  )
}

function Lideres() {
  const { dados, erro, carregar } = useCarga(buscarLideres)
  return (
    <section className="nba-secao" aria-labelledby="nba-lideres">
      <h2 id="nba-lideres">Líderes da temporada</h2>
      {!dados ? (
        <Estado erro={erro} carregar={carregar} texto="Carregando as estatísticas da NBA" />
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

function Noticias() {
  const { dados, erro, carregar } = useCarga(buscarNoticiasNba)
  const [agora, setAgora] = useState(() => Date.now())
  const [quantas, setQuantas] = useState(NOTICIAS_POR_VEZ)
  const fim = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      // Passado o tempo do cache, busca de novo; se falhar, a lista que já estava continua na tela.
      setAgora(Date.now())
      carregar()
    }, ATUALIZAR_NOTICIAS_MS)
    return () => window.clearInterval(timer)
  }, [carregar])

  const lista = dados ? ultimas24h(dados, agora) : []
  // Sem IntersectionObserver (navegador antigo), mostra tudo de uma vez.
  const rolagem = typeof IntersectionObserver !== 'undefined'
  const visiveis = rolagem ? lista.slice(0, quantas) : lista
  const falta = visiveis.length < lista.length

  // Quando o fim da lista chega perto da tela, entram mais; se ainda couber, o observador avisa de novo.
  useEffect(() => {
    if (!falta || !fim.current) return
    const olho = new IntersectionObserver(
      ([item]) => {
        if (item.isIntersecting) setQuantas((q) => q + NOTICIAS_POR_VEZ)
      },
      { rootMargin: '0px 0px 600px 0px' },
    )
    olho.observe(fim.current)
    return () => olho.disconnect()
  }, [falta, quantas])

  return (
    <section className="nba-secao" aria-labelledby="nba-noticias">
      <h2 id="nba-noticias">Notícias</h2>
      <p className="nba-legenda">Das últimas 24 horas, da ESPN e da CBS Sports (em inglês). A lista se atualiza sozinha.</p>
      {!dados ? (
        <Estado erro={erro} carregar={carregar} texto="Carregando as notícias" />
      ) : (
        <>
          <div className="nba-noticias">
            {visiveis.map((n) => (
              <CartaoNoticia key={n.id} url={n.url} imagem={n.imagem} fonte={n.fonte} quando={tempoAtras(n.publicada)} titulo={n.titulo} resumo={n.resumo} times={timesCitados(`${n.titulo} ${n.resumo}`)} />
            ))}
          </div>
          {falta && <div ref={fim} className="nba-noticias-fim" aria-hidden />}
        </>
      )}
    </section>
  )
}

export default function EstatisticasNba() {
  return (
    <>
      <h1>Estatísticas da NBA</h1>
      <p className="muted">A classificação das conferências, as notícias do dia e quem lidera a temporada em pontos, rebotes, assistências e tocos.</p>
      <Classificacao />
      <Noticias />
      <Lideres />
      <p className="nba-fonte">Dados da ESPN e da CBS Sports, atualizados ao abrir a página. As notícias abrem no site de origem.</p>
    </>
  )
}
