import { dataLocal } from '../../../shared/api/backend'
import type { Categoria, Drill, Sessao } from '../../../shared/types'

// Conquistas e overall saem do histórico de sessões do atleta: nada é guardado à parte, então apagar
// uma sessão também tira o que ela rendeu.

export interface Conquista {
  /** Também escolhe o sprite em spritesConquistas.ts. */
  id: string
  titulo: string
  descricao: string
  /** Pontos que a conquista rende, como a pontuação dos jogos antigos. */
  pontos: number
  alvo: number
  progresso: number
  desbloqueada: boolean
}

export interface Estatisticas {
  sessoes: number
  minutos: number
  acertos: number
  /** Maior número de acertos somados em um mesmo dia. */
  acertosNoMelhorDia: number
  melhorSequenciaDeDias: number
  melhorSequenciaDeAcertos: number
}

const num = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)
const acertosDaSessao = (s: Sessao) => (s.acertos != null ? num(s.acertos) : s.entradas.reduce((t, e) => t + num(e.acertos), 0))

export function estatisticas(sessoes: Sessao[]): Estatisticas {
  const porDia = new Map<string, number>()
  let minutos = 0
  let acertos = 0
  let melhorSequenciaDeAcertos = 0
  for (const s of sessoes) {
    const dia = dataLocal(new Date(s.data))
    const a = acertosDaSessao(s)
    porDia.set(dia, (porDia.get(dia) ?? 0) + a)
    minutos += num(s.duracaoMin)
    acertos += a
    const seq = Math.max(num(s.sequencia), ...s.entradas.map((e) => num(e.sequencia)))
    melhorSequenciaDeAcertos = Math.max(melhorSequenciaDeAcertos, seq)
  }
  // Dias seguidos: percorre os dias com treino em ordem; meio-dia evita erro com horário de verão.
  const dias = [...porDia.keys()].sort()
  let melhorSequenciaDeDias = 0
  let atual = 0
  let anterior: number | undefined
  for (const d of dias) {
    const [a, m, dd] = d.split('-').map(Number)
    const t = Math.round(new Date(a, m - 1, dd, 12).getTime() / 86_400_000)
    atual = anterior !== undefined && t - anterior === 1 ? atual + 1 : 1
    anterior = t
    melhorSequenciaDeDias = Math.max(melhorSequenciaDeDias, atual)
  }
  return {
    sessoes: sessoes.length,
    minutos,
    acertos,
    acertosNoMelhorDia: Math.max(0, ...porDia.values()),
    melhorSequenciaDeDias,
    melhorSequenciaDeAcertos,
  }
}

const DEFINICOES: { id: string; pontos: number; titulo: string; descricao: string; alvo: number; valor: (e: Estatisticas) => number }[] = [
  { id: 'primeira-sessao', pontos: 10, titulo: 'Primeiro treino', descricao: 'Registre sua primeira sessão de treino', alvo: 1, valor: (e) => e.sessoes },
  { id: '10-sessoes', pontos: 20, titulo: 'Pegando o ritmo', descricao: 'Registre 10 sessões de treino', alvo: 10, valor: (e) => e.sessoes },
  { id: '50-sessoes', pontos: 40, titulo: 'Rato de quadra', descricao: 'Registre 50 sessões de treino', alvo: 50, valor: (e) => e.sessoes },
  { id: '100-sessoes', pontos: 80, titulo: 'Lenda da quadra', descricao: 'Registre 100 sessões de treino', alvo: 100, valor: (e) => e.sessoes },
  { id: '3-dias', pontos: 10, titulo: 'Aquecendo', descricao: 'Treine 3 dias seguidos', alvo: 3, valor: (e) => e.melhorSequenciaDeDias },
  { id: '7-dias', pontos: 30, titulo: 'Semana perfeita', descricao: 'Treine 7 dias seguidos', alvo: 7, valor: (e) => e.melhorSequenciaDeDias },
  { id: '30-dias', pontos: 80, titulo: 'Mês de ferro', descricao: 'Treine 30 dias seguidos', alvo: 30, valor: (e) => e.melhorSequenciaDeDias },
  { id: '10-horas', pontos: 30, titulo: 'Dez horas de quadra', descricao: 'Some 10 horas de treino', alvo: 600, valor: (e) => e.minutos },
  { id: '100-num-dia', pontos: 40, titulo: 'Maratona', descricao: 'Acerte 100 arremessos em um único dia', alvo: 100, valor: (e) => e.acertosNoMelhorDia },
  { id: '1000-cestas', pontos: 60, titulo: 'Mil cestas', descricao: 'Acumule 1.000 arremessos certos', alvo: 1000, valor: (e) => e.acertos },
  { id: 'sequencia-10', pontos: 20, titulo: 'Mão quente', descricao: 'Acerte 10 arremessos seguidos', alvo: 10, valor: (e) => e.melhorSequenciaDeAcertos },
  { id: 'sequencia-25', pontos: 50, titulo: 'Sniper', descricao: 'Acerte 25 arremessos seguidos', alvo: 25, valor: (e) => e.melhorSequenciaDeAcertos },
]

