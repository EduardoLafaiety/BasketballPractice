import { useCallback, useMemo } from 'react'
import { api } from '../../../shared/api/backend'
import { useRecurso } from '../../../shared/data/recursos'
import type { Drill } from '../../../shared/types'
export function useDrills() {
  const { dados, ...resto } = useRecurso('drills', api.drills)
  const drills = useMemo(() => dados ?? [], [dados])
  const drillPorId = useCallback((id: string) => drills.find((d) => d.id === id), [drills])
  const { recarregar } = resto

  // Exercícios do próprio atleta. Depois de salvar, a lista é recarregada para vir na ordem da API.
  const salvar = useCallback(
    async (d: Pick<Drill, 'nome' | 'categoria' | 'metrica' | 'descricao'>, id?: string) => {
      const salvo = await api.salvarDrill(d, id)
      recarregar()
      return salvo
    },
    [recarregar],
  )
  const remover = useCallback(
    async (id: string) => {
      await api.removerDrill(id)
      recarregar()
    },
    [recarregar],
  )

  return { drills, drillPorId, carregado: dados !== undefined, salvar, remover, ...resto }
}
