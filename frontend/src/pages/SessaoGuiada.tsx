import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Contador, { useContador, zonasParaLista } from '../components/Contador'
import { Carregando, ErroCarga } from '../components/Estado'
import ComoFazer from '../demonstracoes/ComoFazer'
import type { DadosZonas } from '../components/Quadra'
import { bipe, vibrar } from '../lib/audio'
import { useTelaLigada } from '../lib/telaLigada'
import { DIAS, ROTULO_METRICA, useDrills, useRotina, useSessoes } from '../store'
import type { BlocoPlano, DiaSemana, Entrada } from '../types'

/** O que a página recebe pela navegação (gerador de treino) ou monta a partir da rotina (?hoje). */
export interface PlanoGuiado {
  titulo: string
  blocos: BlocoPlano[]
  workoutId?: number
}

const MINUTOS_PADRAO = 10

const relogio = (s: number) => `${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`

export default function SessaoGuiada() {
  const local = useLocation()
  const [params] = useSearchParams()
  const recebido = local.state as PlanoGuiado | null
  const rotina = useRotina()
  const drills = useDrills()
  const hoje = new Date().getDay() as DiaSemana

  // Sem plano recebido, usa o treino de hoje da rotina (10 min por exercício).
  const plano = useMemo<PlanoGuiado | null>(() => {
    if (recebido?.blocos?.length) return recebido
    if (params.get('hoje') === null || !rotina.carregado || !drills.carregado) return null
    const blocos = rotina.rotina[hoje].flatMap((id): BlocoPlano[] => {
      const d = drills.drillPorId(id)
      return d ? [{ drillId: d.id, nome: d.nome, categoria: d.categoria, metrica: d.metrica, minutos: MINUTOS_PADRAO }] : []
    })
    return { titulo: `Treino de ${DIAS[hoje].toLowerCase()}`, blocos }
  }, [recebido, params, rotina.carregado, rotina.rotina, drills.carregado, drills, hoje])

  if (!plano) {
    if (params.get('hoje') !== null) {
      const erro = rotina.erro ?? drills.erro
      if (!rotina.carregado || !drills.carregado)
        return erro ? <ErroCarga erro={erro} tentarDeNovo={() => { rotina.recarregar(); drills.recarregar() }} /> : <Carregando texto="Montando o treino de hoje…" />
    }
    return <SemPlano />
  }
  if (plano.blocos.length === 0) return <SemPlano hoje />
  return <Execucao plano={plano} />
}

function SemPlano({ hoje = false }: { hoje?: boolean }) {
  return (
    <>
      <h1>Sessão guiada</h1>
      <div className="vazio">
        {hoje ? 'Nenhum treino na rotina de hoje. ' : 'Escolha o que treinar primeiro. '}
        <Link to="/gerador" className="link">Gerar um treino</Link> ou{' '}
        <Link to="/rotina" className="link">montar a rotina</Link>.
      </div>
    </>
  )
}

