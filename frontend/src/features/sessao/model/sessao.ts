import type { BlocoPlano, Entrada, Zona } from '../../../shared/types'
import type { Toque } from '../components/Contador'
import type { DadosZonas } from '../components/Quadra'
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
  return typeof r.clientId === 'string' && typeof r.inicio === 'string' &&
    Array.isArray(r.plano?.blocos) && r.plano.blocos.length > 0 && typeof r.plano.titulo === 'string' &&
    r.plano.blocos.every((b) => b && typeof b.drillId === 'string' && typeof b.nome === 'string' &&
      ['acertos', 'repeticoes', 'tempo'].includes(b.metrica) && Number.isFinite(b.minutos) && b.minutos > 0) &&
    Number.isInteger(r.indice) && r.indice >= 0 && r.indice <= r.plano.blocos.length &&
    [r.restante, r.decorrido, r.total, r.reps].every(Number.isFinite) && r.decorrido >= 0 && r.total >= 0 && r.reps >= 0 &&
    Array.isArray(r.entradas) && r.entradas.every((e) => e && typeof e.drillId === 'string') &&
    Array.isArray(r.toques) && r.toques.every((t) => t && typeof t.acertou === 'boolean') &&
    !!r.zonas && typeof r.zonas === 'object' && !!r.diario && typeof r.diario.notas === 'string' &&
    [r.diario.esforco, r.diario.cansaco].every((n) => Number.isInteger(n) && n >= 1 && n <= 5)
}
