// Escudos dos times no CDN da ESPN, que usa a sigla dela em minúsculas (GS, SA, NY, UTAH…).
// O "combiner" já entrega a imagem pequena (56 px, nítida em tela retina).
import { TIMES } from '../equipamentos/dados'

export interface Escudos {
  /** Versão para fundo claro. */
  escudo: string
  /** Versão para fundo escuro. */
  escudoEscuro: string
}

// A ESPN abrevia alguns times de outro jeito.
export const SIGLA_ESPN: Record<string, string> = { GS: 'GSW', SA: 'SAS', NY: 'NYK', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS' }
const DO_SITE_PARA_ESPN = Object.fromEntries(Object.entries(SIGLA_ESPN).map(([espn, site]) => [site, espn]))

const url = (siglaEspn: string, variante: '500' | '500-dark') =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/${variante}/${siglaEspn.toLowerCase()}.png&h=56&w=56`

export const escudos = (siglaEspn: string): Escudos => ({ escudo: url(siglaEspn, '500'), escudoEscuro: url(siglaEspn, '500-dark') })

export interface TimeCitado extends Escudos {
  sigla: string
  nome: string
}

// Apelidos que a imprensa usa além do nome oficial.
const APELIDOS: Record<string, string[]> = {
  PHI: ['Sixers'],
  CLE: ['Cavs'],
  POR: ['Blazers'],
  MIN: ['Wolves'],
  DAL: ['Mavs'],
}
// Nome com inicial maiúscula e palavra inteira: "Heat" é o time, "heat" não.
const PADROES = TIMES.map((t) => {
  const nomes = [t.nome, ...(APELIDOS[t.sigla] ?? [])].map((n) => n.replace(/\s+/g, '\\s+'))
  return { time: t, padrao: new RegExp(`(?<![\\w-])(?:${nomes.join('|')})(?![\\w-])`) }
})

/** Times citados no texto, na ordem em que aparecem (no máximo `limite`). */
export function timesCitados(texto: string, limite = 3): TimeCitado[] {
  // Gente cujo nome tem o de um time.
  texto = texto.replace(/Magic\s+Johnson/g, '')
  return PADROES.flatMap(({ time, padrao }) => {
    const achado = padrao.exec(texto)
    return achado ? [{ time, onde: achado.index }] : []
  })
    .sort((a, b) => a.onde - b.onde)
    .slice(0, limite)
    .map(({ time }) => ({ sigla: time.sigla, nome: `${time.cidade} ${time.nome}`, ...escudos(DO_SITE_PARA_ESPN[time.sigla] ?? time.sigla) }))
}
