import { api } from '../api'
import { useDrills, useRecurso } from '../store'

/**
 * O histórico completo de sessões (a listagem normal traz só as 50 últimas) e os exercícios, para conquistas e overall.
 * A chave começa com "progresso", prefixo que o store já descarta quando uma sessão é criada ou apagada.
 */
export function useHistorico() {
  const { dados, erro, recarregar } = useRecurso('progresso-sessoes', api.todasSessoes)
  const { drillPorId, carregado: drillsCarregados } = useDrills()
  return { sessoes: dados, drillPorId, carregado: dados !== undefined && drillsCarregados, erro, recarregar }
}
