// Programas de várias semanas: um treino por dia, liberado um de cada vez. Os exercícios são nomes do
// catálogo padrão (catalog.ts); o teste confere que todos existem.

export type ProgramBlock = [exercise: string, minutes: number]

export interface ProgramDefinition {
  id: string
  name: string
  summary: string
  level: 'iniciante' | 'intermediario' | 'avancado'
  focus: string
  /** Treino de cada dia, na ordem. */
  days: { title: string; blocks: ProgramBlock[] }[]
}

const AQUECIMENTO_ARREMESSO: ProgramBlock[] = [['Arremesso colado à cesta', 5], ['Arremesso um passo atrás', 5]]

/** "30 dias de arremesso": de perto para longe ao longo das semanas, com um dia de teste a cada sete. */
function trintaDiasDeArremesso() {
  const semanas: { titulo: string; blocos: ProgramBlock[][] }[] = [
    {
      titulo: 'Mecânica',
      blocos: [
        [['Mecânica do arremesso sem bola', 5], ['Arremesso de uma mão', 10], ['Arremesso a um metro', 10]],
        [['Arremesso de uma mão', 10], ['Arremesso a dois metros', 10], ['Arremesso na tabela', 5]],
        [['Arremesso com a mão de apoio', 5], ['Arremesso a dois metros', 10], ['Passo e arremesso', 10]],
      ],
    },
    {
      titulo: 'Média distância',
      blocos: [
        [['Arremesso de média distância', 15], ['Receber e arremessar', 10]],
        [['Volta ao mundo', 10], ['Arremesso de média distância', 15]],
        [['Parada em um tempo e arremesso', 10], ['Arremesso após drible', 10], ['Lance livre', 5]],
      ],
    },
    {
      titulo: 'Em movimento',
      blocos: [
        [['Arremesso após drible', 10], ['Finta de arremesso e um drible', 10], ['Arremesso de média distância', 5]],
        [['Arremesso saindo do bloqueio', 10], ['Receber e arremessar', 10], ['Lance livre cansado', 5]],
        [['Parada em um tempo e arremesso', 10], ['Arremesso saindo do bloqueio', 10], ['Volta ao mundo', 5]],
      ],
    },
    {
      titulo: 'Linha de três',
      blocos: [
        [['Arremesso de três sem salto', 5], ['Arremesso de três', 15], ['Lance livre', 5]],
        [['Receber e arremessar', 10], ['Arremesso de três', 15]],
        [['Arremesso de três', 10], ['Lance livre cansado', 10], ['Volta ao mundo', 5]],
      ],
    },
  ]
  const days: ProgramDefinition['days'] = []
  for (let d = 1; d <= 30; d++) {
    const semana = semanas[Math.min(3, Math.floor((d - 1) / 7))]
    if (d % 7 === 0 || d === 30) {
      days.push({ title: 'Dia de teste: lances livres e média distância', blocks: [...AQUECIMENTO_ARREMESSO, ['Lance livre', 10], ['Arremesso de média distância', 10]] })
    } else {
      days.push({ title: semana.titulo, blocks: [...AQUECIMENTO_ARREMESSO, ...semana.blocos[(d - 1) % 3]] })
    }
  }
  return days
}

