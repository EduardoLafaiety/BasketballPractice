import { Link } from '../../../shared/i18n/links'

import { ROTULO_METRICA } from '../../../shared/lib/formatacao'
import type { Drill } from '../../../shared/types'

export default function DrillCard({ drill, passo }: { drill: Drill; passo?: number }) {
  return (
    <Link to={`/treinos/${drill.id}`} className="card drill-card">
      <div className="drill-card-topo">
        <span className={`tag tag-${drill.categoria}`}>{drill.categoria}</span>
        {drill.personalizado && <span className="meta">Seu exercício</span>}
        {passo !== undefined && <span className="meta">Passo {passo}</span>}
      </div>
      <h3 translate={drill.personalizado ? 'no' : undefined}>{drill.nome}</h3>
      <p className="muted" translate={drill.personalizado ? 'no' : undefined}>{drill.descricao}</p>
      <span className="nivel">{ROTULO_METRICA[drill.metrica]}</span>
    </Link>
  )
}
