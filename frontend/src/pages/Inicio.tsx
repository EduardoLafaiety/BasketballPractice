import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import GradeJogadores from '../components/GradeJogadores'
import Icone from '../components/Icone'
import { AberturaBola, EscadaRolagem, Figura, FraseRolagem, ListraBola, NomesRolagem } from '../components/rolagem'
import { NIVEIS } from '../lib/niveis'
import { DIAS, ROTULO_METRICA, aproveitamento, diasAtras, useDrills, useMetas, useProgresso, useResumo, useRotina } from '../store'
import type { DiaSemana, Drill, EstiloResumo, Nivel } from '../types'

/** "a, b e c" */
function juntar(itens: string[]) {
  return itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

const FIGURA_DO_NIVEL: Record<Nivel, string> = {
  iniciante: 'Drible sentado',
  intermediario: 'Entre as pernas em movimento',
  avancado: 'Finger roll',
}
const ORDEM_SEMANA: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]
const FERRAMENTAS: { to: string; titulo: string; texto: string }[] = [
  { to: '/gerador', titulo: 'Gerador de treino', texto: 'Diga o tempo, o nível e o foco: a sessão começa pelo aquecimento e vai do mais fácil ao mais difícil.' },
  { to: '/ferramentas', titulo: 'Ferramentas de quadra', texto: 'Cronômetro, metrônomo, contador ao vivo, calculadoras e testes físicos.' },
  { to: '/desempenho', titulo: 'Desempenho', texto: 'Gráficos, mapa de arremessos e a sua evolução ao longo do tempo.' },
  { to: '/metas', titulo: 'Metas', texto: 'Objetivos com prazo, conquistas e sequência de dias treinando.' },
]

