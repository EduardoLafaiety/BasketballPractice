// Classificação do NBB (Novo Basquete Brasil). A LNB não tem API e o navegador não pode ler o site dela, então a
// classificação vira um JSON ao publicar o site (backend/src/scripts/export-nbb.ts, ver .github/workflows/demo.yml).
import { comValidade } from '../nba/cache'

export interface LinhaNbb {
  posicao: number
  sigla: string
  nome: string
  escudo: string
  jogos: number
  vitorias: number
  derrotas: number
  /** Aproveitamento de 0 a 1. */
  aproveitamento: number
  /** Saldo de pontos (cestas feitas menos sofridas). */
  saldo: number
  /** Pontos na tabela: 2 por vitória e 1 por derrota. */
  pontos: number
}

export interface TabelaNbb {
  /** Ex.: "2026/27". */
  temporada: string
  /** Quando a classificação foi lida da LNB (ISO). */
  atualizada: string
  linhas: LinhaNbb[]
}

/** Quantos times vão aos playoffs (oitavas de final); o último colocado cai para a Liga Ouro. */
export const VAGAS_PLAYOFFS = 16

interface TimeJson {
  position?: number
  abbreviation?: string
  name?: string
  logo?: string
  games?: number
  wins?: number
  losses?: number
  winPct?: number
  pointsDiff?: number
  points?: number
}

/** Do JSON gerado na publicação para a tabela; linha sem posição, sigla ou escudo https fica de fora. */
export function lerNbb(json: unknown): TabelaNbb {
  const { season, updatedAt, teams } = (json ?? {}) as { season?: string; updatedAt?: string; teams?: TimeJson[] }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const linhas = (Array.isArray(teams) ? teams : [])
    .filter((t) => num(t.position) > 0 && t.abbreviation && t.name && t.logo?.startsWith('https://'))
    .map((t) => ({
      posicao: num(t.position),
      sigla: t.abbreviation!,
      nome: t.name!,
      escudo: t.logo!,
      jogos: num(t.games),
      vitorias: num(t.wins),
      derrotas: num(t.losses),
      aproveitamento: num(t.winPct),
      saldo: num(t.pointsDiff),
      pontos: num(t.points),
    }))
    .sort((a, b) => a.posicao - b.posicao)
  // "2026/2027" vira "2026/27".
  const temporada = (season ?? '').replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2')
  return { temporada, atualizada: updatedAt ?? '', linhas }
}

export const buscarNbb = comValidade('bp.nbb.classificacao', 15 * 60_000, async () => {
  const falhou = new Error('A classificação da NBB não está disponível agora.')
  const resposta = await fetch(`${import.meta.env.BASE_URL}nbb.json`).catch(() => {
    throw falhou
  })
  if (!resposta.ok) throw falhou
  const tabela = lerNbb(await resposta.json().catch(() => null))
  if (!tabela.linhas.length) throw falhou
  return tabela
})

/** Saldo de pontos com sinal: "+144", "-12", "0". */
export const saldoComSinal = (v: number) => (v > 0 ? `+${v}` : String(v))
