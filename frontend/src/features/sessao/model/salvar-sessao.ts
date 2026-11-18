import { ApiError, tokenAtual } from '../../../shared/api/http'
import type { NovaSessao } from '../../../shared/types'
import { enfileirar } from './treino-local'

/** Só falhas transitórias entram na fila; validação e acesso permanecem visíveis no resumo. */
export async function salvarOuEnfileirar(conta: string, sessao: NovaSessao, salvar: (sessao: NovaSessao) => Promise<unknown>): Promise<'servidor' | 'aparelho'> {
  const token = tokenAtual()
  try { await salvar(sessao); return 'servidor' }
  catch (erro) {
    if (!(erro instanceof ApiError) || (erro.status !== 0 && erro.status < 500)) throw erro
    if (tokenAtual() !== token) throw new Error('A conta mudou durante o envio. Reabra o treino na conta original para conferir o registro.')
    enfileirar(conta, sessao)
    return 'aparelho'
  }
}
