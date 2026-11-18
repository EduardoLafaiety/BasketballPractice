import { useEffect, useRef, useState, useReducer } from 'react'
import { segundosPassados } from '../../../shared/lib/relogio'
import { bipe, vibrar } from '../../../shared/lib/audio'
import { useTelaLigada } from '../../../shared/lib/telaLigada'
import { useContador } from './usarContador'
import type { DadosZonas } from './contador'
import type { Entrada } from '../../../shared/types'
import type { PlanoGuiado, Rascunho } from './sessao'
import { criarGravadorRascunho } from './treino-local'
import { estadoInicial, transicaoSessao, entradaDoBloco } from './execucao'

/** Orquestra relógio, efeitos e persistência; a página apenas apresenta o estado e as ações. */
export function useExecucao(plano: PlanoGuiado, conta: string, rascunho?: Rascunho) {
  const { blocos } = plano
  const contador = useContador(rascunho)

  const [estado, dispatch] = useReducer(transicaoSessao, undefined, () => estadoInicial(blocos.length, rascunho?.indice))
  const indice = estado.fase === 'preparacao' ? -1 : estado.fase === 'resumo' ? blocos.length : estado.indice
  const rodando = estado.fase === 'execucao' && estado.ritmo === 'rodando'
  const [restante, setRestante] = useState(rascunho?.restante ?? 0)
  const [decorrido, setDecorrido] = useState(rascunho?.decorrido ?? 0)
  const [reps, setReps] = useState(rascunho?.reps ?? 0)
  const [entradas, setEntradas] = useState<Entrada[]>(rascunho?.entradas ?? [])
  const [zonas, setZonas] = useState<DadosZonas>(rascunho?.zonas ?? {})
  const [total, setTotal] = useState(rascunho?.total ?? 0)
  const inicio = useRef<string>(rascunho?.inicio ?? '')
  const [clientId] = useState(() => rascunho?.clientId ?? crypto.randomUUID())
  const [diario, setDiario] = useState(rascunho?.diario ?? { esforco: 3, cansaco: 3, notas: '' })
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [guardarRascunho] = useState(() => criarGravadorRascunho(conta, rascunho ?? null))
  const salvo = useRef(false)
  const atual = useRef<Rascunho>(null!)
  atual.current = { plano, clientId, indice, restante, decorrido, reps, entradas, zonas, total, inicio: inicio.current, toques: contador.toques, zona: contador.zona, diario }
  useEffect(() => {
    if (indice < 0 || salvo.current) return
    try { guardarRascunho(atual.current); setErroLocal(null) }
    catch (erro) { setErroLocal(`Não foi possível guardar o rascunho neste aparelho. ${erro instanceof Error ? erro.message : ''} Mantenha a página aberta até salvar a sessão.`) }
  }, [conta, indice, restante, decorrido, reps, entradas, zonas, total, contador.toques, contador.zona, diario])
  useEffect(() => {
    const guardar = () => { if (atual.current.indice >= 0 && !salvo.current) { try { guardarRascunho(atual.current) } catch { /* erro já exibido na tela */ } } }
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
      try { guardarRascunho(atual.current) } catch { /* a interface informa a falha */ }
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
    dispatch({ tipo: 'alternar' })
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
    dispatch({ tipo: 'bloco', indice: i, quantidade: blocos.length })
    if (i < blocos.length) {
      setRestante(blocos[i].minutos * 60)
      setDecorrido(0)
      setReps(0)
      contador.zerar()
      contador.setZona(null)
      ancora.current = Date.now()
      rodandoRef.current = true
    } else {
      rodandoRef.current = false
    }
  }

  function concluir(registrar: boolean) {
    if (!bloco) return
    atualizarTempo()
    if (registrar) {
      const entrada = entradaDoBloco(bloco, contador, reps, atual.current.decorrido)
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

  return { estado, indice, restante, rodando, reps, setReps, setRestante, entradas, zonas, total, inicio: inicio.current, clientId, diario, setDiario, erroLocal,
    contador, bloco, comecar, concluir, alternarRelogio, aoGuardar: () => { salvo.current = true; guardarRascunho.remover() } }
}
