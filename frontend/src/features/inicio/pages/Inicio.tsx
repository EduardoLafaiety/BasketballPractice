import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../shared/api/backend'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../../../shared/ui/Estado'
import GradeJogadores from '../../estilos/components/GradeJogadores'
import Icone from '../../../shared/ui/Icone'
import { AberturaBola, EscadaRolagem, Figura, FraseRolagem, NomesRolagem } from '../components/rolagem'
import { corDoJogador } from '../../estilos/lib/cor-do-time'
import { NIVEIS } from '../../../shared/lib/niveis'
import { ROTULO_METRICA } from '../../../shared/lib/formatacao'
import { useDrills } from '../../treinos/model/usarExercicios'
import { useRotina } from '../../rotina/model/usarRotina'
import type { DiaSemana, Drill, EstiloResumo, Nivel } from '../../../shared/types'

const FIGURA_DO_NIVEL: Record<Nivel, string> = {
  iniciante: 'Drible sentado',
  intermediario: 'Entre as pernas em movimento',
  avancado: 'Finger roll',
}

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
      <AberturaBola
        titulo={
          <h1 className="abertura-titulo">
            <span className="abertura-a">Bora pra </span>
            <span className="abertura-b">quadra<span className="ponto">.</span></span>
          </h1>
        }
      >
        <section className="treino-hoje" aria-labelledby="treino-hoje-titulo">
          <div className="hoje-frente">
            <h2 id="treino-hoje-titulo">Treine no seu ritmo. Evolua a cada jogada.</h2>
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
      </AberturaBola>

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
          />
          <div className="jogue-corpo">
            <GradeJogadores estilos={estilos} />
          </div>
        </section>
      )}

    </div>
  )
}
