import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import DrillCard from '../components/DrillCard'
import Icone from '../components/Icone'
import FormExercicio from '../components/FormExercicio'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import { NIVEIS } from '../lib/niveis'
import { ROTULO_METRICA, useDrills } from '../store'
import type { Categoria, Drill, Metrica, Nivel } from '../types'

const CATEGORIAS: Categoria[] = ['Arremesso', 'Drible', 'Passe', 'Finalização', 'Defesa', 'Condicionamento']
const METRICAS = Object.keys(ROTULO_METRICA) as Metrica[]

// Busca sem diferenciar maiúsculas nem acentos: "media" encontra "média".
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

// A posição do catálogo é a progressão do nível; exercícios do atleta ficam no fim.
const naOrdem = (a: Drill, b: Drill) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || 0

export default function Treinos() {
  const { drills, carregado, erro, recarregar, salvar } = useDrills()
  const navigate = useNavigate()
  const [criando, setCriando] = useState(false)
  const [categoria, setCategoria] = useState<Categoria | 'Todas'>('Todas')
  const [metrica, setMetrica] = useState<Metrica | 'Todas'>('Todas')
  const [busca, setBusca] = useState('')
  const [parametros, setParametros] = useSearchParams()
  const nivel = NIVEIS.find((n) => n.id === parametros.get('nivel')) ?? NIVEIS[0]
  const escolherNivel = (id: Nivel) => setParametros({ nivel: id }, { replace: true })

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim())
    return drills
      .filter(
        (d) =>
          (!d.nivel || d.nivel === nivel.id) &&
          (categoria === 'Todas' || d.categoria === categoria) &&
          (metrica === 'Todas' || d.metrica === metrica) &&
          (!termo || normalizar(`${d.nome} ${d.descricao}`).includes(termo)),
      )
      .sort(naOrdem)
  }, [drills, nivel.id, categoria, metrica, busca])
  const aquecimento = lista.filter((d) => d.aquecimento)
  const exercicios = lista.filter((d) => !d.aquecimento)
  const contagem = (id: Nivel) => drills.filter((d) => d.nivel === id && !d.aquecimento).length

  return (
    <>
      <div className="secao-topo">
        <h1>Treinos</h1>
        <div className="acoes">
          <Link to="/gerador" className="btn btn-primario"><Icone nome="raio" /> Gerar treino</Link>
          {!criando && <button className="btn" onClick={() => setCriando(true)}>+ Novo exercício</button>}
        </div>
      </div>
      <p className="muted">Biblioteca de exercícios para treinar sozinho.</p>

      {criando && (
        <FormExercicio
          aoCancelar={() => setCriando(false)}
          aoSalvar={async (dados) => {
            const novo = await salvar(dados)
            setCriando(false)
            navigate(`/treinos/${novo.id}`)
          }}
        />
      )}

      <div className="niveis" role="group" aria-label="Nível">
        {NIVEIS.map((n) => (
          <button key={n.id} className={`nivel-opcao ${n.id === nivel.id ? 'ativo' : ''}`} aria-pressed={n.id === nivel.id} onClick={() => escolherNivel(n.id)}>
            <strong>{n.rotulo}</strong>
            {carregado && contagem(n.id) > 0 && <span>{contagem(n.id)} exercícios</span>}
          </button>
        ))}
      </div>
      <p className="muted">{nivel.foco}</p>

      <div className="filtros">
        <input
          type="search"
          className="input"
          placeholder="Buscar treino…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="chips">
          {(['Todas', ...CATEGORIAS] as const).map((c) => (
            <button
              key={c}
              className={`chip ${categoria === c ? 'ativo' : ''}`}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          className="input select"
          value={metrica}
          onChange={(e) => setMetrica(e.target.value as Metrica | 'Todas')}
        >
          <option value="Todas">Qualquer registro</option>
          {METRICAS.map((m) => (
            <option key={m} value={m}>{ROTULO_METRICA[m]}</option>
          ))}
        </select>
      </div>

      {carregado && <AvisoDesatualizado erro={erro} tentarDeNovo={recarregar} />}
      {!carregado ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando treinos…" />
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
        <div className="vazio">Nenhum treino encontrado com esses filtros.</div>
      )}
    </>
  )
}
