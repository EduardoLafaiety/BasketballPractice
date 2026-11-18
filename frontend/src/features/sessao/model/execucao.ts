import type { BlocoPlano, Entrada, NovaSessao } from '../../../shared/types'
import type { PlanoGuiado, Rascunho } from './sessao'
import { zonasParaLista, type DadosZonas } from './contador'

export type EstadoExecucao = { fase: 'preparacao' } | { fase: 'execucao'; indice: number; ritmo: 'rodando' | 'pausada' } | { fase: 'resumo' }
type Acao = { tipo: 'alternar' } | { tipo: 'bloco'; indice: number; quantidade: number }

export function estadoInicial(quantidade: number, indice?: number): EstadoExecucao {
  if (indice === undefined || indice < 0) return { fase: 'preparacao' }
  return indice >= quantidade ? { fase: 'resumo' } : { fase: 'execucao', indice, ritmo: 'pausada' }
}

export function transicaoSessao(estado: EstadoExecucao, acao: Acao): EstadoExecucao {
  if (acao.tipo === 'alternar') return estado.fase === 'execucao' ? { ...estado, ritmo: estado.ritmo === 'rodando' ? 'pausada' : 'rodando' } : estado
  if (estado.fase === 'resumo') return estado
  const proximo = estado.fase === 'preparacao' ? 0 : estado.indice + 1
  if (acao.indice !== proximo || acao.quantidade < 1) return estado
  return proximo >= acao.quantidade ? { fase: 'resumo' } : { fase: 'execucao', indice: proximo, ritmo: 'rodando' }
}

export function entradaDoBloco(bloco: BlocoPlano, contador: { acertos: number; tentativas: number; melhorSequencia: number }, reps: number, segundos: number): Entrada {
  const entrada: Entrada = { drillId: bloco.drillId, drillNome: bloco.nome }
  if (bloco.metrica === 'acertos' && contador.tentativas > 0) {
    entrada.acertos = contador.acertos; entrada.tentativas = contador.tentativas
    if (contador.melhorSequencia > 0) entrada.sequencia = contador.melhorSequencia
  }
  if (bloco.metrica === 'repeticoes' && reps > 0) entrada.repeticoes = reps
  if (bloco.metrica === 'tempo' && segundos > 0) entrada.segundos = segundos
  return entrada
}

export const minutosDaSessao = (segundos: number) => Math.max(1, Math.round(segundos / 60))
export function montarSessao(dados: { clientId: string; plano: PlanoGuiado; diario: Rascunho['diario']; entradas: Entrada[]; zonas: DadosZonas; segundos: number; inicio: string }, agora = new Date()): NovaSessao {
  return {
    clientId: dados.clientId, programa: dados.plano.programa, workoutId: dados.plano.workoutId,
    tzOffset: agora.getTimezoneOffset(), data: dados.inicio || agora.toISOString(), duracaoMin: minutosDaSessao(dados.segundos),
    esforco: dados.diario.esforco, cansaco: dados.diario.cansaco, notas: [dados.plano.titulo, dados.diario.notas.trim()].filter(Boolean).join(' — '),
    entradas: dados.entradas, zonas: zonasParaLista(dados.zonas),
  }
}