export default function Inicio() {
  const { resumo, erro: erroResumo } = useResumo(diasAtras(6))
  const rotina = useRotina()
  const drills = useDrills()
  const { progresso } = useProgresso()
  const { metas } = useMetas()
  const [estilos, setEstilos] = useState<EstiloResumo[]>([])
  useEffect(() => {
    api.estilos().then(setEstilos, () => setEstilos([]))
  }, [])

  const proximaMeta = metas.find((m) => !m.concluida)
  const hoje = new Date().getDay() as DiaSemana
  const treinosHoje = rotina.rotina[hoje].map(drills.drillPorId).filter((d): d is Drill => !!d)
  const focoHoje = juntar([...new Set(treinosHoje.map((d) => d.categoria.toLowerCase()))])
  const contagem = (id: Nivel) => drills.drills.filter((d) => d.nivel === id && !d.aquecimento).length

  const pct = resumo ? aproveitamento(resumo.acertos, resumo.tentativas) : null
  const valor = (n: number | string | undefined) => (n === undefined ? (erroResumo ? '!' : '…') : n)

  const erroHoje = rotina.erro ?? drills.erro
  const prontoHoje = rotina.carregado && drills.carregado

  return (
    <div className="pagina-larga">
      <AberturaBola
        titulo={
          <h1 className="abertura-titulo">
            <span className="abertura-a">Bora pra </span>
            <span className="abertura-b">quadra<span className="ponto">.</span></span>
          </h1>
        }
      >
        <div className="abertura-painel">
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
          <p className="hero-texto">
            {treinosHoje.length > 0
              ? `Hoje: ${focoHoje}. ${treinosHoje.length} ${treinosHoje.length === 1 ? 'exercício' : 'exercícios'}, um registro no fim.`
              : 'Sem treino hoje. Que tal 15 minutos?'}
          </p>
          <div className="acoes hero-acoes">
            {treinosHoje.length > 0 ? (
              <Link to="/sessao?hoje" className="btn btn-primario btn-grande">
                Começar treino de hoje <Icone nome="seta" />
              </Link>
            ) : (
              <Link to="/gerador?minutos=15" className="btn btn-primario btn-grande">
                Gerar treino rápido <Icone nome="raio" />
              </Link>
            )}
            <Link to="/treinos" className="link-forte">Ver treinos</Link>
            <Link to="/rotina" className="link-forte">Montar rotina</Link>
          </div>
        </div>
      </AberturaBola>

      <FraseRolagem texto="Ninguém começa arremessando de três. Primeiro vem a bola na mão, depois o arremesso colado à cesta, e só então a distância." />

      <section className="faixa-clara banda">
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

      <section className="faixa-preta banda">
        <div className="secao-topo">
          <h2 className="titulo-gigante">Treinos</h2>
          <p className="frase-destaque banda-texto">Três níveis, do primeiro quique à jogada de decisão. Cada exercício mostra o movimento.</p>
        </div>
        <div className="niveis-grade">
          {NIVEIS.map((n) => (
            <Link key={n.id} to={`/treinos?nivel=${n.id}`} className="nivel-cartao surge">
              {contagem(n.id) > 0 && <span className="rotulo-forte">{contagem(n.id)} exercícios</span>}
              <Figura nome={FIGURA_DO_NIVEL[n.id]} />
              <h3>{n.rotulo}</h3>
              <p>{n.foco}</p>
            </Link>
          ))}
        </div>
      </section>

      <EscadaRolagem nome="Escada de arremesso" rotulo="Role e veja o boneco se mexer" titulo={<>Aqueça<br />de perto<br />para longe</>} />

      {estilos.length > 0 && (
        <section className="faixa-escura">
          <NomesRolagem
            nomes={estilos.map((e) => e.nome)}
            titulo={<h2 className="titulo-gigante">Jogue como</h2>}
            texto={<p className="frase-destaque banda-texto">{estilos.length} jogadores. Escolha um e treine os movimentos que definem o jogo dele.</p>}
          />
          <div className="jogue-corpo">
            <GradeJogadores estilos={estilos} />
            <p className="meta aviso-estilos">
              O app não tem relação com os jogadores, com a NBA nem com os times. Fotos da Wikimedia Commons; os créditos estão na
              página de cada jogador.
            </p>
          </div>
        </section>
      )}

      <section className="faixa-clara banda">
        <div className="secao-topo">
          <h2 className="titulo-gigante">Rotina</h2>
          <Link to="/rotina" className="link-forte">Montar rotina</Link>
        </div>
        <div className="semana-grade">
          {ORDEM_SEMANA.map((d) => {
            const treinos = rotina.rotina[d].map(drills.drillPorId).filter((t): t is Drill => !!t)
            return (
              <article key={d} className={`semana-dia ${treinos.length ? '' : 'folga'} ${d === hoje ? 'hoje' : ''}`}>
                <h3>{DIAS[d].slice(0, 3)}</h3>
                {treinos.length ? (
                  <ul>{treinos.map((t, i) => <li key={`${t.id}-${i}`}>{t.nome}</li>)}</ul>
                ) : (
                  <span>Descanso</span>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section className="faixa-laranja banda com-listra" aria-busy={!resumo}>
        <ListraBola />
        <h2 className="titulo-gigante">Seus números</h2>
        {erroResumo && <p className="erro" role="alert">Não foi possível carregar seus números: {erroResumo.message}</p>}
        <div className="stats faixa">
          <Stat valor={valor(resumo?.sessoes)} rotulo="sessões nos últimos 7 dias" />
          <Stat valor={valor(resumo?.minutos)} rotulo="minutos treinados" />
          <Stat
            valor={resumo ? (pct === null ? '—' : `${pct}%`) : valor(undefined)}
            rotulo="aproveitamento nos arremessos"
            destaque
          />
        </div>
      </section>

      <section className="faixa-preta banda com-listra">
        <ListraBola />
        <h2 className="titulo-gigante">Ferramentas</h2>
        <div className="ferramentas-lista">
          {FERRAMENTAS.map((f) => (
            <Link key={f.to} to={f.to} className="ferramenta-linha surge">
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
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
