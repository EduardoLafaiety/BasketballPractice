/** Contrato de leitura compartilhado; sem dependência de React, Express ou banco. */
export interface ResumoPeriodo {
  frequencia: number
  diasAtivos: number
  minutos: number
  acertos: number
  tentativas: number
  repeticoes: number
  segundos: number
  aproveitamento: number | null
}
export interface ComparacaoEvolucao {
  atual: ResumoPeriodo
  anterior: ResumoPeriodo
  exercicios: { id: string; nome: string }[]
}