/** "Mão fraca em 4 semanas": do controle parado até finalizar e arremessar com a mão fraca. */
function maoFraca() {
  const semanas: { titulo: string; blocos: ProgramBlock[][] }[] = [
    {
      titulo: 'Controle parado',
      blocos: [
        [['Toques na ponta dos dedos', 5], ['Drible parado com a mão esquerda', 10], ['Drible ajoelhado', 5]],
        [['Bola ao redor da cintura', 5], ['Drible parado com a mão esquerda', 10], ['Drible de proteção', 5]],
      ],
    },
    {
      titulo: 'Em movimento',
      blocos: [
        [['Drible caminhando com a mão fraca', 10], ['Troca de mão entre cones', 10], ['Drible parado com a mão esquerda', 5]],
        [['Drible caminhando com a mão fraca', 10], ['Drible em linha reta', 10], ['Cruzado parado', 5]],
      ],
    },
    {
      titulo: 'Finalização',
      blocos: [
        [['Drible caminhando com a mão fraca', 5], ['Bandeja com a mão fraca', 15], ['Mikan drill', 5]],
        [['Bandeja com a mão fraca', 10], ['Bandeja reversa', 10], ['Drible caminhando com a mão fraca', 5]],
      ],
    },
    {
      titulo: 'Jogo com as duas mãos',
      blocos: [
        [['Cruzado em movimento', 10], ['Bandeja com a mão fraca', 10], ['Arremesso com a mão de apoio', 5]],
        [['Zigue-zague com mudança de direção', 10], ['Bandeja em velocidade', 10], ['Bandeja com a mão fraca', 5]],
      ],
    },
  ]
  const days: ProgramDefinition['days'] = []
  for (let d = 1; d <= 28; d++) {
    const semana = semanas[Math.floor((d - 1) / 7)]
    // O sétimo dia de cada semana é leve: só controle de bola, para descansar o braço.
    if (d % 7 === 0) days.push({ title: 'Dia leve', blocks: [['Toques na ponta dos dedos', 5], ['Bola ao redor da cintura', 5], ['Drible parado com a mão esquerda', 5]] })
    else days.push({ title: semana.titulo, blocks: [['Quiques leves parado', 5], ...semana.blocos[(d - 1) % 2]] })
  }
  return days
}

/** "Primeiros 30 dias": a base do iniciante, alternando bola na mão, arremesso e bandeja. */
function primeirosTrintaDias() {
  const rodizio: { title: string; blocks: ProgramBlock[] }[] = [
    { title: 'Bola na mão', blocks: [['Toques na ponta dos dedos', 5], ['Drible parado com a mão direita', 5], ['Drible parado com a mão esquerda', 5], ['Drible caminhando com a mão forte', 5]] },
    { title: 'Arremesso', blocks: [['Mecânica do arremesso sem bola', 5], ['Arremesso a um metro', 10], ['Arremesso na tabela', 5]] },
    { title: 'Bandeja', blocks: [['Passadas da bandeja sem bola', 5], ['Bandeja de um passo', 5], ['Bandeja com a mão forte', 10]] },
    { title: 'Passe e defesa', blocks: [['Passe na parede', 5], ['Passe de peito no alvo', 5], ['Base defensiva', 5], ['Deslizamento defensivo', 5]] },
    { title: 'Condicionamento', blocks: [['Pular corda', 5], ['Corrida entre as linhas', 5], ['Agachamento livre', 5], ['Prancha frontal', 5]] },
  ]
  return Array.from({ length: 30 }, (_, i) => rodizio[i % rodizio.length])
}

export const PROGRAMS: ProgramDefinition[] = [
  {
    id: 'arremesso-30',
    name: '30 dias de arremesso',
    summary: 'Da mecânica perto da cesta até a linha de três, com um dia de teste por semana para medir a evolução.',
    level: 'intermediario',
    focus: 'Arremesso',
    days: trintaDiasDeArremesso(),
  },
  {
    id: 'mao-fraca-4',
    name: 'Mão fraca em 4 semanas',
    summary: 'Do drible parado à bandeja em velocidade com a mão que menos usa. Um dia leve por semana.',
    level: 'iniciante',
    focus: 'Drible',
    days: maoFraca(),
  },
  {
    id: 'primeiros-30',
    name: 'Primeiros 30 dias',
    summary: 'A base de quem está começando: bola na mão, arremesso, bandeja, passe, defesa e condicionamento em rodízio.',
    level: 'iniciante',
    focus: 'Fundamentos',
    days: primeirosTrintaDias(),
  },
]

export const findProgram = (id: string) => PROGRAMS.find((p) => p.id === id)