export function conquistas(sessoes: Sessao[]): Conquista[] {
  const e = estatisticas(sessoes)
  return DEFINICOES.map(({ valor, ...d }) => {
    const v = valor(e)
    return { ...d, progresso: Math.min(v, d.alvo), desbloqueada: v >= d.alvo }
  })
}

/** Desbloqueadas primeiro, na ordem do catálogo; depois as bloqueadas, das mais perto de sair às mais longe. */
export function ordenarConquistas(lista: Conquista[]) {
  const razao = (c: Conquista) => c.progresso / c.alvo
  const feitas = lista.filter((c) => c.desbloqueada)
  const faltam = lista.filter((c) => !c.desbloqueada).sort((x, y) => razao(y) - razao(x))
  return [...feitas, ...faltam]
}

// ---------- Overall ----------

export type IdAtributo = 'arremesso3' | 'condicionamento' | 'defesa' | 'drible' | 'passe'

export interface Atributo {
  id: IdAtributo
  rotulo: string
  /** Cor da habilidade (as mesmas --c-* de styles.css). */
  cor: string
  valor: number
  dica: string
}

export const BASE = 40
export const TETO = 99
// Pontos para chegar a ~63% do caminho até o teto (uns 30 treinos de uma categoria): passar de 90 pede meses de treino.
const ESCALA = 300

/** De 40 (sem treino) até 99: sobe rápido no começo e devagar perto do topo, como num jogo. */
export function pontosParaNota(pontos: number) {
  const bruto = BASE + (TETO - BASE) * (1 - Math.exp(-Math.max(0, pontos) / ESCALA))
  return Math.min(TETO, Math.round(bruto))
}

const CATEGORIA_DO_ATRIBUTO: Record<Exclude<IdAtributo, 'arremesso3'>, Categoria> = {
  condicionamento: 'Condicionamento',
  defesa: 'Defesa',
  drible: 'Drible',
  passe: 'Passe',
}

const META: Record<IdAtributo, { rotulo: string; cor: string; dica: string }> = {
  arremesso3: { rotulo: 'Arremesso de 3', cor: 'var(--c-arremesso)', dica: 'Sobe com arremessos de 3 nas sessões, e mais rápido quando você acerta.' },
  condicionamento: { rotulo: 'Condicionamento', cor: 'var(--c-condicionamento)', dica: 'Sobe com exercícios de condicionamento.' },
  defesa: { rotulo: 'Defesa', cor: 'var(--c-defesa)', dica: 'Sobe com exercícios de defesa.' },
  drible: { rotulo: 'Drible', cor: 'var(--c-drible)', dica: 'Sobe com exercícios de drible.' },
  passe: { rotulo: 'Passe', cor: 'var(--c-passe)', dica: 'Sobe com exercícios de passe.' },
}

/**
 * Pontos de treino de cada atributo.
 * - Arremesso de 3: cada tentativa de 3 e cada acerto valem 1/3 de ponto (arremessar bem rende o dobro).
 * - Os outros: cada exercício da categoria vale 4 pontos, mais 1 por minuto da sessão (dividido entre os exercícios dela).
 */
