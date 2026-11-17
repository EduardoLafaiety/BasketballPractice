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

export type IdTiro = 'tres' | 'quadra' | 'lance_pct'

export interface Tiro {
  id: IdTiro
  nome: string
}

export interface CartaoMes {
  mes: string // AAAA-MM
  notas: Record<IdHabilidade, { valor: number; nota: number } | null>
  /** Aproveitamento do mês (treino + jogo) em cada arremesso, com a nota de 0 a 99. */
  arremessos: Record<IdTiro, { pct: number; tentativas: number; nota: number } | null>
  geral: number | null
  completo: boolean
}

export interface Cartao {
  habilidades: Habilidade[]
  tiros: Tiro[]
  meses: CartaoMes[]
}

interface CardApi {
  skills: { id: IdHabilidade; name: string; test: TipoTeste; zero: number; top: number }[]
  shootingSkills?: { id: IdTiro; name: string }[]
  months: {
    month: string
    skills: Record<IdHabilidade, { value: number; rating: number } | null>
    shooting?: Record<IdTiro, { pct: number; attempts: number; rating: number } | null>
    overall: number | null
    complete: boolean
  }[]
}

const TIROS_PADRAO: Tiro[] = [
  { id: 'tres', nome: 'Bola de 3' },
  { id: 'quadra', nome: 'Arremesso de quadra' },
  { id: 'lance_pct', nome: 'Lance livre (%)' },
]

export async function buscarCartao(): Promise<Cartao> {
  const r = await request<CardApi>('GET', `/card?${fuso()}`)
  return {
    habilidades: r.skills.map((s) => ({ id: s.id, nome: s.name, teste: s.test, zero: s.zero, topo: s.top })),
    tiros: r.shootingSkills?.map((t) => ({ id: t.id, nome: t.name })) ?? TIROS_PADRAO,
    meses: r.months.map((m) => ({
      mes: m.month,
      notas: Object.fromEntries(
        Object.entries(m.skills).map(([id, s]) => [id, s && { valor: s.value, nota: s.rating }]),
      ) as CartaoMes['notas'],
      arremessos: Object.fromEntries(
        TIROS_PADRAO.map(({ id }) => {
          const t = m.shooting?.[id]
          return [id, t ? { pct: t.pct, tentativas: t.attempts, nota: t.rating } : null]
        }),
      ) as CartaoMes['arremessos'],
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
