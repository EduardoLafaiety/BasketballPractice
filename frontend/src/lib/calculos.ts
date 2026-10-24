/** Percentual com uma casa decimal, ou null sem tentativas. */
export const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null)

/** Aproveitamento de quadra (FG%). */
export const fgPct = (cestas: number, tentativas: number) => pct(cestas, tentativas)

/** Effective FG%: a bola de três vale 1,5 arremesso de dois. */
export const efgPct = (cestas: number, cestas3: number, tentativas: number) =>
  tentativas > 0 ? Math.round(((cestas + 0.5 * cestas3) / tentativas) * 1000) / 10 : null

/** True Shooting %: considera lances livres (0,44 por tentativa, padrão da NBA). */
export function tsPct(pontos: number, tentativas: number, tentativasLance: number) {
  const base = 2 * (tentativas + 0.44 * tentativasLance)
  return base > 0 ? Math.round((pontos / base) * 1000) / 10 : null
}

/** Pontos a partir das cestas: dois pontos, três pontos e lances livres convertidos. */
export const pontos = (cestas: number, cestas3: number, lances: number) => cestas * 2 + cestas3 + lances

/**
 * Quantos acertos seguidos faltam para chegar a `meta` (%).
 * (a + n) / (t + n) >= meta  →  n >= (meta·t − a) / (1 − meta)
 */
export function acertosParaMeta(acertos: number, tentativas: number, meta: number) {
  const m = meta / 100
  if (m >= 1) return acertos === tentativas ? 0 : null // 100% só sem nenhum erro
  if (tentativas > 0 && acertos / tentativas >= m) return 0
  return Math.max(0, Math.ceil((m * tentativas - acertos) / (1 - m) - 1e-9))
}

export const PES_POR_METRO = 3.28084
export const metrosParaPes = (m: number) => m * PES_POR_METRO
export const pesParaMetros = (pes: number) => pes / PES_POR_METRO

/** Distâncias oficiais de referência, em metros. */
export const DISTANCIAS = [
  { nome: 'Linha de lance livre (até a tabela)', metros: 4.6 },
  { nome: 'Linha de três FIBA', metros: 6.75 },
  { nome: 'Linha de três NBA (topo)', metros: 7.24 },
  { nome: 'Linha de três NBA (canto)', metros: 6.71 },
  { nome: 'Altura do aro', metros: 3.05 },
  { nome: 'Comprimento da quadra FIBA', metros: 28 },
]
