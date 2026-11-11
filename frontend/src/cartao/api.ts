import { fuso, request } from '../api'
import { useRecurso } from '../store'
import type { TipoTeste } from '../types'

export type IdHabilidade = 'lance_livre' | 'arremesso' | 'drible' | 'salto'

export interface Habilidade {
  id: IdHabilidade
  nome: string
  teste: TipoTeste
  /** Resultado que vale 0 e o que vale 99. */
  zero: number
  topo: number
}

export interface CartaoMes {
  mes: string // AAAA-MM
  notas: Record<IdHabilidade, { valor: number; nota: number } | null>
  geral: number | null
  completo: boolean
}

export interface Cartao {
  habilidades: Habilidade[]
  meses: CartaoMes[]
}

interface CardApi {
  skills: { id: IdHabilidade; name: string; test: TipoTeste; zero: number; top: number }[]
  months: { month: string; skills: Record<IdHabilidade, { value: number; rating: number } | null>; overall: number | null; complete: boolean }[]
}

export async function buscarCartao(): Promise<Cartao> {
  const r = await request<CardApi>('GET', `/card?${fuso()}`)
  return {
    habilidades: r.skills.map((s) => ({ id: s.id, nome: s.name, teste: s.test, zero: s.zero, topo: s.top })),
    meses: r.months.map((m) => ({
      mes: m.month,
      notas: Object.fromEntries(
        Object.entries(m.skills).map(([id, s]) => [id, s && { valor: s.value, nota: s.rating }]),
      ) as CartaoMes['notas'],
      geral: m.overall,
      completo: m.complete,
    })),
  }
}

export function useCartao() {
  const { dados, ...resto } = useRecurso('cartao', buscarCartao)
  return { cartao: dados, ...resto }
}

/** "2026-10" vira "out. 2026". */
export const nomeMes = (mes: string, formato: 'long' | 'short' = 'short') =>
  new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: formato, year: 'numeric' })
