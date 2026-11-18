import { useCallback, useState } from 'react'
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
  const [erroSalvar, setErroSalvar] = useState<Error | null>(null)

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
      })
    },
    [setDados, recarregar],
  )

  // No servidor atual, a semana é salva numa transação única.
  const aplicarModelo = useCallback((modelo: Rotina, duracoes: Partial<Record<DiaSemana, number[]>> = {}) => {
    const atual = cache.get('rotina') as typeof dados
    if (!atual) return
    const token = tokenAtual()
    const tempos = Object.fromEntries(([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).map((dia) => [dia, modelo[dia].map((_, i) => duracoes[dia]?.[i] ?? 10)])) as Record<DiaSemana, number[]>
    setDados(() => ({ ...atual, rotina: modelo, duracoes: tempos }))
    setErroSalvar(null)
    filaRotina = filaRotina.then(async () => {
      if (tokenAtual() !== token) return
      try {
        const ids = await api.salvarSemana(modelo, tempos, (cache.get('rotina') as typeof atual)?.ids ?? atual.ids)
        if (cache.has('rotina')) setDados((d) => ({ ...d!, ids }))
      } catch (e) { if (tokenAtual() === token) { setErroSalvar(e as Error); recarregar() } }
    })
  }, [setDados, recarregar])

  /** Promessa que termina quando todos os salvamentos pendentes da rotina acabarem. */
  const aguardarSalvamentos = useCallback(() => filaRotina, [])

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
    erroSalvar,
    recarregar,
    ...resto,
  }
}
