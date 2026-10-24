import { useSearchParams } from 'react-router-dom'
import Calculadoras from '../ferramentas/Calculadoras'
import LancesLivres from '../ferramentas/LancesLivres'
import Metronomo from '../ferramentas/Metronomo'
import TimerIntervalos from '../ferramentas/TimerIntervalos'
import Video from '../ferramentas/Video'
import { useConfig } from '../store'

const ABAS = [
  { id: 'timer', rotulo: '⏱ Timer de intervalos', descricao: 'Blocos de trabalho e descanso com aviso sonoro, para condicionamento e circuitos.' },
  { id: 'arremessos', rotulo: '🎯 Contador de arremessos', descricao: 'Acerto ou erro com um toque, com sequência e recorde da sessão.' },
  { id: 'metronomo', rotulo: '🥁 Metrônomo de drible', descricao: 'Ritmo constante para treinar velocidade e controle de bola.' },
  { id: 'video', rotulo: '🎥 Vídeo do arremesso', descricao: 'Grave, assista em câmera lenta e compare a mecânica lado a lado.' },
  { id: 'calculadoras', rotulo: '🧮 Calculadoras', descricao: 'FG%, eFG%, TS%, quanto falta para a meta e distâncias.' },
] as const

type Aba = (typeof ABAS)[number]['id']

export default function Ferramentas() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.find((a) => a.id === params.get('aba'))?.id ?? 'timer') as Aba
  const atual = ABAS.find((a) => a.id === aba)!
  const { config, salvar } = useConfig()

  return (
    <>
      <h1>Ferramentas</h1>
      <div className="abas" role="tablist" aria-label="Ferramentas">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === aba}
            className={`chip ${a.id === aba ? 'ativo' : ''}`}
            onClick={() => setParams({ aba: a.id }, { replace: true })}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <p className="muted">{atual.descricao}</p>

      <section className="card" role="tabpanel">
        {aba === 'timer' && <TimerIntervalos />}
        {aba === 'arremessos' && <LancesLivres />}
        {aba === 'metronomo' && (
          <Metronomo
            bpmInicial={config.metronomoBpm}
            aoSalvarBpm={(bpm) => void salvar({ ...config, metronomoBpm: bpm }).catch((e: Error) => window.alert(e.message))}
          />
        )}
        {aba === 'video' && <Video />}
        {aba === 'calculadoras' && <Calculadoras />}
      </section>
    </>
  )
}
