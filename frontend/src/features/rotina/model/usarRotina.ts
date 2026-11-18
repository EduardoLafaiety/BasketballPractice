import { useCallback, useRef, useState } from 'react'
import { api, tokenAtual } from '../../../shared/api/backend'
import { cache, useRecurso } from '../../../shared/data/recursos'
import { DIAS } from '../../../shared/lib/formatacao'
import type { DiaSemana, Rotina } from '../../../shared/types'
const ROTINA_VAZIA: Rotina = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }

// Salvamentos da rotina em fila, para que dois cliques rápidos não criem
// dois modelos de treino para o mesmo dia.
let filaRotina: Promise<unknown> = Promise.resolve()

export function useRotina() {
  const { dados, setDados, recarregar, ...resto } = useRecurso('rotina', api.rotina)
  const [erroSalvar, definirErroSalvar] = useState<Error | null>(null)
  const erroAtual = useRef<Error | null>(null)
  const setErroSalvar = (e: Error | null) => { erroAtual.current = e; definirErroSalvar(e) }
  const [gravacoes, setGravacoes] = useState(0)

  const alterarDia = useCallback(
    (dia: DiaSemana, atualizar: (ids: string[]) => string[], tempos?: number[]) => {
      if (!cache.has('rotina')) return
      const token = tokenAtual()
      let antes: string[] = []
      let duracoesAntes: number[] = []
      let novos: string[] = []
      let novasDuracoes: number[] = []
      setDados((atual) => {
        antes = atual!.rotina[dia]
        duracoesAntes = atual!.duracoes[dia]
        novos = atualizar(antes)
        const disponiveis = new Map<string, number[]>()
        antes.forEach((id, i) => disponiveis.set(id, [...(disponiveis.get(id) ?? []), atual!.duracoes[dia]?.[i] ?? 10]))
        novasDuracoes = tempos ?? novos.map((id) => disponiveis.get(id)?.shift() ?? 10)
        return { ...atual!, rotina: { ...atual!.rotina, [dia]: novos }, duracoes: { ...atual!.duracoes, [dia]: novasDuracoes } }
      })
      setErroSalvar(null)
      setGravacoes((n) => n + 1)

      filaRotina = filaRotina.then(async () => {
        if (tokenAtual() !== token) return
        const workoutId = (cache.get('rotina') as typeof dados)?.ids[dia]
        try {
          const salvo = await api.salvarDia(dia, DIAS[dia], novos, workoutId, novasDuracoes)
          if (tokenAtual() === token && cache.has('rotina')) setDados((atual) => ({ ...atual!, ids: { ...atual!.ids, [dia]: salvo } }))
        } catch (e) {
          // Desfaz a mudança (se nada mais mudou o dia) e confere com o servidor.
          if (tokenAtual() !== token) return
          setErroSalvar(e as Error)
          if (tokenAtual() === token && cache.has('rotina')) {
            setDados((atual) =>
              atual!.rotina[dia] === novos ? { ...atual!, rotina: { ...atual!.rotina, [dia]: antes }, duracoes: { ...atual!.duracoes, [dia]: duracoesAntes } } : atual!,
            )
          }
          recarregar()
        }
      }).finally(() => setGravacoes((n) => n - 1))
    },
    [setDados, recarregar],
  )

  // No servidor atual, a semana é salva numa transação única.
  const aplicarModelo = useCallback((modelo: Rotina, duracoes: Partial<Record<DiaSemana, number[]>> = {}) => {
    const atual = cache.get('rotina') as typeof dados
    if (!atual) return Promise.resolve(false)
    const token = tokenAtual()
    const tempos = Object.fromEntries(([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).map((dia) => [dia, modelo[dia].map((_, i) => duracoes[dia]?.[i] ?? 10)])) as Record<DiaSemana, number[]>
    setDados(() => ({ ...atual, rotina: modelo, duracoes: tempos }))
    setErroSalvar(null)
    setGravacoes((n) => n + 1)
    const gravacao = filaRotina.then(async () => {
      if (tokenAtual() !== token) return false
      try {
        const ids = await api.salvarSemana(modelo, tempos, (cache.get('rotina') as typeof atual)?.ids ?? atual.ids)
        if (tokenAtual() !== token) return false
        if (cache.has('rotina')) setDados((d) => ({ ...d!, ids }))
        return true
      } catch (e) { if (tokenAtual() === token) { setErroSalvar(e as Error); recarregar() }; return false }
    }).finally(() => setGravacoes((n) => n - 1))
    filaRotina = gravacao
    return gravacao
  }, [setDados, recarregar])

  /** Promessa que termina quando todos os salvamentos pendentes da rotina acabarem. */
  const aguardarSalvamentos = useCallback(async () => {
    const token = tokenAtual()
    let atual: Promise<unknown>
    do { atual = filaRotina; await atual } while (atual !== filaRotina)
    return tokenAtual() === token && !erroAtual.current
  }, [])
  const moverExercicio = useCallback((origem: DiaSemana, indice: number, destino: DiaSemana) => {
    const atual = cache.get('rotina') as typeof dados
    if (!atual || origem === destino || !atual.rotina[origem][indice]) return
    const modelo = { ...atual.rotina, [origem]: atual.rotina[origem].filter((_, i) => i !== indice), [destino]: [...atual.rotina[destino], atual.rotina[origem][indice]] }
    const tempos = { ...atual.duracoes, [origem]: atual.duracoes[origem].filter((_, i) => i !== indice), [destino]: [...atual.duracoes[destino], atual.duracoes[origem][indice] ?? 10] }
    aplicarModelo(modelo, tempos)
  }, [aplicarModelo])

  return {
    rotina: dados?.rotina ?? ROTINA_VAZIA,
    duracoes: dados?.duracoes,
    alterarDuracao: (dia: DiaSemana, indice: number, minutos: number) => {
      const tempos = [...(dados?.duracoes[dia] ?? [])]; tempos[indice] = minutos; alterarDia(dia, (ids) => ids, tempos)
    },
    carregado: dados !== undefined,
    alterarDia,
    aplicarModelo,
    aguardarSalvamentos,
    moverExercicio,
    erroSalvar,
    salvando: gravacoes > 0,
    recarregar: () => { setErroSalvar(null); recarregar() },
    ...resto,
  }
}
