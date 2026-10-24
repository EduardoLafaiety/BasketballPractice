import { Link } from 'react-router-dom'
import DrillCard from '../components/DrillCard'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import { DIAS, aproveitamento, diasAtras, useDrills, useMetas, useProgresso, useResumo, useRotina } from '../store'
import type { DiaSemana, Drill } from '../types'

export default function Inicio() {
  const { resumo, erro: erroResumo } = useResumo(diasAtras(6))
  const rotina = useRotina()
  const drills = useDrills()
  const { progresso } = useProgresso()
  const { metas } = useMetas()
  const proximaMeta = metas.find((m) => !m.concluida)
  const hoje = new Date().getDay() as DiaSemana
  const treinosHoje = rotina.rotina[hoje].map(drills.drillPorId).filter((d): d is Drill => !!d)

  const pct = resumo ? aproveitamento(resumo.acertos, resumo.tentativas) : null
  const valor = (n: number | string | undefined) => (n === undefined ? (erroResumo ? '!' : '…') : n)

  const erroHoje = rotina.erro ?? drills.erro
  const prontoHoje = rotina.carregado && drills.carregado

  return (
    <>
      <section className="hero">
        <p className="eyebrow">{DIAS[hoje]}</p>
        <h1>Bora pra quadra.</h1>
        <p className="muted">
          Escolha um treino, siga sua rotina semanal e acompanhe sua evolução.
        </p>
        <div className="acoes">
          {treinosHoje.length > 0 ? (
            <Link to="/sessao?hoje" className="btn btn-primario">▶ Começar treino de hoje</Link>
          ) : (
            <Link to="/gerador" className="btn btn-primario">⚡ Gerar um treino</Link>
          )}
          <Link to="/treinos" className="btn">Ver treinos</Link>
          <Link to="/rotina" className="btn">Montar rotina</Link>
        </div>
        {progresso && (
          <Link to="/metas" className="sequencia-mini">
            <span aria-hidden>🔥</span> {progresso.sequenciaAtual}{' '}
            {progresso.sequenciaAtual === 1 ? 'dia seguido' : 'dias seguidos'}
            {proximaMeta && ` · meta: ${proximaMeta.titulo} (${proximaMeta.atual}/${proximaMeta.alvo})`}
          </Link>
        )}
      </section>

      {erroResumo && <p className="erro" role="alert">Não foi possível carregar seus números: {erroResumo.message}</p>}
      <section className="stats" aria-busy={!resumo}>
        <Stat valor={valor(resumo?.sessoes)} rotulo="sessões nos últimos 7 dias" />
        <Stat valor={valor(resumo?.minutos)} rotulo="minutos treinados" />
        <Stat
          valor={resumo ? (pct === null ? '—' : `${pct}%`) : valor(undefined)}
          rotulo="aproveitamento nos arremessos"
        />
      </section>

      <section>
        <div className="secao-topo">
          <h2>Treino de hoje</h2>
          <Link to="/rotina" className="link">Editar rotina</Link>
        </div>
        {prontoHoje && (
          <AvisoDesatualizado erro={erroHoje} tentarDeNovo={() => { rotina.recarregar(); drills.recarregar() }} />
        )}
        {!prontoHoje ? (
          erroHoje ? (
            <ErroCarga erro={erroHoje} tentarDeNovo={() => { rotina.recarregar(); drills.recarregar() }} />
          ) : (
            <Carregando texto="Carregando treino de hoje…" />
          )
        ) : treinosHoje.length > 0 ? (
          <div className="grade">
            {treinosHoje.map((d, i) => (
              <DrillCard key={`${d.id}-${i}`} drill={d} />
            ))}
          </div>
        ) : (
          <div className="vazio">
            Nenhum treino planejado para {DIAS[hoje].toLowerCase()}.{' '}
            <Link to="/rotina" className="link">Adicione à rotina</Link>
          </div>
        )}
      </section>
    </>
  )
}

function Stat({ valor, rotulo }: { valor: number | string; rotulo: string }) {
  return (
    <div className="card stat">
      <strong>{valor}</strong>
      <span className="muted">{rotulo}</span>
    </div>
  )
}
