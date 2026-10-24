export type Categoria =
  | 'Arremesso'
  | 'Drible'
  | 'Passe'
  | 'Finalização'
  | 'Defesa'
  | 'Condicionamento'

/** Como o treino é medido: acertos/tentativas, repetições ou tempo. */
export type Metrica = 'acertos' | 'repeticoes' | 'tempo'

export interface Drill {
  id: string
  nome: string
  categoria: Categoria
  metrica: Metrica
  descricao: string
  /** Criado pelo próprio atleta (não faz parte do catálogo padrão). */
  personalizado: boolean
}

export interface Sessao {
  id: string
  drillId?: string
  drillNome?: string
  data: string // ISO
  duracaoMin: number
  acertos?: number
  tentativas?: number
  repeticoes?: number
  segundos?: number
  esforco?: number // 1–5
  cansaco?: number // 1–5
  notas?: string
  /** Maior sequência de acertos entre os exercícios da sessão. */
  sequencia?: number
  entradas: Entrada[]
  zonas: ArremessosZona[]
}

export interface Resumo {
  sessoes: number
  minutos: number
  acertos: number
  tentativas: number
  esforcoMedio?: number
  cansacoMedio?: number
  semanas: Semana[]
}

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Rotina = Record<DiaSemana, string[]>

/** Zonas da meia-quadra do shot chart (mesmos ids do backend). */
export type Zona =
  | 'garrafao'
  | 'lance_livre'
  | 'media_canto_e'
  | 'media_ala_e'
  | 'media_topo'
  | 'media_ala_d'
  | 'media_canto_d'
  | 'tres_canto_e'
  | 'tres_ala_e'
  | 'tres_topo'
  | 'tres_ala_d'
  | 'tres_canto_d'

export interface ArremessosZona {
  zona: Zona
  acertos: number
  tentativas: number
}

/** Um exercício feito dentro de uma sessão. */
export interface Entrada {
  drillId: string
  drillNome?: string
  acertos?: number
  tentativas?: number
  repeticoes?: number
  segundos?: number
  /** Maior sequência de acertos seguidos. */
  sequencia?: number
}

export interface NovaSessao {
  data: string // ISO
  duracaoMin: number
  esforco?: number // 1–5
  cansaco?: number // 1–5
  notas?: string
  workoutId?: number
  entradas: Entrada[]
  zonas?: ArremessosZona[]
}

export interface Semana {
  inicio: string // AAAA-MM-DD (segunda-feira)
  sessoes: number
  minutos: number
  acertos: number
  tentativas: number
}

export type TipoMeta =
  | 'aproveitamento'
  | 'sessoes_semana'
  | 'minutos_semana'
  | 'sessoes_total'
  | 'minutos_total'
  | 'cestas_total'
  | 'dias_seguidos'

export interface Meta {
  id: string
  titulo: string
  tipo: TipoMeta
  alvo: number
  atual: number
  concluida: boolean
  drillId?: string
  drillNome?: string
  prazo?: string // AAAA-MM-DD
}

export interface Conquista {
  id: string
  titulo: string
  descricao: string
  alvo: number
  progresso: number
  desbloqueada: boolean
}

export interface Progresso {
  sequenciaAtual: number
  melhorSequencia: number
  conquistas: Conquista[]
}

export type TipoTeste = 'impulsao' | 'sprint' | 'agilidade' | 'suicidio' | 'lances_1min'

export interface InfoTeste {
  tipo: TipoTeste
  nome: string
  unidade: string
  melhor: 'higher' | 'lower'
}

export interface TesteFisico {
  id: string
  tipo: TipoTeste
  valor: number
  data: string // ISO
  notas?: string
}

export interface ModeloRotina {
  id: string
  nome: string
  descricao: string
  dias: Rotina
}

export interface BlocoPlano {
  drillId: string
  nome: string
  categoria: Categoria
  metrica: Metrica
  minutos: number
}

export type Tema = 'sistema' | 'claro' | 'escuro'

export interface Config {
  tema: Tema
  lembretes: { ativo: boolean; horario: string; dias: DiaSemana[] }
  metronomoBpm: number
}