export function pontosPorAtributo(sessoes: Sessao[], drillPorId: (id: string) => Drill | undefined): Record<IdAtributo, number> {
  const pontos: Record<IdAtributo, number> = { arremesso3: 0, condicionamento: 0, defesa: 0, drible: 0, passe: 0 }
  const ids = Object.keys(CATEGORIA_DO_ATRIBUTO) as Exclude<IdAtributo, 'arremesso3'>[]
  for (const s of sessoes) {
    for (const z of s.zonas) {
      if (z.zona.startsWith('tres_')) pontos.arremesso3 += (num(z.tentativas) + num(z.acertos)) / 3
    }
    const n = s.entradas.length || 1
    for (const e of s.entradas) {
      const cat = drillPorId(e.drillId)?.categoria
      const id = ids.find((k) => CATEGORIA_DO_ATRIBUTO[k] === cat)
      if (id) pontos[id] += 4 + num(s.duracaoMin) / n
    }
  }
  return pontos
}

export function atributos(sessoes: Sessao[], drillPorId: (id: string) => Drill | undefined): Atributo[] {
  const pontos = pontosPorAtributo(sessoes, drillPorId)
  return (Object.keys(META) as IdAtributo[]).map((id) => ({ id, ...META[id], valor: pontosParaNota(pontos[id]) }))
}

export function overall(lista: Pick<Atributo, 'valor'>[]) {
  return lista.length ? Math.round(lista.reduce((t, a) => t + a.valor, 0) / lista.length) : BASE
}

/** A faixa de cada overall, no estilo dos jogos de basquete. */
export function faixaDoOverall(ovr: number) {
  if (ovr >= 90) return 'Superestrela'
  if (ovr >= 80) return 'All-Star'
  if (ovr >= 70) return 'Titular'
  if (ovr >= 60) return 'Rotação'
  if (ovr >= 50) return 'Reserva'
  return 'Novato'
}

// ---------- Visual do Overall (estilo NBA 2K) ----------

export interface Faixa {
  id: 'novato' | 'bronze' | 'prata' | 'ouro' | 'esmeralda' | 'ametista' | 'diamante' | 'rosa'
  nome: string
  cor: string
}

/** A cor da nota, como nos jogos de basquete: quanto mais alta, mais rara a cor. */
export function faixaDaNota(nota: number): Faixa {
  if (nota >= 99) return { id: 'rosa', nome: 'Diamante rosa', cor: '#ff7aa2' }
  if (nota >= 95) return { id: 'diamante', nome: 'Diamante', cor: '#4cc9f0' }
  if (nota >= 90) return { id: 'ametista', nome: 'Ametista', cor: '#b86cff' }
  if (nota >= 80) return { id: 'esmeralda', nome: 'Esmeralda', cor: '#2fbf71' }
  if (nota >= 70) return { id: 'ouro', nome: 'Ouro', cor: '#ffd23f' }
  if (nota >= 60) return { id: 'prata', nome: 'Prata', cor: '#d3d6dc' }
  if (nota >= 50) return { id: 'bronze', nome: 'Bronze', cor: '#d9894a' }
  return { id: 'novato', nome: 'Novato', cor: '#9a988c' }
}

const BUILDS: Record<IdAtributo, string> = {
  arremesso3: 'Atirador',
  condicionamento: 'Maratonista',
  defesa: 'Cão de guarda',
  drible: 'Craque do drible',
  passe: 'Armador',
}

/** O estilo de jogador, pelo atributo mais alto (como o "build" do jogo). Sem destaque, fica em aberto. */
export function estiloDeJogador(lista: Atributo[]) {
  const ordenados = [...lista].sort((a, b) => b.valor - a.valor)
  const forte = ordenados[0]
  const fraco = ordenados[ordenados.length - 1]
  if (!forte || forte.valor === fraco.valor) return { build: 'Estilo em aberto', forte: undefined, fraco: undefined }
  return { build: BUILDS[forte.id], forte, fraco }
}
