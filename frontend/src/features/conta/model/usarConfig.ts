import { useCallback } from 'react'
import { api } from '../../../shared/api/backend'
import { cache, useRecurso } from '../../../shared/data/recursos'
import type { Config } from '../../../shared/types'
export const CONFIG_PADRAO: Config = {
  tema: 'sistema',
  lembretes: { ativo: false, horario: '18:00', dias: [1, 2, 3, 4, 5] },
  metronomoBpm: 90,
}

export function useConfig() {
  const { dados, setDados, ...resto } = useRecurso('config', api.config)

  // Aplica na hora (tema, lembretes) e desfaz se o servidor recusar.
  const salvar = useCallback(
    async (nova: Config) => {
      const anterior = cache.get('config') as Config | undefined
      setDados(() => nova)
      try {
        const salva = await api.salvarConfig(nova)
        setDados(() => salva)
      } catch (e) {
        if (anterior) setDados(() => anterior)
        throw e
      }
    },
    [setDados],
  )

  return { config: dados ?? CONFIG_PADRAO, carregado: dados !== undefined, salvar, ...resto }
}
