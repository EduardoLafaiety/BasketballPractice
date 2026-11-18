import { api, tokenAtual } from '../../../shared/api/backend'
import { atualizarSeCarregado, invalidar } from '../../../shared/data/recursos'
import type { NovaSessao, Sessao } from '../../../shared/types'

/** Salvar não exige baixar o histórico antes. */
export async function registrarSessao(sessao: NovaSessao) {
  const token = tokenAtual()
  const criada = await api.registrarSessao(sessao)
  if (tokenAtual() !== token) return criada
  invalidar('resumo', 'zonas', 'progresso', 'metas')
  atualizarSeCarregado<Sessao[]>('sessoes', (atual) => [criada, ...atual.filter((s) => s.id !== criada.id)])
  return criada
}
