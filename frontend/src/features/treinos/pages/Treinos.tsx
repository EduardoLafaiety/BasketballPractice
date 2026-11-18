import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DrillCard from '../components/DrillCard'
import { CATEGORIAS } from '../components/FormExercicio'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../../../shared/ui/Estado'
import { NIVEIS } from '../../../shared/lib/niveis'
import { useDrills } from '../model/usarExercicios'
import type { Drill, Nivel } from '../../../shared/types'

// A posição do catálogo é a progressão do nível; exercícios do atleta ficam no fim.
const naOrdem = (a: Drill, b: Drill) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || 0
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()

export default function Treinos() {
  const { drills, carregado, erro, recarregar } = useDrills()
  const [parametros, setParametros] = useSearchParams()
  const nivel = NIVEIS.find((n) => n.id === parametros.get('nivel')) ?? NIVEIS[0]
  const atualizarFiltro = (chave: string, valor: string) => setParametros((atuais) => {
    const novos = new URLSearchParams(atuais)
    if (valor) novos.set(chave, valor)
    else novos.delete(chave)
    return novos
  }, { replace: true })
  const escolherNivel = (id: Nivel) => atualizarFiltro('nivel', id)
  const busca = parametros.get('busca') ?? ''
  const fundamento = parametros.get('fundamento') ?? ''

  const lista = useMemo(() => drills.filter((d) => (!d.nivel || d.nivel === nivel.id)
    && (!fundamento || normalizar(d.categoria) === normalizar(fundamento))
    && normalizar(d.nome).includes(normalizar(busca))).sort(naOrdem), [drills, nivel.id, fundamento, busca])
  const aquecimento = lista.filter((d) => d.aquecimento)
  const exercicios = lista.filter((d) => !d.aquecimento)
  const contagem = (id: Nivel) => drills.filter((d) => d.nivel === id && !d.aquecimento).length

  return (
    <div className="treinos">
      <h1>Treinos</h1>
      <p className="muted">Biblioteca de exercícios para treinar sozinho.</p>
      <div className="acoes-principais"><Link className="btn btn-primario" to="/rotina">Montar minha rotina</Link></div>

      <div className="niveis" role="group" aria-label="Nível">
        {NIVEIS.map((n) => (
          <button key={n.id} className={`nivel-opcao ${n.id === nivel.id ? 'ativo' : ''}`} aria-pressed={n.id === nivel.id} onClick={() => escolherNivel(n.id)}>
            <strong>{n.rotulo}</strong>
            {carregado && contagem(n.id) > 0 && <span>{contagem(n.id)} exercícios</span>}
          </button>
        ))}
      </div>
      <p className="muted">{nivel.foco}</p>
      <div className="treinos-filtros" role="search" aria-label="Buscar exercícios">
        <label>Buscar pelo nome
          <input className="input" type="search" placeholder="Ex.: bandeja, crossover…" value={busca} onChange={(e) => atualizarFiltro('busca', e.target.value)} />
        </label>
        <label>Fundamento
          <select className="input" value={fundamento} onChange={(e) => atualizarFiltro('fundamento', e.target.value)}>
            <option value="">Todos os fundamentos</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {(busca || fundamento) && <button className="btn" onClick={() => setParametros({ nivel: nivel.id }, { replace: true })}>Limpar filtros</button>}
      </div>
      {carregado && <p className="treinos-contagem" role="status">{lista.length} {lista.length === 1 ? 'exercício encontrado' : 'exercícios encontrados'}</p>}

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
          <div className="vazio">Nenhum treino encontrado. Experimente outro nome ou fundamento.</div>
        )}
      </div>
    </div>
  )
}
