import type { Drill } from '../types'
export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

export const aproveitamento = (acertos = 0, tentativas = 0) =>
  tentativas > 0 ? Math.round((acertos / tentativas) * 100) : null

export const ROTULO_METRICA: Record<Drill['metrica'], string> = {
  acertos: 'Acertos e tentativas',
  repeticoes: 'Repetições',
  tempo: 'Tempo',
}

/** Início do dia, `dias` atrás (0 = hoje). */
export function diasAtras(dias: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dias)
  return d
}
