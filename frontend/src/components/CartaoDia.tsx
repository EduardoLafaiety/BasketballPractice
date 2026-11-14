import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { DIAS } from '../store'
import type { Categoria, DiaSemana, Drill } from '../types'
import { CATEGORIAS } from './FormExercicio'

const METRICA: Record<Drill['metrica'], string> = { acertos: 'Acertos', repeticoes: 'Repetições', tempo: 'Tempo' }

/** Quantos treinos de cada categoria, na ordem fixa das categorias (só as que aparecem). */
function mixDe(treinos: Drill[]): [Categoria, number][] {
  return CATEGORIAS.flatMap((c) => {
    const n = treinos.filter((t) => t.categoria === c).length
    return n ? [[c, n] as [Categoria, number]] : []
  })
}

/**
 * O cartão de um dia da semana, só para ler: o mesmo da página Rotina (sigla ao fundo, faixa do mix de categorias e
 * a trilha numerada dos treinos), sem arrastar, remover nem adicionar.
 */
export default function CartaoDia({ dia, treinos, hoje, posicao = 0 }: { dia: DiaSemana; treinos: Drill[]; hoje: boolean; posicao?: number }) {
  const mix = mixDe(treinos)
  let numero = 0
  return (
    <article style={{ '--i': posicao } as CSSProperties} className={`card dia ${hoje ? 'hoje' : ''} ${treinos.length ? '' : 'dia-folga'}`}>
      <span className="dia-sigla" aria-hidden>{DIAS[dia].slice(0, 3).toUpperCase()}</span>
      <div className="dia-topo">
        <h3>
          {DIAS[dia]}
          {hoje && <span className="dia-hoje">Hoje</span>}
        </h3>
        <span className="meta">{treinos.length ? `${treinos.length} ${treinos.length === 1 ? 'treino' : 'treinos'}` : 'Descanso'}</span>
      </div>
      <div className="dia-mix" aria-hidden title={mix.map(([c, n]) => `${c} ${n}`).join(' · ') || undefined}>
        {mix.map(([c, n]) => (
          <i key={c} className={`tag-${c}`} style={{ flexGrow: n }} />
        ))}
      </div>
      {treinos.length ? (
        <ol className="dia-lista rota">
          {treinos.map((t, i) => (
            <li key={`${t.id}-${i}`} className={`tag-${t.categoria} ${t.aquecimento ? 'rota-aq' : ''}`}>
              <span className="rota-no" aria-hidden>{t.aquecimento ? 'AQ' : ++numero}</span>
              <span className="rota-texto">
                <Link to={`/treinos/${t.id}`} className="rota-nome">{t.nome}</Link>
                <span className="rota-sub">{t.categoria} · {METRICA[t.metrica]}{t.aquecimento ? ' · aquecimento' : ''}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="dia-vazio">Dia de descanso. A quadra espera.</p>
      )}
    </article>
  )
}
