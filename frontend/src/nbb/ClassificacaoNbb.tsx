import type { CSSProperties } from 'react'
import { Escudo, Estado } from '../nba/componentes'
import { useCarga } from '../nba/useCarga'
import { aproveitamento } from '../nba/tabela'
import { buscarNbb, saldoComSinal, VAGAS_PLAYOFFS, type LinhaNbb } from './classificacao'

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

export default function ClassificacaoNbb() {
  const { dados, erro, carregar } = useCarga(buscarNbb)
  const atualizada = dados?.atualizada ? new Date(dados.atualizada) : null
  return (
    <>
      <h1>NBB</h1>
      <p className="muted">A classificação do Novo Basquete Brasil, a liga nacional de basquete masculino.</p>
      <section className="nba-secao" aria-labelledby="nbb-classificacao">
        <h2 id="nbb-classificacao">Classificação</h2>
        {!dados ? (
          <Estado erro={erro} carregar={carregar} texto="Carregando a classificação…" />
        ) : (
          <>
            <div className="nbb-tabela-unica">
              <Tabela temporada={dados.temporada} linhas={dados.linhas} />
            </div>
            <p className="nba-legenda">
              <span className="nba-legenda-direto">1º ao {Math.min(16, dados.linhas.length)}º: playoffs (oitavas de final)</span>
              {dados.linhas.length > 17 && <span className="nba-legenda-fora">17º: fora dos playoffs</span>}
              {dados.linhas.length > 16 && <span className="nba-legenda-rebaixado">{dados.linhas.length}º: rebaixado para a Liga Ouro</span>}
            </p>
          </>
        )}
      </section>
      <p className="nba-fonte">
        Dados da LNB (Liga Nacional de Basquete){atualizada && ` lidos em ${atualizada.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}. A vitória vale 2 pontos e a derrota, 1.
      </p>
    </>
  )
}
