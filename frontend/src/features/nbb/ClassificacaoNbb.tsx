import type { CSSProperties } from 'react'
import { CartaoCategoria, CartaoNoticia } from '../nba/cartoes'
import { Escudo, Estado } from '../nba/componentes'
import type { Categoria, Lider } from '../nba/lideres'
import { aproveitamento } from '../nba/tabela'
import { useCarga } from '../nba/useCarga'
import { buscarNbb, diaRelativo, saldoComSinal, timesCitadosNbb, VAGAS_PLAYOFFS, type CategoriaNbb, type LinhaNbb } from './classificacao'

/** Faixa à esquerda da linha: verde para os playoffs, cinza para quem fica de fora, vermelho para o rebaixado. */
function faixa(l: LinhaNbb, total: number) {
  if (l.posicao <= VAGAS_PLAYOFFS) return 'nba-direto'
  return l.posicao === total ? 'nba-rebaixado' : 'nba-fora'
}

function Tabela({ temporada, linhas }: { temporada: string; linhas: LinhaNbb[] }) {
  return (
    <table className="nba-tabela">
      <caption>{temporada ? `NBB ${temporada}` : 'NBB'}</caption>
      <thead>
        <tr>
          <th scope="col"><abbr title="Posição">#</abbr></th>
          <th scope="col">Time</th>
          <th scope="col"><abbr title="Vitórias">V</abbr></th>
          <th scope="col"><abbr title="Derrotas">D</abbr></th>
          <th scope="col"><abbr title="Aproveitamento">%</abbr></th>
          <th scope="col"><abbr title="Jogos">J</abbr></th>
          <th scope="col"><abbr title="Saldo de pontos">Saldo</abbr></th>
          <th scope="col"><abbr title="Pontos na tabela: 2 por vitória e 1 por derrota">Pts</abbr></th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.sigla} className={faixa(l, linhas.length)} style={{ '--time': 'var(--muted)' } as CSSProperties}>
            <td>{l.posicao}</td>
            <th scope="row">
              <Escudo time={{ escudo: l.escudo, escudoEscuro: l.escudo }} />
              <span className="nba-time-nome">{l.nome}</span>
              <abbr className="nba-time-sigla" title={l.nome}>{l.sigla}</abbr>
            </th>
            <td>{l.vitorias}</td>
            <td>{l.derrotas}</td>
            <td>{aproveitamento(l.aproveitamento)}</td>
            <td>{l.jogos}</td>
            <td className={l.saldo > 0 ? 'nba-seq-v' : l.saldo < 0 ? 'nba-seq-d' : undefined}>{saldoComSinal(l.saldo)}</td>
            <td>{l.pontos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Parte da página que a LNB não entregou na última leitura. */
const Indisponivel = ({ o }: { o: string }) => <p className="muted">{o} não está disponível agora. Tente de novo mais tarde.</p>

// Todos os líderes na cor da marca: os clubes do NBB não têm a cor deles na LNB.
const COR_LIDER = 'var(--laranja)'

function paraCartao({ lideres, ...categoria }: CategoriaNbb): { categoria: Categoria; lideres: Lider[] } {
  return {
    categoria: { id: categoria.id, rotulo: categoria.rotulo, unidade: categoria.unidade, curto: categoria.curto },
    lideres: lideres.map((l) => ({ posicao: l.posicao, nome: l.nome, time: l.time, sigla: l.sigla, cor: COR_LIDER, valor: l.valor, escudo: l.escudo, escudoEscuro: l.escudo })),
  }
}

export default function ClassificacaoNbb() {
  const { dados, erro, carregar } = useCarga(buscarNbb)
  const atualizada = dados?.atualizada ? new Date(dados.atualizada) : null
  const total = dados?.linhas.length ?? 0
  return (
    <>
      <h1>NBB</h1>
      <p className="muted">A classificação do Novo Basquete Brasil, as notícias do campeonato e quem lidera a temporada em pontos, rebotes, assistências, tocos, roubos de bola e eficiência.</p>

      <section className="nba-secao" aria-labelledby="nbb-classificacao">
        <h2 id="nbb-classificacao">Classificação</h2>
        {!dados ? (
          <Estado erro={erro} carregar={carregar} texto="Carregando a classificação…" />
        ) : !total ? (
          <Indisponivel o="A classificação" />
        ) : (
          <>
            <div className="nbb-tabela-unica">
              <Tabela temporada={dados.temporada} linhas={dados.linhas} />
            </div>
            <p className="nba-legenda">
              <span className="nba-legenda-direto">1º ao {Math.min(VAGAS_PLAYOFFS, total)}º: playoffs (oitavas de final)</span>
              {total > VAGAS_PLAYOFFS + 1 && <span className="nba-legenda-fora">{VAGAS_PLAYOFFS + 1}º: fora dos playoffs</span>}
              {total > VAGAS_PLAYOFFS && <span className="nba-legenda-rebaixado">{total}º: rebaixado para a Liga Ouro</span>}
            </p>
          </>
        )}
      </section>

      {dados && (
        <section className="nba-secao" aria-labelledby="nbb-noticias">
          <h2 id="nbb-noticias">Notícias</h2>
          <p className="nba-legenda">Do site da LNB, as mais recentes primeiro. A lista se atualiza quando o site é publicado, de 6 em 6 horas.</p>
          {dados.noticias.length ? (
            <div className="nba-noticias">
              {dados.noticias.map((n) => (
                <CartaoNoticia
                  key={n.url}
                  url={n.url}
                  imagem={n.imagem}
                  fonte="LNB"
                  quando={diaRelativo(n.data)}
                  titulo={n.titulo}
                  resumo={n.resumo}
                  times={timesCitadosNbb(`${n.titulo} ${n.resumo}`, dados.linhas)}
                />
              ))}
            </div>
          ) : (
            <Indisponivel o="As notícias" />
          )}
        </section>
      )}

      {dados && (
        <section className="nba-secao" aria-labelledby="nbb-lideres">
          <h2 id="nbb-lideres">Líderes da temporada</h2>
          {dados.categorias.length ? (
            <div className="nba-grade">
              {dados.categorias.map((c) => (
                <CartaoCategoria key={c.id} prefixo="nbb" {...paraCartao(c)} />
              ))}
            </div>
          ) : (
            <Indisponivel o="As estatísticas" />
          )}
        </section>
      )}

      <p className="nba-fonte">
        Dados da LNB (Liga Nacional de Basquete){atualizada && ` lidos em ${atualizada.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}. A vitória vale 2 pontos e a derrota, 1. Os líderes são a média por jogo, e as notícias abrem no site da LNB.
      </p>
    </>
  )
}
