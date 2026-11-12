import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import Calculadoras from '../ferramentas/Calculadoras'
import Prancheta from '../ferramentas/Prancheta'
import Quadras from '../ferramentas/Quadras'
import LancesLivres from '../ferramentas/LancesLivres'
import Metronomo from '../ferramentas/Metronomo'
import TimerIntervalos from '../ferramentas/TimerIntervalos'
import Icone, { type NomeIcone } from '../components/Icone'
import { useConfig } from '../store'

const ABAS: { id: 'timer' | 'arremessos' | 'metronomo' | 'prancheta' | 'quadras' | 'video' | 'calculadoras'; rotulo: string; resumo: string; icone: NomeIcone; descricao: string }[] = [
  { id: 'timer', rotulo: 'Timer de intervalos', resumo: 'Trabalho e descanso', icone: 'relogio', descricao: 'Blocos de trabalho e descanso com aviso sonoro, para condicionamento e circuitos.' },
  { id: 'arremessos', rotulo: 'Contador de arremessos', resumo: 'Acertos e sequência', icone: 'metas', descricao: 'Acerto ou erro com um toque, com sequência e recorde da sessão.' },
  { id: 'metronomo', rotulo: 'Metrônomo de drible', resumo: 'Ritmo constante', icone: 'ritmo', descricao: 'Ritmo constante para treinar velocidade e controle de bola.' },
  { id: 'prancheta', rotulo: 'Prancheta tática', resumo: 'Desenhe jogadas', icone: 'prancheta', descricao: 'Jogadores, bola, cortes, passes, dribles e bloqueios em meia quadra ou quadra inteira. Salve e abra as jogadas quando quiser.' },
  { id: 'quadras', rotulo: 'Quadras perto de você', resumo: 'Onde jogar', icone: 'mapa', descricao: 'Quadras públicas de basquete mapeadas no OpenStreetMap, com distância, piso e o caminho até lá.' },
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
    <div className="pagina-larga faixa-escura ferramentas-palco">
      <header className="ferr-cabeca">
        <p className="ferr-lema" aria-hidden>tudo para o seu <em>treino</em></p>
        <h1>Ferramentas</h1>
      </header>

      <div className="ferr-abas" role="tablist" aria-label="Ferramentas">
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === aba}
            className={`ferr-aba ${a.id === aba ? 'ativo' : ''}`}
            style={{ '--i': i } as CSSProperties}
            onClick={() => setParams({ aba: a.id }, { replace: true })}
          >
            <span className="ferr-aba-num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
            <Icone nome={a.icone} tamanho={16} />
            {a.rotulo}
            {a.id === 'video' && <span className="ferr-aba-selo">{a.resumo}</span>}
          </button>
        ))}
      </div>

      <p className="muted ferr-descricao">{atual.descricao}</p>

      <section className={`ferr-painel ${SEM_CARTAO.includes(aba) ? '' : 'card'}`} role="tabpanel">
        {aba === 'timer' && <TimerIntervalos />}
        {aba === 'arremessos' && <LancesLivres />}
        {aba === 'metronomo' && (
          <Metronomo
            bpmInicial={config.metronomoBpm}
            aoSalvarBpm={(bpm) => void salvar({ ...config, metronomoBpm: bpm }).catch((e: Error) => window.alert(e.message))}
          />
        )}
        {aba === 'prancheta' && <Prancheta />}
        {aba === 'quadras' && <Quadras />}
        {aba === 'video' && <VideoIndisponivel />}
        {aba === 'calculadoras' && <Calculadoras />}
      </section>
    </div>
  )
}
