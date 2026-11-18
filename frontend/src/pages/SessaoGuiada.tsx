import { segundosPassados } from '../lib/relogio'
import { ApiError, contaLocal } from '../api'
import { useAuth } from '../auth'
import { enfileirar, gravarLocal, lerLocal, removerLocal } from '../lib/treino-local'
import type { Toque } from '../components/Contador'
import type { Zona } from '../types'
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
  /** Dia de um programa: ao salvar a sessão, o dia é marcado como feito. */
  programa?: { id: string; dia: number }
}

const MINUTOS_PADRAO = 10

const relogio = (s: number) => `${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`

interface Rascunho {
  plano: PlanoGuiado; clientId: string; indice: number; restante: number; decorrido: number
  reps: number; entradas: Entrada[]; zonas: DadosZonas; total: number; inicio: string
  toques: Toque[]; zona: Zona | null; diario: { esforco: number; cansaco: number; notas: string }
}

export default function SessaoGuiada() {
  const { usuario } = useAuth()
  // O sub identifica a conta mesmo quando /auth/me está indisponível durante a reabertura offline.
  const conta = String(usuario?.id ?? contaLocal() ?? 'visitante')
  return <SessaoDaConta key={conta} conta={conta} />
}

function SessaoDaConta({ conta }: { conta: string }) {
  const [rascunho, setRascunho] = useState<Rascunho | null>(() => {
    const salvo = lerLocal<Rascunho>(conta, 'rascunho')
    return salvo && salvo.plano?.blocos?.length && Number.isInteger(salvo.indice) && salvo.indice >= 0 &&
      salvo.indice <= salvo.plano.blocos.length && Array.isArray(salvo.toques) && Array.isArray(salvo.entradas) && salvo.diario ? salvo : null
  })
  const [retomar, setRetomar] = useState(false)
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

  if (rascunho && !retomar) return <section className="card">
    <h1>Treino em andamento</h1>
    <p>{rascunho.plano.titulo}. Retome de onde parou; o relógio volta pausado.</p>
    <button className="btn btn-primario" onClick={() => setRetomar(true)}>Retomar treino</button>
    <button className="btn" onClick={() => { removerLocal(conta, 'rascunho'); setRascunho(null) }}>Descartar rascunho</button>
  </section>
  if (rascunho && retomar) return <Execucao key={conta} plano={rascunho.plano} conta={conta} rascunho={rascunho} />
  if (!plano) {
    if (params.get('hoje') !== null) {
      const erro = rotina.erro ?? drills.erro
      if (!rotina.carregado || !drills.carregado)
        return erro ? <ErroCarga erro={erro} tentarDeNovo={() => { rotina.recarregar(); drills.recarregar() }} /> : <Carregando texto="Montando o treino de hoje" />
    }
    return <SemPlano />
  }
  if (plano.blocos.length === 0) return <SemPlano hoje />
  return <Execucao key={conta} plano={plano} conta={conta} />
}

function SemPlano({ hoje = false }: { hoje?: boolean }) {
  return (
    <>
      <h1>Sessão guiada</h1>
      <div className="vazio">
        {hoje ? 'Nenhum treino na rotina de hoje. ' : 'Escolha o que treinar primeiro. '}
        <Link to="/rotina" className="link">Gerar a rotina da semana</Link>.
      </div>
    </>
  )
}

