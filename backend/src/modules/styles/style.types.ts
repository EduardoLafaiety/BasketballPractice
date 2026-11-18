export type Group = 'guard' | 'forward' | 'center'

export type Move = {
  name: string
  description: string
  tip: string
  /** Nome do exercício no catálogo padrão (seed.ts). */
  exercise: string
  dose: string
  minutes: number
}

export type Style = {
  id: string
  name: string
  group: Group
  heightCm: number
  archetype: string
  pace: string
  summary: string
  mindset: string
  moves: Move[]
}


export interface CatalogRow { id: number; name: string; category: string; metric: string }
