import type { BlocoPlano, Entrada, Zona } from '../../../shared/types'
import type { Toque } from './contador'
import type { DadosZonas } from './contador'
import { blocoValido, contagemValida, dataValida, entradaValida, inteiro, objeto, programaValido, zonaValida } from './validacao-local'
/** O que a página recebe pela navegação (gerador de treino) ou monta a partir da rotina (?hoje). */
export interface PlanoGuiado {
  titulo: string
  blocos: BlocoPlano[]
  workoutId?: number
  /** Dia de um programa: ao salvar a sessão, o dia é marcado como feito. */
  programa?: { id: string; dia: number }
}

export interface Rascunho {
  plano: PlanoGuiado; clientId: string; indice: number; restante: number; decorrido: number
  reps: number; entradas: Entrada[]; zonas: DadosZonas; total: number; inicio: string
  toques: Toque[]; zona: Zona | null; diario: { esforco: number; cansaco: number; notas: string }
}

export function rascunhoValido(valor: unknown): valor is Rascunho {
  if (!valor || typeof valor !== 'object') return false
  const r = valor as Rascunho
  return typeof r.clientId === 'string' && r.clientId.length > 0 && dataValida(r.inicio) &&
    Array.isArray(r.plano?.blocos) && r.plano.blocos.length > 0 && typeof r.plano.titulo === 'string' &&
    r.plano.blocos.length <= 100 && r.plano.blocos.every(blocoValido) &&
    (r.plano.workoutId === undefined || inteiro(r.plano.workoutId, 1)) && (r.plano.programa === undefined || programaValido(r.plano.programa)) &&
    Number.isInteger(r.indice) && r.indice >= 0 && r.indice <= r.plano.blocos.length &&
    Number.isFinite(r.restante) && [r.decorrido, r.total, r.reps].every((n) => inteiro(n)) &&
    Array.isArray(r.entradas) && r.entradas.length <= r.plano.blocos.length && r.entradas.every(entradaValida) &&
    Array.isArray(r.toques) && r.toques.every((t) => t && typeof t.acertou === 'boolean' && (t.zona === null || zonaValida(t.zona))) &&
    (r.zona === null || zonaValida(r.zona)) && objeto(r.zonas) && Object.entries(r.zonas).every(([z, v]) => zonaValida(z) && contagemValida(v)) &&
    !!r.diario && typeof r.diario.notas === 'string' &&
    [r.diario.esforco, r.diario.cansaco].every((n) => Number.isInteger(n) && n >= 1 && n <= 5)
}
