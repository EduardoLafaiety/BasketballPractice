import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { COR, POSICOES, REFEICOES } from '../alimentacao/dados'
import IconeRefeicao from '../alimentacao/icones'
import { api } from '../api'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import GradeJogadores from '../components/GradeJogadores'
import Icone from '../components/Icone'
import { AberturaBola, EscadaRolagem, Figura, FraseRolagem, NomesRolagem } from '../components/rolagem'
import { corDoJogador } from '../lib/cor-do-time'
import { NIVEIS } from '../lib/niveis'
import { DIAS, ROTULO_METRICA, useDrills, useRotina } from '../store'
import type { DiaSemana, Drill, EstiloResumo, Nivel } from '../types'

const FIGURA_DO_NIVEL: Record<Nivel, string> = {
  iniciante: 'Drible sentado',
  intermediario: 'Entre as pernas em movimento',
  avancado: 'Finger roll',
}
const ORDEM_SEMANA: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]

// Onde cada posição joga na meia quadra do convite da Alimentação.
const JOGADORES_QUADRA = [
  { posicao: 'pivo', x: 200, y: 82 },
  { posicao: 'ala', x: 98, y: 150 },
  { posicao: 'ala', x: 302, y: 150 },
  { posicao: 'armador', x: 150, y: 232 },
  { posicao: 'armador', x: 250, y: 232 },
] as const

export default function Inicio() {
  const rotina = useRotina()
  const drills = useDrills()
  const [estilos, setEstilos] = useState<EstiloResumo[]>([])
  useEffect(() => {
    api.estilos().then(setEstilos, () => setEstilos([]))
  }, [])

  const hoje = new Date().getDay() as DiaSemana
  const treinosHoje = rotina.rotina[hoje].map(drills.drillPorId).filter((d): d is Drill => !!d)
  const contagem = (id: Nivel) => drills.drills.filter((d) => d.nivel === id && !d.aquecimento).length


  const erroHoje = rotina.erro ?? drills.erro
  const prontoHoje = rotina.carregado && drills.carregado

  return (
    <div className="pagina-larga pagina-inicio">
      <section className="faixa-clara banda treino-hoje">
        <div className="hoje-frente">
          <h2>Treino de hoje</h2>
          {prontoHoje && treinosHoje.length > 0 && (
            <Link to="/sessao?hoje" className="btn btn-primario">
              Começar treino de hoje <Icone nome="seta" />
            </Link>
          )}
        </div>
        {prontoHoje && (
          <AvisoDesatualizado erro={erroHoje} tentarDeNovo={() => { rotina.recarregar(); drills.recarregar() }} />
        )}
        {!prontoHoje ? (
          erroHoje ? (
            <ErroCarga erro={erroHoje} tentarDeNovo={() => { rotina.recarregar(); drills.recarregar() }} />
          ) : (
            <Carregando texto="Carregando treino de hoje" />
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
          <div className="hoje-descanso">
            <p className="frase-destaque">Hoje é dia de descanso. Músculo cresce na folga.</p>
            <div className="hoje-descanso-acoes">
              <Link to="/rotina" className="btn btn-primario">Montar a rotina <Icone nome="seta" /></Link>
              <Link to="/treinos" className="btn">Treinar mesmo assim</Link>
            </div>
          </div>
        )}
        <div className="hoje-rodape">
          <Link to="/rotina" className="link-forte">Editar rotina</Link>
        </div>
      </section>

      <AberturaBola
        titulo={
          <h1 className="abertura-titulo">
            <span className="abertura-a">Bora pra </span>
            <span className="abertura-b">quadra<span className="ponto">.</span></span>
          </h1>
        }
      />

      <FraseRolagem texto="Ninguém começa arremessando de três. Primeiro vem a bola na mão, depois o arremesso colado à cesta, e só então a distância." />

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
            nomes={estilos.map((e) => ({ nome: e.nome, cor: corDoJogador(e.id) }))}
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
            {REFEICOES.map((r) => <IconeRefeicao key={r.id} refeicao={r.id} tamanho={46} />)}
          </div>
          <div className="dieta-chamada-legenda">
            {POSICOES.map((p) => (
              <Link key={p.id} to={`/alimentacao?aba=cardapio&posicao=${p.id}`} style={{ '--c': COR[p.id] } as CSSProperties}>
                <i aria-hidden />
                <strong>{p.nome}</strong>
                <span className="meta">{p.titulo}</span>
              </Link>
            ))}
          </div>
          <Link to="/alimentacao" className="link-forte">Ver alimentação</Link>
        </div>
        <svg className="dieta-quadra" viewBox="0 0 400 300" aria-hidden>
          <rect className="linha" x="10" y="10" width="380" height="280" rx="4" />
          <rect className="linha" x="140" y="10" width="120" height="130" />
          <path className="linha" d="M140 140a60 60 0 0 0 120 0" />
          <path className="linha" d="M50 10v70a150 150 0 0 0 300 0V10" />
          <circle className="linha" cx="200" cy="34" r="9" />
          {JOGADORES_QUADRA.map((j) => {
            const p = POSICOES.find((x) => x.id === j.posicao)
            return (
              <g key={`${j.posicao}-${j.x}`} className="dieta-quadra-no" style={{ '--c': COR[j.posicao] } as CSSProperties}>
                <circle cx={j.x} cy={j.y} r="24" />
                <text x={j.x} y={j.y}>{p?.numeros}</text>
              </g>
            )
          })}
        </svg>
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
    </div>
  )
}
