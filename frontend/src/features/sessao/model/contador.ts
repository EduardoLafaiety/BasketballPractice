import type { ArremessosZona, Zona } from '../../../shared/types'
export interface Toque { acertou: boolean; zona: Zona | null }
export type DadosZonas = Partial<Record<Zona, { acertos: number; tentativas: number }>>
export const zonasParaLista = (zonas: DadosZonas): ArremessosZona[] =>
  (Object.entries(zonas) as [Zona, { acertos: number; tentativas: number }][]).map(([zona, z]) => ({ zona, ...z }))
