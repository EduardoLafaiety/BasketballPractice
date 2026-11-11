import { request } from '../api'
import { invalidar, useRecurso } from '../store'

export interface Jogo {
  id?: number
  data: string // AAAA-MM-DD
  adversario?: string
  placarTime?: number
  placarAdversario?: number
  minutos?: number
  pontos: number
  rebotes: number
  assistencias: number
  roubos: number
  tocos: number
  erros: number
  cestas: number
  tentativas: number
  cestasTres: number
  tentativasTres: number
  lancesCertos: number
  lancesTentados: number
  notas?: string
}

interface GameApi {
  id: number
  playedOn: string
  opponent: string | null
  teamScore: number | null
  oppScore: number | null
  minutes: number | null
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fgMade: number
  fgAtt: number
  threeMade: number
  threeAtt: number
  ftMade: number
  ftAtt: number
  notes: string | null
}

export interface Comparacao {
  jogos: number
  medias: { pontos: number | null; rebotes: number | null; assistencias: number | null }
  arremessos: Record<'geral' | 'tres' | 'lances', { jogo: number | null; treino: number | null; tentativasJogo: number; tentativasTreino: number }>
}

const opcional = (n: number | null) => (n === null ? undefined : n)

const paraJogo = (g: GameApi): Jogo => ({
  id: g.id,
  data: g.playedOn,
  adversario: g.opponent ?? undefined,
  placarTime: opcional(g.teamScore),
  placarAdversario: opcional(g.oppScore),
  minutos: opcional(g.minutes),
  pontos: g.points,
  rebotes: g.rebounds,
  assistencias: g.assists,
  roubos: g.steals,
  tocos: g.blocks,
  erros: g.turnovers,
  cestas: g.fgMade,
  tentativas: g.fgAtt,
  cestasTres: g.threeMade,
  tentativasTres: g.threeAtt,
  lancesCertos: g.ftMade,
  lancesTentados: g.ftAtt,
  notas: g.notes ?? undefined,
})

const paraApi = (j: Jogo) => ({
  playedOn: j.data,
  opponent: j.adversario?.trim() || null,
  teamScore: j.placarTime ?? null,
  oppScore: j.placarAdversario ?? null,
  minutes: j.minutos ?? null,
  points: j.pontos,
  rebounds: j.rebotes,
  assists: j.assistencias,
  steals: j.roubos,
  blocks: j.tocos,
  turnovers: j.erros,
  fgMade: j.cestas,
  fgAtt: j.tentativas,
  threeMade: j.cestasTres,
  threeAtt: j.tentativasTres,
  ftMade: j.lancesCertos,
  ftAtt: j.lancesTentados,
  notes: j.notas?.trim() || null,
})

type Tiro = { game: number | null; practice: number | null; gameAttempts: number; practiceAttempts: number }
interface ComparacaoApi {
  games: number
  averages: { points: number | null; rebounds: number | null; assists: number | null }
  shooting: { overall: Tiro; three: Tiro; freeThrow: Tiro }
}

const paraTiro = (t: Tiro) => ({ jogo: t.game, treino: t.practice, tentativasJogo: t.gameAttempts, tentativasTreino: t.practiceAttempts })

export const apiJogos = {
  lista: async () => (await request<GameApi[]>('GET', '/games')).map(paraJogo),
  comparacao: async (): Promise<Comparacao> => {
    const c = await request<ComparacaoApi>('GET', '/games/comparison')
    return {
      jogos: c.games,
      medias: { pontos: c.averages.points, rebotes: c.averages.rebounds, assistencias: c.averages.assists },
      arremessos: { geral: paraTiro(c.shooting.overall), tres: paraTiro(c.shooting.three), lances: paraTiro(c.shooting.freeThrow) },
    }
  },
  async salvar(j: Jogo) {
    const salvo = paraJogo(await (j.id ? request<GameApi>('PUT', `/games/${j.id}`, paraApi(j)) : request<GameApi>('POST', '/games', paraApi(j))))
    invalidar('jogos')
    return salvo
  },
  async remover(id: number) {
    await request('DELETE', `/games/${id}`)
    invalidar('jogos')
  },
}

export const useJogos = () => {
  const { dados, ...resto } = useRecurso('jogos:lista', apiJogos.lista)
  return { jogos: dados, ...resto }
}

export const useComparacao = () => {
  const { dados, ...resto } = useRecurso('jogos:comparacao', apiJogos.comparacao)
  return { comparacao: dados, ...resto }
}

/** Pontos que os arremessos anotados somam: 2 por cesta, 1 a mais na de três, 1 por lance livre. */
export const pontosDosArremessos = (j: Pick<Jogo, 'cestas' | 'cestasTres' | 'lancesCertos'>) => 2 * j.cestas + j.cestasTres + j.lancesCertos