function Execucao({ plano, conta, rascunho }: { plano: PlanoGuiado; conta: string; rascunho?: Rascunho }) {
  const navigate = useNavigate()
  const { adicionar } = useSessoes()
  const { blocos } = plano
  const contador = useContador(rascunho)

  const [indice, setIndice] = useState(rascunho?.indice ?? -1) // -1 = antes de começar; blocos.length = fim
  const [restante, setRestante] = useState(rascunho?.restante ?? 0)
  const [decorrido, setDecorrido] = useState(rascunho?.decorrido ?? 0)
  const [rodando, setRodando] = useState(false)
  const [reps, setReps] = useState(rascunho?.reps ?? 0)
  const [entradas, setEntradas] = useState<Entrada[]>(rascunho?.entradas ?? [])
  const [zonas, setZonas] = useState<DadosZonas>(rascunho?.zonas ?? {})
  const [total, setTotal] = useState(rascunho?.total ?? 0)
  const inicio = useRef<string>(rascunho?.inicio ?? '')
  const [clientId] = useState(() => rascunho?.clientId ?? crypto.randomUUID())
  const [diario, setDiario] = useState(rascunho?.diario ?? { esforco: 3, cansaco: 3, notas: '' })
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const salvo = useRef(false)
  const atual = useRef<Rascunho>(null!)
  atual.current = { plano, clientId, indice, restante, decorrido, reps, entradas, zonas, total, inicio: inicio.current, toques: contador.toques, zona: contador.zona, diario }
  useEffect(() => {
    if (indice < 0 || salvo.current) return
    try { gravarLocal(conta, 'rascunho', atual.current); setErroLocal(null) }
    catch { setErroLocal('Não foi possível guardar o rascunho neste aparelho. Mantenha a página aberta até salvar a sessão.') }
  }, [conta, indice, restante, decorrido, reps, entradas, zonas, total, contador.toques, contador.zona, diario])
  useEffect(() => {
    const guardar = () => { if (atual.current.indice >= 0 && !salvo.current) { try { gravarLocal(conta, 'rascunho', atual.current) } catch { /* erro já exibido na tela */ } } }
    window.addEventListener('pagehide', guardar)
    return () => window.removeEventListener('pagehide', guardar)
  }, [conta])

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

  const ancora = useRef(Date.now())
  const rodandoRef = useRef(false)
  const atualizarTempo = () => {
    if (!rodandoRef.current) return
    const delta = segundosPassados(ancora.current, Date.now())
    if (!delta) return
    ancora.current += delta * 1000
    setDecorrido((d) => d + delta)
    setTotal((d) => d + delta)
    setRestante((r) => r - delta)
    // Snapshot atualizado sincronicamente, inclusive no pagehide antes de um novo render.
    atual.current = { ...atual.current, decorrido: atual.current.decorrido + delta, total: atual.current.total + delta, restante: atual.current.restante - delta }
  }
  const atualizarRef = useRef(atualizarTempo)
  atualizarRef.current = atualizarTempo
  useEffect(() => {
    if (!rodando) return
    const tick = () => atualizarRef.current()
    const guardar = () => {
      tick()
      try { gravarLocal(conta, 'rascunho', atual.current) } catch { /* a interface informa a falha */ }
    }
    const t = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pagehide', guardar)
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', tick); window.removeEventListener('pagehide', guardar) }
  }, [rodando, conta])

  function alternarRelogio() {
    atualizarTempo()
    if (!rodando) ancora.current = Date.now()
    rodandoRef.current = !rodando
    setRodando(!rodando)
  }

  const restanteAnterior = useRef(restante)
  // Contagem regressiva sonora nos 3 últimos segundos e alarme no fim do bloco.
  useEffect(() => {
    const anterior = restanteAnterior.current
    restanteAnterior.current = restante
    if (!rodando) return
    if (restante > 0 && restante <= 3) bipe(660, 120)
    if (restante <= 0 && anterior > 0) {
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
      ancora.current = Date.now()
      rodandoRef.current = true
      setRodando(true)
    } else {
      rodandoRef.current = false
      setRodando(false)
    }
  }

  function concluir(registrar: boolean) {
    if (!bloco) return
    atualizarTempo()
    if (registrar) {
      const entrada: Entrada = { drillId: bloco.drillId, drillNome: bloco.nome }
      if (bloco.metrica === 'acertos' && contador.tentativas > 0) {
        entrada.acertos = contador.acertos
        entrada.tentativas = contador.tentativas
        if (contador.melhorSequencia > 0) entrada.sequencia = contador.melhorSequencia
      }
      if (bloco.metrica === 'repeticoes' && reps > 0) entrada.repeticoes = reps
      if (bloco.metrica === 'tempo' && atual.current.decorrido > 0) entrada.segundos = atual.current.decorrido
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

  if (!bloco) return <Final conta={conta} clientId={clientId} diario={diario} setDiario={setDiario} erroLocal={erroLocal} plano={plano} entradas={entradas} zonas={zonas} segundos={total} inicio={inicio.current} salvar={adicionar} aoSalvar={() => { salvo.current = true; removerLocal(conta, 'rascunho'); navigate(plano.programa ? `/programas/${plano.programa.id}` : '/') }} />

  const acabou = restante <= 0
  return (
    <div className="guiada">
      {erroLocal && <p className="erro" role="alert">{erroLocal}</p>}
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

      <div className="guiada-treino">
        <ComoFazer key={indice} drillId={bloco.drillId} nome={bloco.nome} />

        <div className="guiada-painel">
          <div className={`guiada-relogio ${acabou ? 'esgotado' : ''}`} aria-live="off">
            {acabou ? `+${relogio(-restante)}` : relogio(restante)}
          </div>
          {acabou && <p className="guiada-aviso" role="status">Tempo! Siga para o próximo quando terminar.</p>}

          <div className="acoes centro-flex">
            <button className="btn" onClick={alternarRelogio}>
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
                <button className="btn contador-toque contador-toque-acerto" onClick={() => setReps((r) => r + 1)}><strong>+1</strong></button>
                <button className="btn contador-toque contador-toque-acerto" onClick={() => setReps((r) => r + 5)}><strong>+5</strong></button>
                <button className="btn contador-toque contador-toque-erro" onClick={() => setReps((r) => Math.max(0, r - 1))}><strong>−1</strong></button>
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
      </div>
    </div>
  )
}

function Final({
  conta, clientId, diario, setDiario, erroLocal,
  plano,
  entradas,
  zonas,
  segundos,
  inicio,
  salvar,
  aoSalvar,
}: {
  conta: string
  clientId: string
  diario: Rascunho['diario']
  setDiario: (d: Rascunho['diario']) => void
  erroLocal: string | null
  plano: PlanoGuiado
  entradas: Entrada[]
  zonas: DadosZonas
  segundos: number
  inicio: string
  salvar: ReturnType<typeof useSessoes>['adicionar']
  aoSalvar: () => void
}) {
  const { esforco, cansaco, notas } = diario
  const setEsforco = (esforco: number) => setDiario({ ...diario, esforco })
  const setCansaco = (cansaco: number) => setDiario({ ...diario, cansaco })
  const setNotas = (notas: string) => setDiario({ ...diario, notas })
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
      const sessao = {
        clientId, programa: plano.programa, tzOffset: new Date().getTimezoneOffset(),
        data: inicio || new Date().toISOString(),
        duracaoMin: minutos,
        esforco,
        cansaco,
        notas: [plano.titulo, notas.trim()].filter(Boolean).join(' — '),
        workoutId: plano.workoutId,
        entradas,
        zonas: zonasParaLista(zonas),
      }
      try { await salvar(sessao) }
      catch (e) {
        if (!(e instanceof ApiError) || (e.status !== 0 && e.status < 500)) throw e
        enfileirar(conta, sessao)
      }
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
        {erroLocal && <p className="erro" role="alert">{erroLocal}</p>}
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="btn btn-primario" type="submit" disabled={salvando}>
          {salvando ? 'Salvando' : 'Salvar sessão'}
        </button>
      </form>
    </>
  )
}
