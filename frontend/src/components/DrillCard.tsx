import { Link } from 'react-router-dom'
import { ROTULO_METRICA } from '../store'
import type { Drill } from '../types'

export default function DrillCard({ drill }: { drill: Drill }) {
  return (
    <Link to={`/treinos/${drill.id}`} className="card drill-card">
      <div className="drill-card-topo">
        <span className={`tag tag-${drill.categoria}`}>{drill.categoria}</span>
        {drill.personalizado && <span className="meta">Seu exercício</span>}
      </div>
      <h3>{drill.nome}</h3>
      <p className="muted">{drill.descricao}</p>
      <span className="nivel">{ROTULO_METRICA[drill.metrica]}</span>
    </Link>
  )
}
