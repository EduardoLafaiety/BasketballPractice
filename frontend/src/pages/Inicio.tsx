import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { COR, POSICOES, REFEICOES } from '../alimentacao/dados'
import IconeRefeicao from '../alimentacao/icones'
import { ARTIGOS, CATEGORIAS, categoria, minutosDeLeitura } from '../artigos/dados'
import { api } from '../api'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import GradeJogadores from '../components/GradeJogadores'
import Icone from '../components/Icone'
import { AberturaBola, EscadaRolagem, Figura, FraseRolagem, ListraBola, NomesRolagem } from '../components/rolagem'
import { NIVEIS } from '../lib/niveis'
import { DIAS, ROTULO_METRICA, aproveitamento, diasAtras, useDrills, useResumo, useRotina } from '../store'
import type { DiaSemana, Drill, EstiloResumo, Nivel } from '../types'

const FIGURA_DO_NIVEL: Record<Nivel, string> = {
  iniciante: 'Drible sentado',
  intermediario: 'Entre as pernas em movimento',
  avancado: 'Finger roll',
}
const ORDEM_SEMANA: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]
// Um artigo de cada assunto que mais conversa com quem treina.
const ARTIGOS_EM_DESTAQUE = ['sono-e-arremesso', 'treino-deliberado', 'salto-vertical', 'cesto-de-pessego'].map((id) => ARTIGOS.find((a) => a.id === id)!)
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
  const [estilos, setEstilos] = useState<EstiloResumo[]>([])
  useEffect(() => {
    api.estilos().then(setEstilos, () => setEstilos([]))
  }, [])

  const hoje = new Date().getDay() as DiaSemana
  const treinosHoje = rotina.rotina[hoje].map(drills.drillPorId).filter((d): d is Drill => !!d)
  const contagem = (id: Nivel) => drills.drills.filter((d) => d.nivel === id && !d.aquecimento).length

  const pct = resumo ? aproveitamento(resumo.acertos, resumo.tentativas) : null
  const valor = (n: number | string | undefined) => (n === undefined ? (erroResumo ? '!' : '…') : n)

  const erroHoje = rotina.erro ?? drills.erro
  const prontoHoje = rotina.carregado && drills.carregado

  return (
    <div className="pagina-larga pagina-inicio">
      <AberturaBola
        titulo={
          <h1 className="abertura-titulo">
            <span className="abertura-a">Bora pra </span>
            <span className="abertura-b">quadra<span className="ponto">.</span></span>
          </h1>
        }
      />

      <FraseRolagem texto="Ninguém começa arremessando de três. Primeiro vem a bola na mão, depois o arremesso colado à cesta, e só então a distância." />

      <section className="faixa-clara banda">
        <div className="secao-topo secao-forte">
          <h2>Treino de hoje</h2>
          <div className="acoes">
            {prontoHoje && treinosHoje.length > 0 && (
              <Link to="/sessao?hoje" className="btn btn-primario">
                Começar treino de hoje <Icone nome="seta" />
              </Link>
            )}
            <Link to="/rotina" className="link-forte">Editar rotina</Link>
          </div>
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

      <section className="faixa-escura dieta-chamada" aria-labelledby="dieta-chamada-titulo">
        <div className="dieta-chamada-texto">
          <span className="rotulo-forte">Alimentação</span>
          <h2 id="dieta-chamada-titulo">Coma como quem joga</h2>
          <p className="muted">Café da manhã, almoço, café da tarde e janta para cada posição, com as quantidades em gramas.</p>
          <div className="dieta-chamada-icones" aria-hidden>
            {REFEICOES.map((r) => <IconeRefeicao key={r.id} refeicao={r.id} tamanho={34} />)}
          </div>
          <Link to="/alimentacao" className="link-forte">Ver alimentação</Link>
        </div>
        <div className="dieta-chamada-posicoes">
          {POSICOES.map((p) => (
            <Link key={p.id} to={`/alimentacao?aba=cardapio&posicao=${p.id}`} className="dieta-chamada-posicao" style={{ '--c': COR[p.id] } as CSSProperties}>
              <span className="dieta-chamada-numeros" aria-hidden>{p.numeros}</span>
              <span className="dieta-chamada-nome">
                <strong>{p.nome}</strong>
                <span className="meta">{p.titulo}</span>
              </span>
              <Icone nome="seta" />
            </Link>
          ))}
        </div>
      </section>

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

      <section className="faixa-clara artigos-chamada" aria-labelledby="artigos-chamada-titulo">
        <div className="artigos-chamada-texto">
          <span className="rotulo-forte">Artigos</span>
          <h2 id="artigos-chamada-titulo">Entenda o jogo</h2>
          <p className="muted">Leituras curtas sobre história, mentalidade, condicionamento, sono e recuperação, com o estudo por trás de cada ideia.</p>
          <div className="artigos-chamada-categorias">
            {CATEGORIAS.map((c) => (
              <Link key={c.id} to={`/artigos?categoria=${c.id}`} className="artigos-chamada-categoria" style={{ '--c': c.cor } as CSSProperties}>
                {c.nome}
              </Link>
            ))}
          </div>
          <Link to="/artigos" className="link-forte">Ver todos os artigos</Link>
        </div>
        <div className="artigos-chamada-lista">
          {ARTIGOS_EM_DESTAQUE.map((a) => {
            const cat = categoria(a.categoria)
            return (
              <Link key={a.id} to={`/artigos/${a.id}`} className="artigos-chamada-artigo" style={{ '--c': cat.cor } as CSSProperties}>
                <span className="artigos-chamada-nome">
                  <span className="tag">{cat.nome}</span>
                  <strong>{a.titulo}</strong>
                  <span className="meta">{minutosDeLeitura(a)} min de leitura</span>
                </span>
                <Icone nome="seta" />
              </Link>
            )
          })}
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
