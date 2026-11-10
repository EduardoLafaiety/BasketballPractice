// Classificação das conferências Leste e Oeste, da API pública da ESPN (aceita chamada direto do
// navegador). As cores dos times vêm da aba Equipamentos, que já tem os 30 times.
import { TIMES } from '../equipamentos/dados'
import { comValidade } from './cache'

export const URL_TABELA = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

export interface LinhaTabela {
  posicao: number
  sigla: string
  nome: string
  cor: string
  /** Escudo do time para fundo claro e para fundo escuro (CDN da ESPN). */
  escudo: string
  escudoEscuro: string
  vitorias: number
  derrotas: number
  /** Aproveitamento de 0 a 1. */
  aproveitamento: number
  /** Jogos atrás do líder da conferência (0 para o líder). */
  atras: number
  /** Ex.: "V3" (três vitórias seguidas) ou "D2". */
  sequencia: string
}

export interface Tabela {
  leste: LinhaTabela[]
  oeste: LinhaTabela[]
}

// A ESPN abrevia alguns times de outro jeito.
const SIGLA_ESPN: Record<string, string> = { GS: 'GSW', SA: 'SAS', NY: 'NYK', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS' }
const COR = new Map(TIMES.map((t) => [t.sigla, t.cor]))
// O CDN da ESPN usa a sigla dela em minúsculas; o "combiner" já entrega o escudo pequeno (56 px, nítido em tela retina).
const escudo = (siglaEspn: string, variante: '500' | '500-dark') =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/${variante}/${siglaEspn.toLowerCase()}.png&h=56&w=56`

interface RespostaEspn {
  children?: {
    abbreviation?: string
    name?: string
    standings?: {
      entries?: {
        team?: { abbreviation?: string; displayName?: string }
        stats?: { name: string; value?: number; displayValue?: string }[]
      }[]
    }
  }[]
}

function linhas(entradas: NonNullable<NonNullable<RespostaEspn['children']>[number]['standings']>['entries']): LinhaTabela[] {
  return (entradas ?? [])
    .map((e) => {
      const stat = (nome: string) => e.stats?.find((s) => s.name === nome)
      const num = (nome: string) => Number(stat(nome)?.value ?? 0) || 0
      const siglaEspn = e.team?.abbreviation ?? ''
      const sigla = SIGLA_ESPN[siglaEspn] ?? siglaEspn
      const seq = stat('streak')?.displayValue ?? ''
      return {
        posicao: num('playoffSeed'),
        sigla,
        nome: e.team?.displayName ?? sigla,
        cor: COR.get(sigla) ?? '#6b6b6b',
        escudo: escudo(siglaEspn, '500'),
        escudoEscuro: escudo(siglaEspn, '500-dark'),
        vitorias: num('wins'),
        derrotas: num('losses'),
        aproveitamento: num('winPercent'),
        atras: num('gamesBehind'),
        // "W3"/"L2" em inglês vira "V3"/"D2".
        sequencia: seq.replace(/^W/, 'V').replace(/^L/, 'D'),
      }
    })
    .filter((l) => l.sigla && l.posicao > 0)
    .sort((a, b) => a.posicao - b.posicao)
}

/** Da resposta da ESPN para as duas conferências, em ordem de classificação. */
export function lerTabela(json: unknown): Tabela {
  const conferencias = ((json ?? {}) as RespostaEspn).children ?? []
  const achar = (leste: boolean) =>
    conferencias.find((c) => (leste ? /east/i : /west/i).test(`${c.abbreviation} ${c.name}`))?.standings?.entries
  return { leste: linhas(achar(true)), oeste: linhas(achar(false)) }
}

export const buscarTabela = comValidade('bp.nba.tabela', 15 * 60_000, async () => {
  const falhou = new Error('Não foi possível carregar a classificação da NBA agora.')
  const resposta = await fetch(URL_TABELA).catch(() => {
    throw falhou
  })
  if (!resposta.ok) throw falhou
  const tabela = lerTabela(await resposta.json())
  if (!tabela.leste.length || !tabela.oeste.length) throw new Error('A classificação da NBA veio vazia. Tente de novo mais tarde.')
  return tabela
})

/** "0,750" vira ".750", como nas tabelas americanas. */
export const aproveitamento = (v: number) => v.toFixed(3).replace(/^0/, '')
/** Jogos atrás: "—" para o líder, "2,5" para os outros. */
export const jogosAtras = (v: number) => (v ? v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—')
