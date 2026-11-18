import type { Drill } from '../../../shared/types'
import type { PlanoGuiado } from './sessao'
import { blocoValido, categoriaValida, dataValida, inteiro, objeto, programaValido, texto } from './validacao-local'

export interface TreinoOffline { versao: 1; preparadoEm: string; plano: PlanoGuiado; exercicios: Drill[] }
const chave = (conta: string) => `bp.treino.v3.${conta}.offline`
export function planoValido(v: unknown): v is PlanoGuiado {
  return objeto(v) && texto(v.titulo) && Array.isArray(v.blocos) && v.blocos.length > 0 && v.blocos.length <= 100 && v.blocos.every(blocoValido) &&
    (v.workoutId === undefined || inteiro(v.workoutId, 1)) && (v.programa === undefined || programaValido(v.programa))
}
export function lerTreinoOffline(conta: string): TreinoOffline | null {
  try {
    const v = JSON.parse(localStorage.getItem(chave(conta)) ?? 'null')
    if (!objeto(v) || v.versao !== 1 || !dataValida(v.preparadoEm) || !planoValido(v.plano) || !Array.isArray(v.exercicios)) return null
    if (!v.exercicios.every((d) => objeto(d) && texto(d.id) && texto(d.nome) && texto(d.descricao) && categoriaValida(d.categoria) && ['acertos', 'repeticoes', 'tempo'].includes(d.metrica as string) && typeof d.personalizado === 'boolean')) return null
    const ids = new Set(v.exercicios.map((d) => d.id))
    return v.plano.blocos.every((b) => ids.has(b.drillId)) ? v as unknown as TreinoOffline : null
  } catch { return null }
}

/** Salva apenas exercícios do plano, nunca histórico, token ou respostas autenticadas da API no SW. */
export function guardarTreinoOffline(conta: string, plano: PlanoGuiado, catalogo: Drill[]) {
  if (!planoValido(plano)) throw new Error('O plano não pode ser preparado. Recarregue o treino com conexão.')
  const ids = new Set(plano.blocos.map((b) => b.drillId))
  const exercicios = catalogo.filter((d) => ids.has(d.id))
  if (new Set(exercicios.map((d) => d.id)).size !== ids.size) throw new Error('Carregue os exercícios do treino antes de prepará-lo.')
  const pacote: TreinoOffline = { versao: 1, preparadoEm: new Date().toISOString(), plano, exercicios }
  localStorage.setItem(chave(conta), JSON.stringify(pacote))
  return pacote
}
