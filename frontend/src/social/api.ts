import { fuso, request } from '../api'
import { invalidar, useRecurso } from '../store'

export type MetricaRanking = 'lances_livres' | 'desafio' | 'quiz' | 'sequencia' | 'cartao'
export type MetricaDesafio = 'lances_livres' | 'cestas' | 'minutos' | 'desafio' | 'quiz'
export type Periodo = 'semana' | 'geral'
export type Escopo = 'todos' | 'amigos'

export const METRICAS_RANKING: { id: MetricaRanking; rotulo: string; unidade: (p: Periodo) => string }[] = [
  { id: 'lances_livres', rotulo: 'Lances livres', unidade: () => 'cestas' },
  { id: 'desafio', rotulo: 'Desafio do dia', unidade: () => 'cestas' },
  { id: 'quiz', rotulo: 'Quiz', unidade: () => 'acertos' },
  { id: 'sequencia', rotulo: 'Sequência', unidade: (p) => (p === 'semana' ? 'dias na semana' : 'dias seguidos') },
  { id: 'cartao', rotulo: 'Nota do cartão', unidade: (p) => (p === 'semana' ? 'nota do mês' : 'melhor nota') },
]

export const METRICAS_DESAFIO: { id: MetricaDesafio; rotulo: string; unidade: string }[] = [
  { id: 'lances_livres', rotulo: 'Quem acerta mais lances livres', unidade: 'cestas' },
  { id: 'cestas', rotulo: 'Quem faz mais cestas no treino', unidade: 'cestas' },
  { id: 'minutos', rotulo: 'Quem treina mais minutos', unidade: 'min' },
  { id: 'desafio', rotulo: 'Quem faz mais no desafio do dia', unidade: 'cestas' },
  { id: 'quiz', rotulo: 'Quem acerta mais no quiz', unidade: 'acertos' },
]

export interface Perfil {
  apelido: string
  publico: boolean
  convite: string
  amigos: number
}

export interface LinhaRanking {
  posicao: number
  apelido: string
  valor: number
  eu: boolean
  amigo: boolean
}

export interface Ranking {
  temPerfil: boolean
  linhas: LinhaRanking[]
  eu: LinhaRanking | null
  total: number
}

export interface Amigo {
  id: number
  apelido: string
}

export interface DesafioAmigo {
  id: number
  metrica: MetricaDesafio
  inicio: string
  fim: string
  status: 'pendente' | 'aceito' | 'recusado' | 'cancelado' | 'encerrado' | 'expirado'
  papel: 'desafiante' | 'desafiado'
  amigo: Amigo
  placar: { eu: number; amigo: number } | null
  resultado: 'vitoria' | 'derrota' | 'empate' | null
}

interface ProfileApi {
  nickname: string
  public: boolean
  inviteCode: string
  friends: number
}

interface EntryApi {
  position: number
  nickname: string
  value: number
  me: boolean
  friend: boolean
}

interface ChallengeApi {
  id: number
  metric: MetricaDesafio
  weekStart: string
  weekEnd: string
  status: DesafioAmigo['status']
  role: DesafioAmigo['papel']
  friend: { id: number; nickname: string }
  score: { me: number; friend: number } | null
  result: DesafioAmigo['resultado']
}

const paraPerfil = (p: ProfileApi | null): Perfil | null => (p ? { apelido: p.nickname, publico: p.public, convite: p.inviteCode, amigos: p.friends } : null)
const paraLinha = (e: EntryApi): LinhaRanking => ({ posicao: e.position, apelido: e.nickname, valor: e.value, eu: e.me, amigo: e.friend })
const paraDesafio = (c: ChallengeApi): DesafioAmigo => ({
  id: c.id,
  metrica: c.metric,
  inicio: c.weekStart,
  fim: c.weekEnd,
  status: c.status,
  papel: c.role,
  amigo: { id: c.friend.id, apelido: c.friend.nickname },
  placar: c.score ? { eu: c.score.me, amigo: c.score.friend } : null,
  resultado: c.result,
})

export const apiSocial = {
  perfil: async () => paraPerfil(await request<ProfileApi | null>('GET', '/social/profile')),
  async salvarPerfil(apelido: string, publico: boolean) {
    const perfil = paraPerfil(await request<ProfileApi>('PUT', '/social/profile', { nickname: apelido, public: publico }))
    invalidar('social')
    return perfil!
  },
  async sairDoRanking() {
    await request('DELETE', '/social/profile')
    invalidar('social')
  },
  async novoConvite() {
    await request('POST', '/social/profile/invite')
    invalidar('social:perfil')
  },
  convite: async (codigo: string) => {
    const r = await request<{ nickname: string; self: boolean; alreadyFriends: boolean }>('GET', `/social/invites/${encodeURIComponent(codigo)}`)
    return { apelido: r.nickname, proprio: r.self, jaAmigos: r.alreadyFriends }
  },
  async aceitarConvite(codigo: string) {
    const r = await request<{ id: number; nickname: string }>('POST', '/social/friends', { code: codigo })
    invalidar('social')
    return { id: r.id, apelido: r.nickname }
  },
  amigos: async () => (await request<{ id: number; nickname: string }[]>('GET', '/social/friends')).map((a) => ({ id: a.id, apelido: a.nickname })),
  async desfazerAmizade(id: number) {
    await request('DELETE', `/social/friends/${id}`)
    invalidar('social')
  },
  async ranking(metrica: MetricaRanking, periodo: Periodo, escopo: Escopo): Promise<Ranking> {
    const r = await request<{ hasProfile: boolean; entries: EntryApi[]; me: EntryApi | null; total: number }>(
      'GET',
      `/social/ranking?metric=${metrica}&period=${periodo}&scope=${escopo}&${fuso()}`,
    )
    return { temPerfil: r.hasProfile, linhas: r.entries.map(paraLinha), eu: r.me ? paraLinha(r.me) : null, total: r.total }
  },
  desafios: async () => (await request<ChallengeApi[]>('GET', `/social/challenges?${fuso()}`)).map(paraDesafio),
  async desafiar(amigoId: number, metrica: MetricaDesafio) {
    const r = paraDesafio(await request<ChallengeApi>('POST', `/social/challenges?${fuso()}`, { opponentId: amigoId, metric: metrica }))
    invalidar('social:desafios')
    return r
  },
  async responder(id: number, acao: 'accept' | 'decline' | 'cancel') {
    const r = paraDesafio(await request<ChallengeApi>('POST', `/social/challenges/${id}/${acao}?${fuso()}`))
    invalidar('social:desafios')
    return r
  },
}

export const usePerfil = () => {
  const { dados, ...resto } = useRecurso('social:perfil', apiSocial.perfil)
  return { perfil: dados, carregado: dados !== undefined, ...resto }
}

export const useRanking = (metrica: MetricaRanking, periodo: Periodo, escopo: Escopo) => {
  const { dados, ...resto } = useRecurso(`social:ranking:${metrica}:${periodo}:${escopo}`, () => apiSocial.ranking(metrica, periodo, escopo))
  return { ranking: dados, ...resto }
}

export const useAmigos = () => {
  const { dados, ...resto } = useRecurso('social:amigos', apiSocial.amigos)
  return { amigos: dados, ...resto }
}

export const useDesafiosAmigos = () => {
  const { dados, ...resto } = useRecurso('social:desafios', apiSocial.desafios)
  return { desafios: dados, ...resto }
}

/** Endereço do convite, para copiar ou compartilhar. */
export const linkConvite = (codigo: string) => `${window.location.origin}${import.meta.env.BASE_URL}convite/${codigo}`
