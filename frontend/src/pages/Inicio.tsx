import { Link } from 'react-router-dom'
import Icone from '../components/Icone'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import { DIAS, ROTULO_METRICA, aproveitamento, diasAtras, useDrills, useMetas, useProgresso, useResumo, useRotina } from '../store'
import type { DiaSemana, Drill } from '../types'

/** "a, b e c" */
function juntar(itens: string[]) {
  return itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

export default function Inicio() {
  const { resumo, erro: erroResumo } = useResumo(diasAtras(6))
  const rotina = useRotina()
  const drills = useDrills()
  const { progresso } = useProgresso()
  const { metas } = useMetas()
  const proximaMeta = metas.find((m) => !m.concluida)
  const hoje = new Date().getDay() as DiaSemana
  const treinosHoje = rotina.rotina[hoje].map(drills.drillPorId).filter((d): d is Drill => !!d)
  const focoHoje = juntar([...new Set(treinosHoje.map((d) => d.categoria.toLowerCase()))])

  const pct = resumo ? aproveitamento(resumo.acertos, resumo.tentativas) : null
  const valor = (n: number | string | undefined) => (n === undefined ? (erroResumo ? '!' : '…') : n)

  const erroHoje = rotina.erro ?? drills.erro
  const prontoHoje = rotina.carregado && drills.carregado

  return (
    <>
      <section className="hero">
        <QuadraFundo />
        <div className="hero-kicker">
          <p className="eyebrow">{DIAS[hoje]}</p>
          {progresso && progresso.sequenciaAtual > 0 ? (
            <Link to="/metas" className="sequencia-mini">
              <Icone nome="fogo" tamanho={16} />
              {progresso.sequenciaAtual} {progresso.sequenciaAtual === 1 ? 'dia seguido' : 'dias seguidos'}
              {proximaMeta && ` · meta: ${proximaMeta.titulo} (${proximaMeta.atual}/${proximaMeta.alvo})`}
            </Link>
          ) : (
            proximaMeta && (
              <Link to="/metas" className="sequencia-mini">
                <Icone nome="metas" tamanho={16} />
                Meta: {proximaMeta.titulo} ({proximaMeta.atual}/{proximaMeta.alvo})
              </Link>
            )
          )}
        </div>
        <h1 className="hero-titulo">
          Bora pra quadra<span className="ponto">.</span>
        </h1>
        <p className="hero-texto">
          {treinosHoje.length > 0
            ? `Hoje: ${focoHoje}. ${treinosHoje.length} ${treinosHoje.length === 1 ? 'exercício' : 'exercícios'}, um registro no fim.`
            : 'Escolha um treino, siga sua rotina semanal e acompanhe sua evolução.'}
        </p>
        <div className="acoes hero-acoes">
          {treinosHoje.length > 0 ? (
            <Link to="/sessao?hoje" className="btn btn-primario btn-grande">
              Começar treino de hoje <Icone nome="seta" />
            </Link>
          ) : (
            <Link to="/gerador" className="btn btn-primario btn-grande">
              Gerar um treino <Icone nome="raio" />
            </Link>
          )}
          <Link to="/treinos" className="link-forte">Ver treinos</Link>
          <Link to="/rotina" className="link-forte">Montar rotina</Link>
        </div>
      </section>

      {erroResumo && <p className="erro" role="alert">Não foi possível carregar seus números: {erroResumo.message}</p>}
      <section className="stats faixa" aria-busy={!resumo}>
        <Stat valor={valor(resumo?.sessoes)} rotulo="sessões nos últimos 7 dias" />
        <Stat valor={valor(resumo?.minutos)} rotulo="minutos treinados" />
        <Stat
          valor={resumo ? (pct === null ? '—' : `${pct}%`) : valor(undefined)}
          rotulo="aproveitamento nos arremessos"
          destaque
        />
      </section>

      <section>
        <div className="secao-topo secao-forte">
          <h2>Treino de hoje</h2>
          <Link to="/rotina" className="link-forte">Editar rotina</Link>
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
          <ol className="lista-treino">
            {treinosHoje.map((d, i) => (
              <li key={`${d.id}-${i}`}>
                <Link to={`/treinos/${d.id}`} className="treino-linha">
                  <span className="treino-numero" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                  <div className="treino-corpo">
                    <span className={`tag tag-${d.categoria}`}>{d.categoria} · {ROTULO_METRICA[d.metrica]}</span>
                    <h3>{d.nome}</h3>
                    {d.descricao && <span className="muted">{d.descricao}</span>}
                  </div>
                  <Icone nome="seta" tamanho={22} />
                </Link>
              </li>
            ))}
          </ol>
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

function Stat({ valor, rotulo, destaque }: { valor: number | string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`stat${destaque ? ' destaque' : ''}`}>
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </div>
  )
}

/** Linhas do garrafão desenhadas atrás do título. */
function QuadraFundo() {
  return (
    <svg className="hero-quadra" viewBox="0 0 620 560" fill="none" aria-hidden>
      <rect x="230" y="-4" width="240" height="330" />
      <circle cx="350" cy="326" r="90" />
      <path d="M40 -4 V 160 A 310 310 0 0 0 660 160 V -4" />
      <line x1="320" y1="40" x2="380" y2="40" />
      <circle cx="350" cy="62" r="16" />
    </svg>
  )
}
