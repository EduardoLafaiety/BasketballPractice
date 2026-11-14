import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import DrillCard from '../components/DrillCard'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import { NIVEIS } from '../lib/niveis'
import { useDrills } from '../store'
import type { Drill, Nivel } from '../types'

// A posição do catálogo é a progressão do nível; exercícios do atleta ficam no fim.
const naOrdem = (a: Drill, b: Drill) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || 0

export default function Treinos() {
  const { drills, carregado, erro, recarregar } = useDrills()
  const [parametros, setParametros] = useSearchParams()
  const nivel = NIVEIS.find((n) => n.id === parametros.get('nivel')) ?? NIVEIS[0]
  const escolherNivel = (id: Nivel) => setParametros({ nivel: id }, { replace: true })

  const lista = useMemo(() => drills.filter((d) => !d.nivel || d.nivel === nivel.id).sort(naOrdem), [drills, nivel.id])
  const aquecimento = lista.filter((d) => d.aquecimento)
  const exercicios = lista.filter((d) => !d.aquecimento)
  const contagem = (id: Nivel) => drills.filter((d) => d.nivel === id && !d.aquecimento).length

  return (
    <div className="treinos">
      <h1>Treinos</h1>
      <p className="muted">Biblioteca de exercícios para treinar sozinho.</p>

      <div className="niveis" role="group" aria-label="Nível">
        {NIVEIS.map((n) => (
          <button key={n.id} className={`nivel-opcao ${n.id === nivel.id ? 'ativo' : ''}`} aria-pressed={n.id === nivel.id} onClick={() => escolherNivel(n.id)}>
            <strong>{n.rotulo}</strong>
            {carregado && contagem(n.id) > 0 && <span>{contagem(n.id)} exercícios</span>}
          </button>
        ))}
      </div>
      <p className="muted">{nivel.foco}</p>

      <div className="treinos-lista">
        {carregado && <AvisoDesatualizado erro={erro} tentarDeNovo={recarregar} />}
        {!carregado ? (
          erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando treinos" />
        ) : lista.length > 0 ? (
          <>
            {aquecimento.length > 0 && (
              <section aria-label="Aquecimento">
                <h2>Aquecimento</h2>
                <p className="muted">Comece por aqui, nesta ordem: do geral ao específico e, no arremesso, de perto para longe da cesta.</p>
                <div className="grade">
                  {aquecimento.map((d, i) => (
                    <DrillCard key={d.id} drill={d} passo={i + 1} />
                  ))}
                </div>
              </section>
            )}
            {exercicios.length > 0 && (
              <section aria-label="Exercícios">
                {aquecimento.length > 0 && <h2>Exercícios</h2>}
                <div className="grade">
                  {exercicios.map((d) => (
                    <DrillCard key={d.id} drill={d} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="vazio">Nenhum treino encontrado neste nível.</div>
        )}
      </div>
    </div>
  )
}
