import { api } from '../../../shared/api/backend'
import { useRecurso } from '../../../shared/data/recursos'

/**
 * Projeção compacta de todo o histórico para conquistas e overall, sem limitar a pontuação às sessões recentes.
 * A chave começa com "progresso", prefixo que o store já descarta quando uma sessão é criada ou apagada.
 */
export function useHistorico() {
  const { dados, erro, recarregar } = useRecurso('progresso-sessoes', api.sessoesProgresso)
  return { sessoes: dados, carregado: dados !== undefined, erro, recarregar }
}
