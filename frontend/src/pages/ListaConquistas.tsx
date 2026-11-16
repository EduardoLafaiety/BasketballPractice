import { useState } from 'react'
import BarraProgresso from '../components/BarraProgresso'
import Icone, { type NomeIcone } from '../components/Icone'
import type { Conquista } from '../types'

// A lista de conquistas, no estilo da Steam: um ícone grande, o nome, a descrição e o estado de cada uma.

/** Ícone de cada conquista, pelo que ela mede; as que não estão aqui usam a medalha. Trancada, aparece o cadeado. */
export const ICONE_CONQUISTA: Record<string, NomeIcone> = {
  'primeira-sessao': 'estrela',
  '10-sessoes': 'rotina',
  '50-sessoes': 'mapa',
  '100-sessoes': 'coroa',
  '3-dias': 'raio',
  '7-dias': 'diamante',
  '30-dias': 'foguete',
  '10-horas': 'relogio',
  '100-num-dia': 'fogo',
  '1000-cestas': 'bola',
  'sequencia-10': 'floco',
  'sequencia-25': 'metas',
  'teste-fisico': 'frasco',
}

type Filtro = 'todas' | 'desbloqueadas' | 'bloqueadas'
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'desbloqueadas', rotulo: 'Desbloqueadas' },
  { id: 'bloqueadas', rotulo: 'Bloqueadas' },
]

/** Desbloqueadas primeiro, na ordem do catálogo; depois as bloqueadas, das mais perto de sair para as mais longe. */
export function ordenarConquistas(lista: Conquista[]) {
  const razao = (c: Conquista) => c.progresso / c.alvo
  const feitas = lista.filter((c) => c.desbloqueada)
  const faltam = lista.filter((c) => !c.desbloqueada).sort((x, y) => razao(y) - razao(x))
  return [...feitas, ...faltam]
}

export default function ListaConquistas({ conquistas }: { conquistas: Conquista[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const total = conquistas.length
  const feitas = conquistas.filter((c) => c.desbloqueada).length
  const pct = total ? Math.round((feitas / total) * 100) : 0
  const contagem: Record<Filtro, number> = { todas: total, desbloqueadas: feitas, bloqueadas: total - feitas }
  const visiveis = ordenarConquistas(conquistas).filter((c) => filtro === 'todas' || (filtro === 'desbloqueadas') === c.desbloqueada)

  return (
    <section aria-labelledby="titulo-conquistas">
      <div className="conquistas-resumo card">
        <span className="conquistas-trofeu" aria-hidden>
          <Icone nome="trofeu" tamanho={34} />
        </span>
        <div>
          <h2 id="titulo-conquistas">Conquistas</h2>
          <p className="muted">
            <strong>{feitas}</strong> de <strong>{total}</strong> desbloqueadas ({pct}%)
          </p>
          <BarraProgresso valor={feitas} alvo={Math.max(1, total)} rotulo="Conquistas desbloqueadas" />
        </div>
      </div>

      <div className="chips" role="group" aria-label="Mostrar conquistas">
        {FILTROS.map((f) => (
          <button key={f.id} className={`chip ${filtro === f.id ? 'ativo' : ''}`} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.rotulo} ({contagem[f.id]})
          </button>
        ))}
      </div>

      <ul className="conquistas">
        {visiveis.map((c) => (
          <li key={c.id} className={`conquista ${c.desbloqueada ? 'desbloqueada' : ''}`}>
            <span className="conquista-icone">
              <Icone nome={c.desbloqueada ? (ICONE_CONQUISTA[c.id] ?? 'medalha') : 'cadeado'} tamanho={34} />
            </span>
            <div className="conquista-texto">
              <strong>{c.titulo}</strong>
              <span className="conquista-descricao">{c.descricao}</span>
              {!c.desbloqueada && <BarraProgresso valor={c.progresso} alvo={c.alvo} rotulo={`Progresso: ${c.titulo}`} />}
            </div>
            <span className="conquista-estado">
              {c.desbloqueada ? (
                <>
                  <Icone nome="check" tamanho={14} />
                  Desbloqueada
                </>
              ) : (
                <span className="conquista-contagem">
                  {c.progresso.toLocaleString('pt-BR')}/{c.alvo.toLocaleString('pt-BR')}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
