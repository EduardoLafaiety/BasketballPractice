// Líderes da temporada da NBA, por categoria, lidos da API pública da ESPN (aceita chamada direto do
// navegador, então funciona também na demonstração sem servidor). Guardados por 15 minutos no
// aparelho para não buscar de novo a cada página.

export const URL_LIDERES = 'https://site.api.espn.com/apis/site/v3/sports/basketball/nba/leaders'
const VALIDADE_MS = 15 * 60_000
const CHAVE = 'bp.nba.lideres'

export interface Categoria {
  /** Nome da categoria na ESPN. */
  id: string
  rotulo: string
  /** Como o número é lido: "39,3 pontos por jogo". */
  unidade: string
  /** Rótulo curto para a barra de notícias. */
  curto: string
}

export const CATEGORIAS: Categoria[] = [
  { id: 'pointsPerGame', rotulo: 'Pontos', unidade: 'pontos por jogo', curto: 'pontos' },
  { id: 'reboundsPerGame', rotulo: 'Rebotes', unidade: 'rebotes por jogo', curto: 'rebotes' },
  { id: 'assistsPerGame', rotulo: 'Assistências', unidade: 'assistências por jogo', curto: 'assistências' },
  { id: 'blocksPerGame', rotulo: 'Tocos', unidade: 'tocos por jogo', curto: 'tocos' },
  { id: 'stealsPerGame', rotulo: 'Roubos de bola', unidade: 'roubos por jogo', curto: 'roubos' },
  { id: '3PointsMadePerGame', rotulo: 'Bolas de 3', unidade: 'cestas de 3 por jogo', curto: 'bolas de 3' },
]

export interface Lider {
  posicao: number
  nome: string
  time: string
  sigla: string
  /** Cor do time, em hexadecimal com #. */
  cor: string
  valor: number
}

export interface Lideres {
  temporada: string
  categorias: { categoria: Categoria; lideres: Lider[] }[]
}

// Só os campos usados da resposta da ESPN.
interface RespostaEspn {
  currentSeason?: { displayName?: string }
  leaders?: {
    categories?: {
      name: string
      leaders?: {
        value: number
        athlete?: { displayName?: string }
        team?: { displayName?: string; abbreviation?: string; color?: string }
      }[]
    }[]
  }
}

/** Da resposta da ESPN para as categorias do site, na ordem de CATEGORIAS; ignora o que vier faltando. */
export function lerLideres(json: unknown): Lideres {
  const r = (json ?? {}) as RespostaEspn
  const daEspn = r.leaders?.categories ?? []
  const categorias = CATEGORIAS.flatMap((categoria) => {
    const achada = daEspn.find((c) => c.name === categoria.id)
    const lideres = (achada?.leaders ?? [])
      .filter((l) => l.athlete?.displayName && Number.isFinite(l.value))
      .map((l, i) => ({
        posicao: i + 1,
        nome: l.athlete!.displayName!,
        time: l.team?.displayName ?? '',
        sigla: l.team?.abbreviation ?? '',
        cor: /^[0-9a-f]{6}$/i.test(l.team?.color ?? '') ? `#${l.team!.color}` : '#6b6b6b',
        valor: l.value,
      }))
    return lideres.length ? [{ categoria, lideres }] : []
  })
  return { temporada: r.currentSeason?.displayName ?? '', categorias }
}

/** "39,3": uma casa decimal, com vírgula. */
export const numero = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

let emMemoria: { quando: number; dados: Lideres } | null = null

function guardado(): { quando: number; dados: Lideres } | null {
  if (emMemoria) return emMemoria
  try {
    const salvo = sessionStorage.getItem(CHAVE)
    return salvo ? JSON.parse(salvo) : null
  } catch {
    return null
  }
}

/** Líderes da temporada; usa o que já foi buscado nos últimos 15 minutos. */
export async function buscarLideres(agora = Date.now()): Promise<Lideres> {
  const antes = guardado()
  if (antes && agora - antes.quando < VALIDADE_MS) return antes.dados
  const falhou = new Error('Não foi possível carregar as estatísticas da NBA agora.')
  const resposta = await fetch(URL_LIDERES).catch(() => {
    throw falhou
  })
  if (!resposta.ok) throw falhou
  const dados = lerLideres(await resposta.json())
  if (!dados.categorias.length) throw new Error('As estatísticas da NBA vieram vazias. Tente de novo mais tarde.')
  emMemoria = { quando: agora, dados }
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(emMemoria))
  } catch {
    // sem armazenamento: fica só na memória
  }
  return dados
}

/** Para os testes: esquece o que foi guardado. */
export function esquecerLideres() {
  emMemoria = null
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    // nada guardado
  }
}
