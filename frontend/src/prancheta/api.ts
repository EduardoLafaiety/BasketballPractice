import { request } from '../api'

export type TipoPeca = 'ataque' | 'defesa' | 'bola'
export type TipoSeta = 'movimento' | 'passe' | 'drible' | 'bloqueio'
export type TipoQuadra = 'meia' | 'inteira'

export interface Peca {
  tipo: TipoPeca
  x: number
  y: number
  rotulo?: string
}

export interface Seta {
  tipo: TipoSeta
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Jogada {
  id?: number
  nome: string
  quadra: TipoQuadra
  pecas: Peca[]
  setas: Seta[]
  notas?: string
  atualizadaEm?: string
}

/** Tamanho do desenho (mesma escala da meia-quadra do mapa de arremessos). */
export const TAMANHO: Record<TipoQuadra, { largura: number; altura: number }> = {
  meia: { largura: 500, altura: 470 },
  inteira: { largura: 500, altura: 940 },
}

interface PlayApi {
  id: number
  name: string
  court: TipoQuadra
  pieces: { kind: TipoPeca; x: number; y: number; label?: string | null }[]
  arrows: { kind: TipoSeta; x1: number; y1: number; x2: number; y2: number }[]
  notes: string | null
  updatedAt: string
}

const arredondar = (n: number) => Math.round(n * 10) / 10

const paraJogada = (p: PlayApi): Jogada => ({
  id: p.id,
  nome: p.name,
  quadra: p.court,
  pecas: p.pieces.map((x) => ({ tipo: x.kind, x: x.x, y: x.y, rotulo: x.label ?? undefined })),
  setas: p.arrows.map((a) => ({ tipo: a.kind, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2 })),
  notas: p.notes ?? undefined,
  atualizadaEm: p.updatedAt,
})

const paraApi = (j: Jogada) => ({
  name: j.nome,
  court: j.quadra,
  pieces: j.pecas.map((p) => ({ kind: p.tipo, x: arredondar(p.x), y: arredondar(p.y), label: p.rotulo ?? null })),
  arrows: j.setas.map((s) => ({ kind: s.tipo, x1: arredondar(s.x1), y1: arredondar(s.y1), x2: arredondar(s.x2), y2: arredondar(s.y2) })),
  notes: j.notas?.trim() || null,
})

export const apiPrancheta = {
  lista: async () => (await request<PlayApi[]>('GET', '/plays')).map(paraJogada),
  salvar: async (j: Jogada) =>
    paraJogada(await (j.id ? request<PlayApi>('PUT', `/plays/${j.id}`, paraApi(j)) : request<PlayApi>('POST', '/plays', paraApi(j)))),
  remover: (id: number) => request<null>('DELETE', `/plays/${id}`),
}
