import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DrillCard from '../components/DrillCard'
import FormExercicio from '../components/FormExercicio'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import { ROTULO_METRICA, useDrills } from '../store'
import type { Categoria, Metrica } from '../types'

const CATEGORIAS: Categoria[] = ['Arremesso', 'Drible', 'Passe', 'Finalização', 'Defesa', 'Condicionamento']
const METRICAS = Object.keys(ROTULO_METRICA) as Metrica[]

// Busca sem diferenciar maiúsculas nem acentos: "media" encontra "média".
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export default function Treinos() {
  const { drills, carregado, erro, recarregar, salvar } = useDrills()
  const navigate = useNavigate()
  const [criando, setCriando] = useState(false)
  const [categoria, setCategoria] = useState<Categoria | 'Todas'>('Todas')
  const [metrica, setMetrica] = useState<Metrica | 'Todas'>('Todas')
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim())
    return drills.filter(
      (d) =>
        (categoria === 'Todas' || d.categoria === categoria) &&
        (metrica === 'Todas' || d.metrica === metrica) &&
        (!termo || normalizar(`${d.nome} ${d.descricao}`).includes(termo)),
    )
  }, [drills, categoria, metrica, busca])

  return (
    <>
      <div className="secao-topo">
        <h1>Treinos</h1>
        <div className="acoes">
          <Link to="/gerador" className="btn btn-primario">⚡ Gerar treino</Link>
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
        <div className="grade">
          {lista.map((d) => (
            <DrillCard key={d.id} drill={d} />
          ))}
        </div>
      ) : (
        <div className="vazio">Nenhum treino encontrado com esses filtros.</div>
      )}
    </>
  )
}
