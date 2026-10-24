import { useEffect, useRef, useState } from 'react'
import { criarMetronomo } from '../lib/audio'
import { useTelaLigada } from '../lib/telaLigada'

/** Metrônomo de drible: ritmo constante para treinar velocidade de mão. */
export default function Metronomo({ bpmInicial, aoSalvarBpm }: { bpmInicial: number; aoSalvarBpm: (bpm: number) => void }) {
  const [bpm, setBpm] = useState(bpmInicial)
  const [compasso, setCompasso] = useState(4)
  const [tocando, setTocando] = useState(false)
  const [batida, setBatida] = useState(-1)
  const metronomo = useRef<ReturnType<typeof criarMetronomo> | null>(null)
  const toques = useRef<number[]>([])

  useTelaLigada(tocando)

  useEffect(() => {
    metronomo.current = criarMetronomo((n) => setBatida(n))
    return () => metronomo.current?.parar()
  }, [])

  useEffect(() => {
    metronomo.current?.definir(bpm, compasso)
  }, [bpm, compasso])

  // O padrão salvo chega depois que as configurações carregam.
  useEffect(() => setBpm(bpmInicial), [bpmInicial])

  function alternar() {
    if (tocando) metronomo.current?.parar()
    else metronomo.current?.iniciar()
    setTocando(!tocando)
    setBatida(-1)
  }

  // Tap tempo: média dos intervalos entre os últimos toques.
  function marcar() {
    const agora = performance.now()
    toques.current = [...toques.current.filter((t) => agora - t < 3000), agora].slice(-6)
    if (toques.current.length >= 2) {
      const intervalos = toques.current.slice(1).map((t, i) => t - toques.current[i])
      const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length
      setBpm(Math.min(240, Math.max(30, Math.round(60000 / media))))
    }
  }

  return (
    <div className="ferramenta metronomo">
      <div className="metronomo-luzes" aria-hidden>
        {Array.from({ length: compasso }, (_, i) => (
          <span key={i} className={tocando && batida >= 0 && batida % compasso === i ? (i === 0 ? 'acento' : 'ativa') : ''} />
        ))}
      </div>
      <div className="timer-relogio">{bpm}</div>
      <p className="meta centro">batidas por minuto · {(bpm / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dribles por segundo</p>
      <input type="range" min={30} max={240} value={bpm} aria-label="Batidas por minuto" onChange={(e) => setBpm(Number(e.target.value))} />
      <div className="acoes centro-flex">
        <button className="btn" onClick={() => setBpm((b) => Math.max(30, b - 5))}>−5</button>
        <button className="btn btn-primario btn-grande" onClick={alternar}>
          {tocando ? 'Parar' : 'Tocar'}
        </button>
        <button className="btn" onClick={() => setBpm((b) => Math.min(240, b + 5))}>+5</button>
      </div>
      <div className="acoes centro-flex">
        <button className="btn" onClick={marcar}>Tap tempo</button>
        <label className="form-inline">
          Acento a cada
          <select className="input select" value={compasso} onChange={(e) => setCompasso(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 8].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'batida' : 'batidas'}
              </option>
            ))}
          </select>
        </label>
        <button className="chip" onClick={() => aoSalvarBpm(bpm)} disabled={bpm === bpmInicial}>
          Salvar {bpm} como padrão
        </button>
      </div>
      <p className="meta">Dica: comece num ritmo em que não perde a bola e suba 5 bpm por semana.</p>
    </div>
  )
}
