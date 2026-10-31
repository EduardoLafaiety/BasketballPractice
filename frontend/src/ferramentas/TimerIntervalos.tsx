import { useEffect, useState } from 'react'
import { bipe, vibrar } from '../lib/audio'
import { useTelaLigada } from '../lib/telaLigada'

type Fase = 'preparar' | 'trabalho' | 'descanso' | 'fim'

const PRESETS = [
  { nome: 'HIIT 30/30', trabalho: 30, descanso: 30, rodadas: 10 },
  { nome: 'Tabata 20/10', trabalho: 20, descanso: 10, rodadas: 8 },
  { nome: 'Drible 45/15', trabalho: 45, descanso: 15, rodadas: 6 },
  { nome: 'Sprints 15/45', trabalho: 15, descanso: 45, rodadas: 8 },
]

const PREPARO = 5
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function TimerIntervalos() {
  const [trabalho, setTrabalho] = useState(30)
  const [descanso, setDescanso] = useState(30)
  const [rodadas, setRodadas] = useState(8)
  const [fase, setFase] = useState<Fase | null>(null)
  const [rodada, setRodada] = useState(1)
  const [restante, setRestante] = useState(0)
  const [pausado, setPausado] = useState(false)

  const ativo = fase !== null && fase !== 'fim'
  useTelaLigada(ativo && !pausado)

  useEffect(() => {
    if (!ativo || pausado) return
    const t = setInterval(() => setRestante((r) => r - 1), 1000)
    return () => clearInterval(t)
  }, [ativo, pausado])

  // Troca de fase quando o tempo acaba; bipes nos 3 últimos segundos.
  useEffect(() => {
    if (!ativo || pausado) return
    if (restante > 0 && restante <= 3) bipe(660, 100)
    if (restante > 0) return

    const ultima = rodada >= rodadas
    if (fase === 'trabalho' && ultima) {
      setFase('fim')
      bipe(784, 250, 0.4)
      setTimeout(() => bipe(1046, 500, 0.4), 280)
      vibrar([300, 100, 300])
    } else if (fase === 'trabalho' && descanso > 0) {
      setFase('descanso')
      setRestante(descanso)
      bipe(523, 400, 0.4)
      vibrar([100, 80, 100])
    } else {
      // Fim do preparo, do descanso ou de um trabalho sem descanso: começa a próxima rodada.
      if (fase !== 'preparar') setRodada((r) => r + 1)
      setFase('trabalho')
      setRestante(trabalho)
      bipe(1046, 400, 0.4)
      vibrar(300)
    }
  }, [restante, ativo, pausado, fase, rodada, rodadas, trabalho, descanso])

  function iniciar() {
    bipe(880, 60, 0.2) // libera o áudio com o toque do usuário
    setRodada(1)
    setPausado(false)
    setFase('preparar')
    setRestante(PREPARO)
  }

  const totalSeg = PREPARO + rodadas * trabalho + (rodadas - 1) * descanso

  if (fase) {
    return (
      <div className={`timer placar-preto timer-${fase}`}>
        <p className="timer-fase">
          {fase === 'preparar' ? 'Prepare-se' : fase === 'trabalho' ? 'Trabalho' : fase === 'descanso' ? 'Descanso' : 'Fim! 💪'}
        </p>
        {fase !== 'fim' && (
          <>
            <div className="timer-relogio">{fmt(Math.max(0, restante))}</div>
            <p className="meta">
              Rodada {rodada} de {rodadas}
            </p>
          </>
        )}
        <div className="acoes centro-flex">
          {fase !== 'fim' && (
            <button className="btn btn-primario" onClick={() => setPausado((p) => !p)}>
              {pausado ? 'Continuar' : 'Pausar'}
            </button>
          )}
          <button className="btn" onClick={() => setFase(null)}>
            {fase === 'fim' ? 'Voltar' : 'Encerrar'}
          </button>
          {fase === 'fim' && (
            <button className="btn btn-primario" onClick={iniciar}>
              Repetir
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ferramenta placar-preto">
      <div className="placar-tempo">
        <span className="meta">Duração total</span>
        <strong className="timer-relogio">{fmt(totalSeg)}</strong>
        <span className="meta">Com {PREPARO}s de preparo. A tela fica acesa durante o timer.</span>
      </div>
      <div className="chips">
        {PRESETS.map((p) => (
          <button
            key={p.nome}
            className="chip"
            onClick={() => {
              setTrabalho(p.trabalho)
              setDescanso(p.descanso)
              setRodadas(p.rodadas)
            }}
          >
            {p.nome}
          </button>
        ))}
      </div>
      <div className="placar-campos">
        <label>
          Trabalho (s)
          <input className="input" type="number" min={1} max={600} value={trabalho} onChange={(e) => setTrabalho(Math.max(1, Number(e.target.value)))} />
        </label>
        <label>
          Descanso (s)
          <input className="input" type="number" min={0} max={600} value={descanso} onChange={(e) => setDescanso(Math.max(0, Number(e.target.value)))} />
        </label>
        <label>
          Rodadas
          <input className="input" type="number" min={1} max={50} value={rodadas} onChange={(e) => setRodadas(Math.max(1, Number(e.target.value)))} />
        </label>
      </div>
      <button className="btn btn-primario btn-grande" onClick={iniciar}>
        Iniciar
      </button>
    </div>
  )
}
