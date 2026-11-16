import { useEffect, useRef, type CSSProperties } from 'react'
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
  const posicao = ABAS.indexOf(atual) + 1
  const dois = (n: number) => String(n).padStart(2, '0')

  // No celular o inventário rola de lado: o espaço escolhido vem para a vista, sem mexer na rolagem da página.
  const lista = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const escolhida = lista.current?.querySelector<HTMLElement>('.ferr-aba.ativo')
    if (!escolhida) return
    const suave = document.documentElement.dataset.movimento !== 'reduzido'
    lista.current?.scrollTo?.({ left: escolhida.offsetLeft - 20, behavior: suave ? 'smooth' : 'auto' })
  }, [aba])

  return (
    <div className="pagina-larga faixa-escura ferramentas-palco">
      <header className="ferr-cabeca">
        <p className="ferr-lema" aria-hidden>tudo para o seu <em>treino</em></p>
        <h1>Ferramentas</h1>
      </header>

      {/* A escolha é um inventário de jogo: um espaço por ferramenta, e o escolhido fica aceso. */}
      <div className="ferr-abas" role="tablist" aria-label="Ferramentas" ref={lista}>
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            id={`ferr-aba-${a.id}`}
            role="tab"
            aria-selected={a.id === aba}
            aria-controls="ferr-painel"
            className={`ferr-aba ${a.id === aba ? 'ativo' : ''}`}
            style={{ '--i': i } as CSSProperties}
            onClick={() => setParams({ aba: a.id }, { replace: true })}
          >
            <span className="ferr-aba-num" aria-hidden>{dois(i + 1)}</span>
            <span className="ferr-aba-icone" aria-hidden><Icone nome={a.icone} tamanho={24} /></span>
            <span className="ferr-aba-nome">{a.rotulo}</span>
            <span className={a.id === 'video' ? 'ferr-aba-selo' : 'ferr-aba-resumo'}>{a.resumo}</span>
          </button>
        ))}
      </div>

      {/* A ferramenta abre numa janela: a barra de cima diz qual é, e o painel embaixo é ela. */}
      <section className="ferr-janela" key={aba}>
        <header className="ferr-janela-topo">
          <span className="ferr-janela-icone" aria-hidden><Icone nome={atual.icone} tamanho={34} /></span>
          <div className="ferr-janela-texto">
            <strong>{atual.rotulo}</strong>
            <p className="ferr-descricao">{atual.descricao}</p>
          </div>
          <span className="ferr-janela-conta" role="img" aria-label={`Ferramenta ${posicao} de ${ABAS.length}`}>
            {dois(posicao)}<small>/{dois(ABAS.length)}</small>
          </span>
        </header>

        <div id="ferr-painel" className={`ferr-painel ${SEM_CARTAO.includes(aba) ? '' : 'card'}`} role="tabpanel" aria-labelledby={`ferr-aba-${aba}`}>
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
        </div>
      </section>
    </div>
  )
}
