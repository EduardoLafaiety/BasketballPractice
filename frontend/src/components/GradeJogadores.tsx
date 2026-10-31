import { Link } from 'react-router-dom'
import type { EstiloResumo, FatiaEstilo } from '../types'
import FotoJogador from './FotoJogador'
import Icone from './Icone'

/** Barra fina com a divisão do treino por categoria, nas cores das categorias. */
export function BarraDivisao({ divisao }: { divisao: FatiaEstilo[] }) {
  return (
    <div className="barra-divisao" aria-hidden>
      {divisao.map((f) => (
        <span key={f.categoria} className={`tag-${f.categoria}`} style={{ flexGrow: f.porcentagem }} />
      ))}
    </div>
  )
}

export default function GradeJogadores({ estilos }: { estilos: EstiloResumo[] }) {
  return (
    <div className="grade grade-jogadores">
      {estilos.map((e) => (
        <Link key={e.id} to={`/jogue-como/${e.id}`} className="card cartao-jogador">
          <FotoJogador id={e.id} nome={e.nome} categoria={e.divisao[0]?.categoria} />
          <div className="cartao-jogador-info">
            <span className="tag">{e.posicao}</span>
            <h3>{e.nome}</h3>
            <p className="muted">{e.arquetipo}</p>
            <BarraDivisao divisao={e.divisao} />
            <span className="cartao-jogador-rodape">
              {e.totalMovimentos} movimentos · {e.minutos} min
              <Icone nome="seta" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
