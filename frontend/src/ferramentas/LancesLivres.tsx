import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Contador, { useContador, zonasParaLista } from '../components/Contador'
import { useTelaLigada } from '../lib/telaLigada'
import { useDrills, useSessoes } from '../store'

/** Contador rápido de arremessos com sequência e recorde, salvo como sessão de um exercício de arremesso. */
export default function LancesLivres() {
  const contador = useContador()
  const { drills } = useDrills()
  const { adicionar } = useSessoes()
  const navigate = useNavigate()
  const arremessos = useMemo(() => drills.filter((d) => d.metrica === 'acertos'), [drills])
  const [drillId, setDrillId] = useState('')
  const [inicio, setInicio] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useTelaLigada(contador.tentativas > 0)

  // Padrão: o exercício "Lance livre" do catálogo.
  useEffect(() => {
    if (!drillId && arremessos.length) setDrillId((arremessos.find((d) => d.nome === 'Lance livre') ?? arremessos[0]).id)
  }, [arremessos, drillId])

  useEffect(() => {
    if (contador.tentativas === 1 && inicio === null) setInicio(Date.now())
    if (contador.tentativas === 0) setInicio(null)
  }, [contador.tentativas, inicio])

  async function salvar() {
    if (!drillId || !contador.tentativas) return
    setSalvando(true)
    setErro(null)
    try {
      const minutos = inicio ? Math.max(1, Math.round((Date.now() - inicio) / 60000)) : 1
      await adicionar({
        data: new Date(inicio ?? Date.now()).toISOString(),
        duracaoMin: minutos,
        entradas: [
          {
            drillId,
            acertos: contador.acertos,
            tentativas: contador.tentativas,
            sequencia: contador.melhorSequencia || undefined,
          },
        ],
        zonas: zonasParaLista(contador.zonas),
      })
      navigate('/desempenho')
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <div className="ferramenta">
      <label className="form-inline">
        Exercício
        <select className="input select" value={drillId} onChange={(e) => setDrillId(e.target.value)}>
          {arremessos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
      </label>
      <Contador contador={contador} />
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-primario" onClick={salvar} disabled={!contador.tentativas || !drillId || salvando}>
        {salvando ? 'Salvando…' : 'Salvar como sessão'}
      </button>
    </div>
  )
}
