// Dados de exemplo da demonstração: ~8 semanas de treinos de uma atleta que vem melhorando.
// Tudo passa pelas rotas reais (mesmas validações); as datas são relativas a hoje.
import type { Executar } from './servidor'

const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

// Rotina semanal (0 = domingo); domingo é descanso.
const ROTINA: Record<number, string[]> = {
  1: ['Lance livre', 'Arremesso de três', 'Drible com duas bolas'],
  2: ['Deslizamento defensivo', 'Closeout', 'Suicídio'],
  3: ['Drible estacionário', 'Zigue-zague com mudança de direção', 'Passe na parede'],
  4: ['Lance livre', 'Arremesso de três', 'Mikan drill', 'Deslizamento defensivo'],
  5: ['Arremesso de média distância', 'Arremesso após drible', 'Bandeja com a mão fraca'],
  6: ['Saltos na caixa', 'Suicídio'],
}

const ZONAS = [
  'garrafao', 'lance_livre', 'media_canto_e', 'media_ala_e', 'media_topo', 'media_ala_d', 'media_canto_d',
  'tres_canto_e', 'tres_ala_e', 'tres_topo', 'tres_ala_d', 'tres_canto_d',
] as const

// Aproveitamento inicial por zona; sobe ao longo das semanas.
const BASE_ZONA: Record<(typeof ZONAS)[number], number> = {
  garrafao: 0.7, lance_livre: 0.74, media_canto_e: 0.46, media_ala_e: 0.44, media_topo: 0.5, media_ala_d: 0.52,
  media_canto_d: 0.55, tres_canto_e: 0.33, tres_ala_e: 0.28, tres_topo: 0.31, tres_ala_d: 0.36, tres_canto_d: 0.4,
}

const BASE_EXERCICIO: Record<string, number> = {
  'Lance livre': 0.66,
  'Arremesso de três': 0.32,
  'Mikan drill': 0.8,
  'Bandeja com a mão fraca': 0.62,
}

const NOTAS = [
  'Mão quente no lance livre hoje.',
  'Cansei no fim, mas mantive a mecânica.',
  'Foquei em dobrar os joelhos no arremesso.',
  'Mão fraca melhorando nas bandejas.',
]

const DIAS_DE_HISTORICO = 56
const DIA_MS = 86_400_000

/** Sorteio com semente: a demonstração começa sempre com os mesmos números. */
function sorteio(semente: number) {
  let s = semente
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  return { rnd, entre: (a: number, b: number) => Math.round(a + rnd() * (b - a)) }
}

async function chamar(executar: Executar, metodo: string, caminho: string, corpo?: unknown) {
  const r = await executar(metodo, caminho, corpo)
  if (r.status >= 400) throw new Error(`Demonstração: ${metodo} ${caminho} → ${r.status} ${JSON.stringify(r.body)}`)
  return r.body
}

/** Meio-dia local de `atras` dias antes de `hoje`, no horário pedido. */
function diaLocal(hoje: Date, atras: number, hora = 12, minuto = 0) {
  const d = new Date(hoje.getTime() - atras * DIA_MS)
  d.setHours(hora, minuto, 0, 0)
  return d
}

export async function popularDemonstracao(executar: Executar, hoje: Date) {
  const { rnd, entre } = sorteio(7)
  const exercicios = (await chamar(executar, 'GET', '/exercises')) as { id: number; name: string; category: string; metric: string }[]
  const porNome = new Map(exercicios.map((e) => [e.name, e]))
  const exercicio = (nome: string) => {
    const e = porNome.get(nome)
    if (!e) throw new Error(`Demonstração: exercício "${nome}" não está no catálogo`)
    return e
  }

  for (const [dia, nomes] of Object.entries(ROTINA)) {
    await chamar(executar, 'POST', '/workouts', {
      name: `Rotina de ${NOMES_DIAS[Number(dia)]}`,
      description: `bp-rotina:${dia}`,
      exercises: nomes.map((nome) => ({ exerciseId: exercicio(nome).id })),
    })
  }

  // Até ontem: o treino de hoje fica para o visitante fazer (e ver a sequência crescer).
  for (let atras = DIAS_DE_HISTORICO; atras >= 1; atras--) {
    const quando = diaLocal(hoje, atras, entre(7, 19), entre(0, 59))
    const nomes = ROTINA[quando.getDay()]
    const ultimaSemana = atras <= 6
    if (!nomes && !ultimaSemana) continue
    if (!ultimaSemana && rnd() > 0.72) continue

    const progresso = 1 - atras / DIAS_DE_HISTORICO // 0 → 1 ao longo do histórico
    const doDia = nomes ?? ROTINA[4]
    const entries = doDia.map((nome) => {
      const e = exercicio(nome)
      if (e.metric === 'acertos') {
        const base = BASE_EXERCICIO[nome] ?? 0.45
        const pct = Math.min(0.95, base + 0.14 * progresso + (rnd() - 0.5) * 0.08)
        const attempts = entre(40, 90)
        const makes = Math.round(attempts * pct)
        return { exerciseId: e.id, attempts, makes, bestStreak: Math.min(makes, entre(4, 12)) }
      }
      if (e.metric === 'tempo') return { exerciseId: e.id, seconds: entre(150, 360) }
      return { exerciseId: e.id, reps: entre(60, 160) }
    })
    const arremessa = doDia.some((nome) => exercicio(nome).category === 'arremesso')
    const shots = arremessa
      ? ZONAS.filter(() => rnd() < 0.6).map((zone) => {
          const attempts = entre(6, 18)
          const pct = Math.min(0.95, BASE_ZONA[zone] + 0.1 * progresso + (rnd() - 0.5) * 0.1)
          return { zone, attempts, makes: Math.round(attempts * pct) }
        })
      : []

    await chamar(executar, 'POST', '/sessions', {
      performedAt: quando.toISOString(),
      durationMinutes: entre(40, 85),
      rating: entre(3, 5),
      fatigue: entre(2, 4),
      notes: rnd() < 0.15 ? NOTAS[entre(0, NOTAS.length - 1)] : null,
      entries,
      shots,
    })
  }

  // Testes físicos a cada 3 semanas, com evolução.
  for (let i = 0; i < 3; i++) {
    const performedAt = diaLocal(hoje, DIAS_DE_HISTORICO - i * 21).toISOString()
    await chamar(executar, 'POST', '/tests', { kind: 'impulsao', value: 56 + i * 2.5, performedAt })
    await chamar(executar, 'POST', '/tests', { kind: 'sprint', value: Number((4.7 - i * 0.1).toFixed(2)), performedAt })
    await chamar(executar, 'POST', '/tests', { kind: 'lances_1min', value: 13 + i * 2, performedAt })
  }

  const metas = [
    { title: 'Lance livre a 80%', kind: 'aproveitamento', target: 80, exerciseId: exercicio('Lance livre').id },
    { title: '10 dias seguidos', kind: 'dias_seguidos', target: 10 },
    { title: '300 minutos na semana', kind: 'minutos_semana', target: 300 },
    { title: '4 treinos por semana', kind: 'sessoes_semana', target: 4 },
    { title: 'Aproveitamento de 60%', kind: 'aproveitamento', target: 60 },
  ]
  for (const meta of metas) await chamar(executar, 'POST', '/goals', meta)
}