function Execucao({ plano }: { plano: PlanoGuiado }) {
  const navigate = useNavigate()
  const { adicionar } = useSessoes()
  const { blocos } = plano
  const contador = useContador()

  const [indice, setIndice] = useState(-1) // -1 = antes de começar; blocos.length = fim
  const [restante, setRestante] = useState(0)
  const [decorrido, setDecorrido] = useState(0)
  const [rodando, setRodando] = useState(false)
  const [reps, setReps] = useState(0)
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [zonas, setZonas] = useState<DadosZonas>({})
  const [total, setTotal] = useState(0)
  const inicio = useRef<string>('')

  const emAndamento = indice >= 0 && indice < blocos.length
  const bloco = emAndamento ? blocos[indice] : null
  useTelaLigada(emAndamento)

  // Avisa antes de sair no meio da sessão (fechar aba, recarregar).
  useEffect(() => {
    if (!emAndamento) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [emAndamento])

  useEffect(() => {
    if (!rodando) return
    const t = setInterval(() => {
      setDecorrido((d) => d + 1)
      setTotal((d) => d + 1)
      setRestante((r) => r - 1)
    }, 1000)
    return () => clearInterval(t)
  }, [rodando])

  // Contagem regressiva sonora nos 3 últimos segundos e alarme no fim do bloco.
  useEffect(() => {
    if (!rodando) return
    if (restante > 0 && restante <= 3) bipe(660, 120)
    if (restante === 0) {
      bipe(990, 500, 0.4)
      vibrar([200, 100, 200])
    }
  }, [restante, rodando])

  function comecar(i: number) {
    if (!inicio.current) inicio.current = new Date().toISOString()
    setIndice(i)
    if (i < blocos.length) {
      setRestante(blocos[i].minutos * 60)
      setDecorrido(0)
      setReps(0)
      contador.zerar()
      contador.setZona(null)
      setRodando(true)
    } else {
      setRodando(false)
    }
  }

  function concluir(registrar: boolean) {
    if (!bloco) return
    if (registrar) {
      const entrada: Entrada = { drillId: bloco.drillId, drillNome: bloco.nome }
      if (bloco.metrica === 'acertos' && contador.tentativas > 0) {
        entrada.acertos = contador.acertos
        entrada.tentativas = contador.tentativas
        if (contador.melhorSequencia > 0) entrada.sequencia = contador.melhorSequencia
      }
      if (bloco.metrica === 'repeticoes' && reps > 0) entrada.repeticoes = reps
      if (bloco.metrica === 'tempo' && decorrido > 0) entrada.segundos = decorrido
      setEntradas((atual) => [...atual, entrada])
      setZonas((atual) => {
        const soma = { ...atual }
        for (const [z, v] of Object.entries(contador.zonas) as [keyof DadosZonas, { acertos: number; tentativas: number }][]) {
          const antes = soma[z] ?? { acertos: 0, tentativas: 0 }
          soma[z] = { acertos: antes.acertos + v.acertos, tentativas: antes.tentativas + v.tentativas }
        }
        return soma
      })
    }
    comecar(indice + 1)
  }

  if (indice === -1) {
    const minutos = blocos.reduce((t, b) => t + b.minutos, 0)
    return (
      <>
        <h1>{plano.titulo}</h1>
        <p className="muted">
          {blocos.length} exercícios · {minutos} min. O cronômetro avisa com bipes no fim de cada bloco e a tela fica acesa.
        </p>
        <ol className="plano">
          {blocos.map((b, i) => (
            <li key={`${b.drillId}-${i}`} className="card plano-item">
              <span className={`tag tag-${b.categoria}`}>{b.categoria}</span>
              <strong>{b.nome}</strong>
              <span className="meta">{b.minutos} min</span>
            </li>
          ))}
        </ol>
        <button className="btn btn-primario btn-grande" onClick={() => comecar(0)}>
          Começar
        </button>
      </>
    )
  }

  if (!bloco) return <Final plano={plano} entradas={entradas} zonas={zonas} segundos={total} inicio={inicio.current} salvar={adicionar} aoSalvar={() => navigate('/desempenho')} />

  const acabou = restante <= 0
  return (
    <div className="guiada">
      <div className="guiada-topo">
        <span className="meta">
          Exercício {indice + 1} de {blocos.length}
        </span>
        <div className="guiada-passos" aria-hidden>
          {blocos.map((_, i) => (
            <span key={i} className={i < indice ? 'feito' : i === indice ? 'atual' : ''} />
          ))}
        </div>
      </div>

      <span className={`tag tag-${bloco.categoria}`}>{bloco.categoria}</span>
      <h1 className="guiada-nome">{bloco.nome}</h1>
      <p className="meta">{ROTULO_METRICA[bloco.metrica]}</p>
      <ComoFazer key={indice} drillId={bloco.drillId} nome={bloco.nome} />

      <div className={`guiada-relogio ${acabou ? 'esgotado' : ''}`} aria-live="off">
        {acabou ? `+${relogio(-restante)}` : relogio(restante)}
      </div>
      {acabou && <p className="guiada-aviso" role="status">Tempo! Siga para o próximo quando terminar.</p>}

      <div className="acoes centro-flex">
        <button className="btn" onClick={() => setRodando((r) => !r)}>
          {rodando ? 'Pausar' : 'Continuar'}
        </button>
        <button className="btn" onClick={() => setRestante((r) => r + 60)}>+1 min</button>
      </div>

      {bloco.metrica === 'acertos' && (
        <div className="card guiada-registro">
          <Contador contador={contador} />
        </div>
      )}
      {bloco.metrica === 'repeticoes' && (
        <div className="card guiada-registro">
          <div className="contador-placar">
            <div>
              <strong>{reps}</strong>
              <span className="meta">repetições</span>
            </div>
          </div>
          <div className="contador-botoes">
            <button className="btn btn-acerto" onClick={() => setReps((r) => r + 1)}>+1</button>
            <button className="btn" onClick={() => setReps((r) => r + 5)}>+5</button>
            <button className="btn" onClick={() => setReps((r) => Math.max(0, r - 1))}>−1</button>
          </div>
        </div>
      )}

      <div className="acoes centro-flex guiada-acoes">
        <button className="btn btn-primario btn-grande" onClick={() => concluir(true)}>
          {indice + 1 === blocos.length ? 'Concluir treino' : 'Próximo exercício →'}
        </button>
        <button className="btn" onClick={() => concluir(false)}>Pular</button>
      </div>
    </div>
  )
}

function Final({
  plano,
  entradas,
  zonas,
  segundos,
  inicio,
  salvar,
  aoSalvar,
}: {
  plano: PlanoGuiado
  entradas: Entrada[]
  zonas: DadosZonas
  segundos: number
  inicio: string
  salvar: ReturnType<typeof useSessoes>['adicionar']
  aoSalvar: () => void
}) {
  const [esforco, setEsforco] = useState(3)
  const [cansaco, setCansaco] = useState(3)
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const minutos = Math.max(1, Math.round(segundos / 60))
  const acertos = entradas.reduce((t, e) => t + (e.acertos ?? 0), 0)
  const tentativas = entradas.reduce((t, e) => t + (e.tentativas ?? 0), 0)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await salvar({
        data: inicio || new Date().toISOString(),
        duracaoMin: minutos,
        esforco,
        cansaco,
        notas: [plano.titulo, notas.trim()].filter(Boolean).join(' — '),
        workoutId: plano.workoutId,
        entradas,
        zonas: zonasParaLista(zonas),
      })
      aoSalvar()
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <>
      <h1>Treino concluído<span className="ponto">.</span></h1>
      <section className="stats">
        <div className="card stat"><strong>{minutos}</strong><span className="muted">minutos</span></div>
        <div className="card stat"><strong>{entradas.length}</strong><span className="muted">exercícios feitos</span></div>
        <div className="card stat">
          <strong>{tentativas ? `${Math.round((acertos / tentativas) * 100)}%` : '—'}</strong>
          <span className="muted">aproveitamento ({acertos}/{tentativas})</span>
        </div>
      </section>
      <form className="card form form-solto" onSubmit={enviar}>
        <h3>Diário do treino</h3>
        <label>
          Esforço: {esforco}/5
          <input type="range" min={1} max={5} value={esforco} onChange={(e) => setEsforco(Number(e.target.value))} />
        </label>
        <label>
          Cansaço ao terminar: {cansaco}/5 <span className="meta">(1 = inteiro, 5 = exausto)</span>
          <input type="range" min={1} max={5} value={cansaco} onChange={(e) => setCansaco(Number(e.target.value))} />
        </label>
        <label>
          Notas
          <textarea className="input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Como se sentiu? Alguma dor?" />
        </label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn btn-primario" type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar sessão'}
        </button>
      </form>
    </>
  )
}
