import { useCallback } from 'react'
import { api, tokenAtual } from '../../../shared/api/backend'
import { cache, invalidar, useRecurso } from '../../../shared/data/recursos'
import type { NovaSessao, Sessao } from '../../../shared/types'
const DERIVADOS = ['resumo', 'zonas', 'progresso', 'metas']
export function useSessoes() {
  const { dados, setDados, ...resto } = useRecurso('sessoes', api.sessoes)

  const adicionar = useCallback(
    async (s: NovaSessao) => {
      const token = tokenAtual()
      const criada = await api.registrarSessao(s)
      if (tokenAtual() !== token) return criada
      invalidar(...DERIVADOS)
      // Só atualiza o cache se a lista já foi carregada; senão a página de destino busca tudo.
      if (cache.has('sessoes')) setDados((atual = []) => [criada, ...atual.filter((s) => s.id !== criada.id)])
      return criada
    },
    [setDados],
  )

  const remover = useCallback(
    async (id: string) => {
      const anterior = cache.get('sessoes') as Sessao[] | undefined
      setDados((atual = []) => atual.filter((s) => s.id !== id))
      try {
        await api.removerSessao(id)
        invalidar(...DERIVADOS)
      } catch (e) {
        if (anterior) setDados(() => anterior)
        throw e
      }
    },
    [setDados],
  )

  return { sessoes: dados ?? [], carregado: dados !== undefined, adicionar, remover, ...resto }
}
