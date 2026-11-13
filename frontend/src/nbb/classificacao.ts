// Classificação, líderes e notícias do NBB (Novo Basquete Brasil). A LNB não tem API e o navegador não pode ler o site
// dela, então tudo vira um JSON ao publicar o site (backend/src/scripts/export-nbb.ts, ver .github/workflows/demo.yml).
import { comValidade } from '../nba/cache'
import type { TimeNoCartao } from '../nba/cartoes'

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

export interface LiderNbb {
  posicao: number
  /** Como a LNB mostra: sobrenome ou apelido e camisa ("Dupree #11"). */
  nome: string
  time: string
  /** Vazios quando o nome do time não bate com o da classificação. */
  sigla: string
  escudo: string
  /** Média por jogo. */
  valor: number
}

export interface CategoriaNbb {
  id: string
  rotulo: string
  unidade: string
  curto: string
  lideres: LiderNbb[]
}

export interface NoticiaNbb {
  url: string
  titulo: string
  resumo: string
  imagem: string | null
  /** Dia da publicação, AAAA-MM-DD (a LNB não mostra a hora). */
  data: string
}

export interface TabelaNbb {
  /** Ex.: "2026/27". */
  temporada: string
  /** Quando foi lido da LNB (ISO). */
  atualizada: string
  linhas: LinhaNbb[]
  categorias: CategoriaNbb[]
  noticias: NoticiaNbb[]
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

interface LiderJson {
  position?: number
  name?: string
  team?: string
  teamAbbreviation?: string
  teamLogo?: string
  value?: number
}

interface CategoriaJson {
  id?: string
  label?: string
  unit?: string
  short?: string
  leaders?: LiderJson[]
}

interface NoticiaJson {
  url?: string
  title?: string
  summary?: string
  image?: string
  date?: string
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const https = (v: unknown) => (typeof v === 'string' && v.startsWith('https://') ? v : '')
const lista = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** Do JSON gerado na publicação para as três partes; o que vier incompleto fica de fora, sem quebrar o resto. */
export function lerNbb(json: unknown): TabelaNbb {
  const { season, updatedAt, teams, leaders, news } = (json ?? {}) as { season?: string; updatedAt?: string; teams?: unknown; leaders?: unknown; news?: unknown }

  const linhas = lista<TimeJson>(teams)
    .filter((t) => num(t.position) > 0 && t.abbreviation && t.name && https(t.logo))
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

  const categorias = lista<CategoriaJson>(leaders).flatMap((c) => {
    const lideres = lista<LiderJson>(c.leaders)
      .filter((l) => num(l.position) > 0 && l.name && Number.isFinite(l.value))
      .map((l) => ({ posicao: num(l.position), nome: l.name!, time: l.team ?? '', sigla: l.teamAbbreviation ?? '', escudo: https(l.teamLogo), valor: num(l.value) }))
      .sort((a, b) => a.posicao - b.posicao)
    return c.id && c.label && lideres.length ? [{ id: c.id, rotulo: c.label, unidade: c.unit ?? '', curto: c.short ?? c.label.toLowerCase(), lideres }] : []
  })

  const noticias = lista<NoticiaJson>(news)
    .filter((n) => https(n.url) && n.title && /^\d{4}-\d{2}-\d{2}$/.test(n.date ?? ''))
    .map((n) => ({ url: n.url!, titulo: n.title!, resumo: n.summary ?? '', imagem: https(n.image) || null, data: n.date! }))

  // "2026/2027" vira "2026/27".
  const temporada = (season ?? '').replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2')
  return { temporada, atualizada: updatedAt ?? '', linhas, categorias, noticias }
}

export const buscarNbb = comValidade('bp.nbb.classificacao', 15 * 60_000, async () => {
  const falhou = new Error('Os dados da NBB não estão disponíveis agora.')
  const resposta = await fetch(`${import.meta.env.BASE_URL}nbb.json`).catch(() => {
    throw falhou
  })
  if (!resposta.ok) throw falhou
  const tabela = lerNbb(await resposta.json().catch(() => null))
  // Só é erro se a LNB não entregou nada; uma parte que faltou o resto da página mostra o aviso dela.
  if (!tabela.linhas.length && !tabela.categorias.length && !tabela.noticias.length) throw falhou
  return tabela
})

/** Saldo de pontos com sinal: "+144", "-12", "0". */
export const saldoComSinal = (v: number) => (v > 0 ? `+${v}` : String(v))

/** "hoje", "ontem" ou "há 3 dias", para um dia AAAA-MM-DD (as notícias da LNB só trazem o dia, não a hora). */
export function diaRelativo(data: string, agora = new Date()): string {
  const [a, m, d] = data.split('-').map(Number)
  const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const dias = Math.round((hoje - Date.UTC(a, m - 1, d)) / 86_400_000)
  return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`
}

// Como a imprensa chama os times, além do nome inteiro da classificação. Maiúscula e palavra inteira: "Pato" é o time,
// "pato" não. O Corinthians sozinho é o COR; o Ceisc/União Corinthians é outro time.
const APELIDOS: Record<string, string[]> = {
  MIN: ['Minas(?! Gerais)'],
  MOG: ['Mogi'],
  PIN: ['Pinheiros'],
  FLA: ['Flamengo'],
  UFC: ['Unifacisa'],
  FRA: ['Sesi Franca', 'Franca'],
  UCO: ['Ceisc', 'União Corinthians'],
  BRA: ['Brasília'],
  CRU: ['Cruzeiro'],
  CAP: ['Paulistano'],
  BAU: ['Bauru'],
  COR: ['Corinthians'],
  SJO: ['São José'],
  BOT: ['Botafogo'],
  PAT: ['Pato'],
  OSA: ['Osasco'],
  BCE: ['Cearense'],
  CAX: ['Caxias'],
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/**
 * Times da classificação citados no texto, na ordem em que aparecem (no máximo `limite`). Os de nome mais longo vão primeiro
 * e "consomem" o trecho que acharam, para "Ceisc/União Corinthians" não contar também como o Corinthians.
 */
export function timesCitadosNbb(texto: string, linhas: LinhaNbb[], limite = 3): TimeNoCartao[] {
  let restante = texto
  return [...linhas]
    .sort((a, b) => b.nome.length - a.nome.length)
    .flatMap((l) => {
      const nomes = [escapar(l.nome), ...(APELIDOS[l.sigla] ?? [])]
      const achado = new RegExp(`(?<![\\wÀ-ÿ-])(?:${nomes.join('|')})(?![\\wÀ-ÿ-])`).exec(restante)
      if (!achado) return []
      restante = restante.slice(0, achado.index) + ' '.repeat(achado[0].length) + restante.slice(achado.index + achado[0].length)
      return [{ onde: achado.index, time: { sigla: l.sigla, nome: l.nome, escudo: l.escudo, escudoEscuro: l.escudo } }]
    })
    .sort((a, b) => a.onde - b.onde)
    .slice(0, limite)
    .map((x) => x.time)
}
