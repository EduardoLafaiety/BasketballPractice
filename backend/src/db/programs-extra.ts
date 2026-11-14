// Mais doze programas de quatro semanas. Cada semana tem um tema e alguns treinos que se alternam; o sétimo
// dia de cada semana é o dia leve ou o dia de teste do programa. Todos os exercícios existem no catálogo.
import type { ProgramBlock, ProgramDefinition } from './programs.js'

interface Semana {
  titulo: string
  treinos: ProgramBlock[][]
}

function montar(aquecimento: ProgramBlock[], semanas: Semana[], fim: { titulo: string; blocos: ProgramBlock[] }): ProgramDefinition['days'] {
  const dias: ProgramDefinition['days'] = []
  for (let d = 1; d <= 28; d++) {
    if (d % 7 === 0) {
      dias.push({ title: fim.titulo, blocks: fim.blocos })
      continue
    }
    const semana = semanas[Math.floor((d - 1) / 7)]
    dias.push({ title: semana.titulo, blocks: [...aquecimento, ...semana.treinos[(d - 1) % semana.treinos.length]] })
  }
  return dias
}

const AQUECIMENTO_ARREMESSO: ProgramBlock[] = [['Arremesso colado à cesta', 5], ['Arremesso um passo atrás', 5]]

export const PROGRAMS_EXTRA: ProgramDefinition[] = [
  {
    id: 'defesa-28',
    name: 'Defesa que incomoda',
    summary: 'Da base e do deslizamento até o rebote e a pressão na bola, com um dia leve por semana.',
    level: 'iniciante',
    focus: 'Defesa',
    days: montar(
      [['Deslocamento lateral leve', 5]],
      [
        { titulo: 'Base e deslizamento', treinos: [[['Base defensiva', 5], ['Deslizamento defensivo', 10], ['Mãos ativas', 5]], [['Base defensiva', 5], ['Mudança de direção leve', 10], ['Recuo defensivo', 5]]] },
        { titulo: 'Fechar e contestar', treinos: [[['Closeout', 10], ['Contestar o arremesso', 10]], [['Deslizamento defensivo', 10], ['Closeout', 10]], [['Mãos ativas', 5], ['Contestar o arremesso', 10], ['Recuo defensivo', 5]]] },
        { titulo: 'Linhas de passe e ajuda', treinos: [[['Negar a linha de passe', 10], ['Ajuda e recuperação', 10]], [['Corta o caminho do drible', 10], ['Zigue-zague defensivo', 10]]] },
        { titulo: 'Rebote e pressão', treinos: [[['Bloqueio de rebote parado', 10], ['Bloqueio de rebote com parceiro', 10]], [['Roubo no drible', 10], ['Closeout com saída', 10]], [['Defesa do bloqueio', 10], ['Tomar a falta de ataque', 5], ['Ajuda e recuperação', 5]]] },
      ],
      { titulo: 'Dia leve: pés e mãos', blocos: [['Base defensiva', 5], ['Deslocamento lateral leve', 5], ['Mãos ativas', 5]] },
    ),
  },
  {
    id: 'bandeja-28',
    name: 'Bandeja sob pressão',
    summary: 'Os dois lados, por baixo, reversa, em velocidade e com contato, com um dia de teste por semana.',
    level: 'intermediario',
    focus: 'Finalização',
    days: montar(
      [['Passadas da bandeja sem bola', 5]],
      [
        { titulo: 'Os dois lados', treinos: [[['Bandeja com a mão forte', 10], ['Bandeja com a mão fraca', 10]], [['Bandeja de um passo', 5], ['Bandeja com dois pés', 10], ['Mikan drill', 5]]] },
        { titulo: 'Por baixo e reversa', treinos: [[['Bandeja por baixo', 10], ['Bandeja reversa', 10]], [['Mikan reverso', 5], ['Bandeja reversa', 10], ['Finger roll', 5]]] },
        { titulo: 'Em velocidade', treinos: [[['Bandeja em velocidade', 10], ['Reversa em velocidade', 10]], [['Eurostep entre cones', 10], ['Bandeja em velocidade', 10]], [['Giro e bandeja', 10], ['Joga na tabela e finaliza', 10]]] },
        { titulo: 'Com contato', treinos: [[['Bandeja com contato', 10], ['Subida com força', 10]], [['Floater em uma perna', 10], ['Gancho curto', 10]], [['Finta e passo por baixo', 10], ['Bandeja com contato', 10]]] },
      ],
      { titulo: 'Dia de teste: bandejas dos dois lados', blocos: [['Bandeja com a mão forte', 5], ['Bandeja com a mão fraca', 5], ['Bandeja em velocidade', 10]] },
    ),
  },
  {
    id: 'lance-livre-28',
    name: 'Lance livre sem tremer',
    summary: 'Rotina, repetição, cansaço e pressão: quatro semanas para a linha de lance livre virar o ponto mais fácil do jogo.',
    level: 'iniciante',
    focus: 'Arremesso',
    days: montar(
      [['Mecânica do arremesso sem bola', 5]],
      [
        { titulo: 'Rotina e mecânica', treinos: [[['Arremesso da linha de lance livre leve', 10], ['Lance livre', 10]], [['Arremesso de uma mão', 10], ['Lance livre', 10]]] },
        { titulo: 'Repetição', treinos: [[['Lance livre', 15], ['Arremesso na tabela', 5]], [['Arremesso a dois metros', 10], ['Lance livre', 10]]] },
        { titulo: 'Com cansaço', treinos: [[['Corrida entre as linhas', 5], ['Lance livre cansado', 10], ['Lance livre', 5]], [['Pular corda', 5], ['Lance livre cansado', 10]]] },
        { titulo: 'Sob pressão', treinos: [[['Lance livre decisivo', 10], ['Lance livre', 10]], [['Lance livre cansado', 10], ['Lance livre decisivo', 10]]] },
      ],
      { titulo: 'Dia de teste: lances livres', blocos: [['Lance livre', 10], ['Lance livre decisivo', 10]] },
    ),
  },
  {
    id: 'tres-pontos-28',
    name: 'Linha de três em 4 semanas',
    summary: 'Do arremesso de três sem salto ao arremesso em transição, saindo do bloqueio e com marcação.',
    level: 'avancado',
    focus: 'Arremesso',
    days: montar(
      AQUECIMENTO_ARREMESSO,
      [
        { titulo: 'Base', treinos: [[['Arremesso de três sem salto', 10], ['Arremesso de três', 10]], [['Passo lateral de três', 10], ['Arremesso de três', 10]]] },
        { titulo: 'Receber e atirar', treinos: [[['Receber e arremessar', 10], ['Arremesso de três', 10]], [['Arremesso saindo do bloqueio', 10], ['Arremesso de três', 10]]] },
        { titulo: 'Criar o espaço', treinos: [[['Arremesso dois passos atrás', 10], ['Step-back de três', 10]], [['Pull-up de três', 10], ['Arremesso após drible', 10]]] },
        { titulo: 'Jogo', treinos: [[['Três em transição', 10], ['Três pontos em série', 10]], [['Arremesso contestado', 10], ['Escada de arremesso', 10]], [['Corre e arremessa', 10], ['Lance livre cansado', 10]]] },
      ],
      { titulo: 'Dia de teste: arremessos de três', blocos: [...AQUECIMENTO_ARREMESSO, ['Arremesso de três', 15], ['Três pontos em série', 5]] },
    ),
  },
  {
    id: 'drible-rua-28',
    name: 'Drible de rua',
    summary: 'Duas bolas, cruzados rápidos, mudança de ritmo e fintas para quebrar o marcador, com um dia leve por semana.',
    level: 'avancado',
    focus: 'Drible',
    days: montar(
      [['Drible em ritmo crescente', 5]],
      [
        { titulo: 'Duas bolas', treinos: [[['Duas bolas em ritmo leve', 10], ['Drible com duas bolas', 10]], [['Duas bolas com cruzado', 10], ['Oito entre as pernas', 10]]] },
        { titulo: 'Quebrar o marcador', treinos: [[['Cruzado rápido duplo', 10], ['Hesitação com cruzado', 10]], [['Entre as pernas em movimento', 10], ['Por trás das costas em movimento', 10]]] },
        { titulo: 'Mudança de ritmo', treinos: [[['Mudança de ritmo', 10], ['Hesitação em linha reta', 10]], [['Drible Shammgod', 10], ['Recuo e cruzado', 10]], [['Finta de dentro para fora', 10], ['Giro com a bola', 10]]] },
        { titulo: 'Em jogo', treinos: [[['Duas bolas em movimento', 10], ['Sequência de três trocas', 10]], [['Zigue-zague com mudança de direção', 10], ['Parada em dois tempos', 10]]] },
      ],
      { titulo: 'Dia leve: controle de bola', blocos: [['Toques na ponta dos dedos', 5], ['Bola ao redor da cintura', 5], ['Drible estacionário', 5]] },
    ),
  },
  {
    id: 'passe-28',
    name: 'Passe que enxerga a quadra',
    summary: 'Passes básicos, em movimento, com variações e leitura de jogo, com um dia leve por semana.',
    level: 'intermediario',
    focus: 'Passe',
    days: montar(
      [['Passe leve na parede', 5]],
      [
        { titulo: 'Passes básicos', treinos: [[['Passe de peito no alvo', 10], ['Passe picado no alvo', 10]], [['Passe por cima no alvo', 10], ['Passe na parede', 10]]] },
        { titulo: 'Em movimento', treinos: [[['Passe de peito em movimento', 10], ['Passa e corta', 10]], [['Passa e recebe com parceiro', 10], ['Passe após o drible', 10]]] },
        { titulo: 'Variações', treinos: [[['Passe picado com uma mão', 10], ['Passe por trás das costas', 10]], [['Passe de beisebol', 10], ['Passe longo em corrida', 10]], [['Finta de passe', 10], ['Tripla ameaça', 10]]] },
        { titulo: 'Leitura de jogo', treinos: [[['Passe curto no bloqueio', 10], ['Passe alto para o pivô', 10]], [['Passe de saída rápida', 10], ['Passe sem olhar', 5], ['Pivô de frente', 5]]] },
      ],
      { titulo: 'Dia leve: passes curtos', blocos: [['Passe leve na parede', 5], ['Passe de peito no alvo', 5], ['Pivô de frente', 5]] },
    ),
  },
  {
    id: 'explosao-28',
    name: 'Explosão e salto',
    summary: 'Força de base, saltos, potência e velocidade de jogo para ganhar altura e arrancada.',
    level: 'intermediario',
    focus: 'Condicionamento',
    days: montar(
      [['Polichinelo leve', 5]],
      [
        { titulo: 'Base de força', treinos: [[['Agachamento livre', 10], ['Afundo caminhando', 10], ['Prancha frontal', 5]], [['Agachamento com braços acima', 10], ['Prancha lateral', 5], ['Saltos curtos de tornozelo', 10]]] },
        { titulo: 'Saltos', treinos: [[['Agachamento com salto', 10], ['Saltos laterais', 10]], [['Saltos com aterrissagem controlada', 10], ['Saltos em uma perna', 10]]] },
        { titulo: 'Potência', treinos: [[['Saltos na caixa', 10], ['Skipping explosivo', 10]], [['Salto de profundidade', 10], ['Aceleração progressiva', 10]], [['Sprint com salto no final', 10], ['Burpee', 10]]] },
        { titulo: 'Velocidade de jogo', treinos: [[['Desliza e arranca', 10], ['Suicídio', 10]], [['Corrida de 17 linhas', 15], ['Prancha com toque no ombro', 5]]] },
      ],
      { titulo: 'Dia leve: mobilidade', blocos: [['Mobilidade de quadril em pé', 5], ['Caminhada com joelho alto', 5], ['Prancha frontal', 5]] },
    ),
  },
  {
    id: 'pes-rapidos-28',
    name: 'Pés rápidos',
    summary: 'Agilidade, corda, escada e mudanças de direção para chegar primeiro em todas as bolas.',
    level: 'iniciante',
    focus: 'Condicionamento',
    days: montar(
      [['Polichinelo leve', 5]],
      [
        { titulo: 'Ritmo de pés', treinos: [[['Skipping', 10], ['Calcanhar no glúteo', 5], ['Pular corda', 5]], [['Escada de agilidade', 10], ['Deslocamento lateral leve', 10]]] },
        { titulo: 'Coordenação', treinos: [[['Corrida entre as linhas', 10], ['Pular corda', 10]], [['Saltos curtos de tornozelo', 10], ['Escada de agilidade', 10]]] },
        { titulo: 'Mudança de direção', treinos: [[['Mudança de direção leve', 10], ['Zigue-zague defensivo', 10]], [['Aceleração progressiva', 10], ['Corrida entre as linhas', 10]], [['Desliza e arranca', 10], ['Skipping', 5]]] },
        { titulo: 'Em velocidade', treinos: [[['Suicídio', 10], ['Escada de agilidade', 10]], [['Corrida de 17 linhas', 15], ['Agachamento livre', 5]]] },
      ],
      { titulo: 'Dia leve: soltar as pernas', blocos: [['Caminhada com joelho alto', 5], ['Balanço de pernas', 5], ['Mobilidade de quadril em pé', 5]] },
    ),
  },
  {
    id: 'armador-28',
    name: 'Treino de armador',
    summary: 'Controle de bola, passe e visão, arremesso e finalização em velocidade para quem organiza o jogo.',
    level: 'intermediario',
    focus: 'Fundamentos',
    days: montar(
      [['Drible leve caminhando', 5]],
      [
        { titulo: 'Controle', treinos: [[['Drible em ritmo crescente', 10], ['Cruzado em movimento', 10]], [['Troca de mãos caminhando', 10], ['Mudança de ritmo', 10]]] },
        { titulo: 'Passe e visão', treinos: [[['Passe após o drible', 10], ['Passa e recebe com parceiro', 10]], [['Passe picado com uma mão', 10], ['Tripla ameaça', 10]]] },
        { titulo: 'Arremesso e finalização', treinos: [[['Arremesso após drible', 10], ['Bandeja em velocidade', 10]], [['Pull-up de três', 10], ['Eurostep entre cones', 10]], [['Receber e arremessar', 10], ['Reversa em velocidade', 10]]] },
        { titulo: 'Jogo', treinos: [[['Passe de saída rápida', 10], ['Três em transição', 10]], [['Roubo no drible', 10], ['Corta o caminho do drible', 10]]] },
      ],
      { titulo: 'Dia de teste: lance livre, drible e bandeja', blocos: [['Lance livre', 10], ['Drible em ritmo crescente', 5], ['Bandeja em velocidade', 5]] },
    ),
  },
  {
    id: 'pivo-28',
    name: 'Treino de pivô',
    summary: 'Pés no poste, finalização perto da cesta, rebote, defesa do garrafão e passe para quem joga de costas.',
    level: 'intermediario',
    focus: 'Fundamentos',
    days: montar(
      [['Passadas da bandeja sem bola', 5]],
      [
        { titulo: 'Poste e pés', treinos: [[['Trabalho de pés no poste baixo', 10], ['Pivô de costas', 10]], [['Pivô de frente', 10], ['Meia-volta do poste', 10]]] },
        { titulo: 'Finalizar perto da cesta', treinos: [[['Mikan drill', 10], ['Mikan reverso', 10]], [['Gancho curto', 10], ['Toque de rebote', 10]], [['Subida com força', 10], ['Pega no alto e finaliza', 10]]] },
        { titulo: 'Rebote e defesa', treinos: [[['Bloqueio de rebote parado', 10], ['Rebote ofensivo', 10]], [['Bloqueio de rebote com parceiro', 10], ['Toco na perseguição', 10]]] },
        { titulo: 'Passe e arremesso', treinos: [[['Passe alto para o pivô', 10], ['Arremesso do garrafão curto', 10]], [['Fadeaway do cotovelo', 10], ['Passe curto no bloqueio', 10]], [['Corta-luz com cadeira', 10], ['Defesa do bloqueio', 10]]] },
      ],
      { titulo: 'Dia leve: força e mobilidade', blocos: [['Agachamento livre', 5], ['Prancha frontal', 5], ['Mobilidade de quadril em pé', 5]] },
    ),
  },
  {
    id: 'criador-28',
    name: 'Criador de arremesso',
    summary: 'Fintas, passos para trás, pull-up e fadeaway: arremessar bem mesmo com o marcador na cara.',
    level: 'avancado',
    focus: 'Arremesso',
    days: montar(
      AQUECIMENTO_ARREMESSO,
      [
        { titulo: 'Fintas', treinos: [[['Finta de arremesso e um drible', 10], ['Arremesso após drible', 10]], [['Arremesso com finta e passo lateral', 10], ['Parada em um tempo e arremesso', 10]]] },
        { titulo: 'Passos para trás', treinos: [[['Arremesso um passo atrás', 10], ['Arremesso dois passos atrás', 10]], [['Step-back de três', 10], ['Pull-up de três', 10]]] },
        { titulo: 'Contra a marcação', treinos: [[['Fadeaway do cotovelo', 10], ['Fadeaway em uma perna', 10]], [['Arremesso saindo em curva', 10], ['Arremesso contestado', 10]], [['Arremesso do garrafão curto', 10], ['Meia-volta do poste', 10]]] },
        { titulo: 'Em jogo', treinos: [[['Corre e arremessa', 10], ['Três em transição', 10]], [['Lance livre decisivo', 10], ['Escada de arremesso', 10]]] },
      ],
      { titulo: 'Dia de teste: média distância e três', blocos: [...AQUECIMENTO_ARREMESSO, ['Arremesso de média distância', 10], ['Arremesso de três', 10]] },
    ),
  },
  {
    id: 'ala-28',
    name: 'Ala completo',
    summary: 'Ataque no drible, arremesso de três, defesa no perímetro e rebote: o pacote de quem joga nas duas pontas.',
    level: 'avancado',
    focus: 'Fundamentos',
    days: montar(
      [['Corrida leve na quadra', 5]],
      [
        { titulo: 'Ataque no drible', treinos: [[['Drible em linha reta', 10], ['Mudança de ritmo', 10]], [['Hesitação em linha reta', 10], ['Bandeja em velocidade', 10]]] },
        { titulo: 'Arremesso de três', treinos: [[['Receber e arremessar', 10], ['Arremesso de três', 10]], [['Arremesso saindo do bloqueio', 10], ['Passo lateral de três', 10]]] },
        { titulo: 'Defesa no perímetro', treinos: [[['Closeout', 10], ['Contestar o arremesso', 10]], [['Negar a linha de passe', 10], ['Ajuda e recuperação', 10]], [['Rebote ofensivo', 10], ['Toco na perseguição', 10]]] },
        { titulo: 'Jogo', treinos: [[['Bandeja com contato', 10], ['Eurostep entre cones', 10]], [['Três em transição', 10], ['Passe de saída rápida', 10]]] },
      ],
      { titulo: 'Dia de teste: lance livre e três', blocos: [['Lance livre', 10], ['Arremesso de três', 10]] },
    ),
  },
]
