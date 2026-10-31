import { useSearchParams } from 'react-router-dom'
import Calculadoras from '../ferramentas/Calculadoras'
import LancesLivres from '../ferramentas/LancesLivres'
import Metronomo from '../ferramentas/Metronomo'
import TimerIntervalos from '../ferramentas/TimerIntervalos'
import Icone, { type NomeIcone } from '../components/Icone'
import { useConfig } from '../store'

const ABAS: { id: 'timer' | 'arremessos' | 'metronomo' | 'video' | 'calculadoras'; rotulo: string; resumo: string; icone: NomeIcone; descricao: string }[] = [
  { id: 'timer', rotulo: 'Timer de intervalos', resumo: 'Trabalho e descanso', icone: 'relogio', descricao: 'Blocos de trabalho e descanso com aviso sonoro, para condicionamento e circuitos.' },
  { id: 'arremessos', rotulo: 'Contador de arremessos', resumo: 'Acertos e sequência', icone: 'metas', descricao: 'Acerto ou erro com um toque, com sequência e recorde da sessão.' },
  { id: 'metronomo', rotulo: 'Metrônomo de drible', resumo: 'Ritmo constante', icone: 'ritmo', descricao: 'Ritmo constante para treinar velocidade e controle de bola.' },
  { id: 'video', rotulo: 'Vídeo do arremesso', resumo: 'Em breve', icone: 'video', descricao: 'Em breve: grave, assista em câmera lenta e compare a mecânica lado a lado.' },
  { id: 'calculadoras', rotulo: 'Calculadoras', resumo: 'Aproveitamento e metas', icone: 'calculadora', descricao: 'FG%, eFG%, TS%, quanto falta para a meta e distâncias.' },
]

type Aba = (typeof ABAS)[number]['id']

// O timer e o metrônomo já são um painel próprio, e as calculadoras trazem os seus cartões.
const SEM_CARTAO: Aba[] = ['timer', 'metronomo', 'calculadoras']

// A ferramenta está em ferramentas/Video.tsx; para liberá-la, basta voltar a mostrá-la aqui.
function VideoIndisponivel() {
  return (
    <div className="ferramenta-em-breve" role="status">
      <h2 className="sem-margem">Ainda não disponível</h2>
      <p className="muted">O vídeo do arremesso ainda não pode ser usado. Estamos preparando esta ferramenta, e ela chega em uma próxima versão.</p>
    </div>
  )
}

export default function Ferramentas() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.find((a) => a.id === params.get('aba'))?.id ?? 'timer') as Aba
  const atual = ABAS.find((a) => a.id === aba)!
  const { config, salvar } = useConfig()

  return (
    <>
      <h1>Ferramentas</h1>
      <div className="niveis niveis-abas" role="tablist" aria-label="Ferramentas">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === aba}
            className={`nivel-opcao ${a.id === aba ? 'ativo' : ''}`}
            onClick={() => setParams({ aba: a.id }, { replace: true })}
          >
            <strong><Icone nome={a.icone} tamanho={16} />{a.rotulo}</strong>
            <span>{a.resumo}</span>
          </button>
        ))}
      </div>
      <p className="muted">{atual.descricao}</p>

      <section className={SEM_CARTAO.includes(aba) ? undefined : 'card'} role="tabpanel">
        {aba === 'timer' && <TimerIntervalos />}
        {aba === 'arremessos' && <LancesLivres />}
        {aba === 'metronomo' && (
          <Metronomo
            bpmInicial={config.metronomoBpm}
            aoSalvarBpm={(bpm) => void salvar({ ...config, metronomoBpm: bpm }).catch((e: Error) => window.alert(e.message))}
          />
        )}
        {aba === 'video' && <VideoIndisponivel />}
        {aba === 'calculadoras' && <Calculadoras />}
      </section>
    </>
  )
}
