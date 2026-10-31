import { Router } from 'express'
import { z } from 'zod'
import { many, type Database } from '../db/index.js'
import { notFound } from '../lib/http-error.js'
import { parse } from '../lib/validate.js'

type Group = 'guard' | 'forward' | 'center'

type Move = {
  name: string
  description: string
  tip: string
  /** Nome do exercício no catálogo padrão (seed.ts). */
  exercise: string
  dose: string
  minutes: number
}

type Style = {
  id: string
  name: string
  group: Group
  heightCm: number
  archetype: string
  pace: string
  summary: string
  mindset: string
  moves: Move[]
}

// Aquecimento e lance livre abrem e fecham toda sessão de estilo.
const WARMUP = { exercise: 'Drible estacionário', dose: 'Drible baixo, alto, cruzado e entre as pernas', minutes: 8 }
const COOLDOWN = { exercise: 'Lance livre', dose: '20 arremessos', minutes: 6 }

// Estilos de jogo: leitura do jeito de jogar de cada atleta, montada com os exercícios do catálogo padrão.
// A ordem dos movimentos é a ordem da sessão.
export const STYLES: Style[] = [
  {
    id: 'luka-doncic',
    name: 'Luka Dončić',
    group: 'guard',
    heightCm: 198,
    archetype: 'Maestro do pick-and-roll',
    pace: 'Lento e controlado',
    summary:
      'Não é o mais rápido em quadra e não precisa ser. Joga no próprio ritmo, usa o corta-luz para prender o defensor nas costas e lê a defesa antes de decidir: arremessa, infiltra ou acha o companheiro livre.',
    mindset: 'Quem dita a velocidade da jogada é você. O defensor só reage.',
    moves: [
      {
        name: 'Hesitação e mudança de ritmo',
        description: 'Desacelera, levanta um pouco o corpo como se fosse arremessar e explode no primeiro passo assim que o defensor se apruma.',
        tip: 'Exagere a diferença entre lento e rápido. Quanto mais lenta a hesitação, mais rápido o primeiro passo parece.',
        exercise: 'Hesitação em linha reta',
        dose: '6 idas de fundo a fundo',
        minutes: 8,
      },
      {
        name: 'Leitura do corta-luz',
        description: 'Usa o bloqueio raspando o ombro no pivô, para o defensor não passar por cima. Com o defensor preso nas costas, lê o jogador da ajuda: se ele sobe, passa; se fica, ataca.',
        tip: 'Sozinho, uma cadeira faz o papel do pivô. Depois de sair do bloqueio, escolha uma de três leituras: pull-up, bandeja ou passe na parede.',
        exercise: 'Corta-luz com cadeira',
        dose: '3 séries de 8 de cada lado',
        minutes: 12,
      },
      {
        name: 'Step-back de três',
        description: 'Dois dribles para a frente para fazer o defensor recuar, depois empurra com o pé da frente e cai para trás em base larga, já equilibrado para o arremesso.',
        tip: 'O espaço vem do empurrão, não do salto. Caia com os pés na largura dos ombros e o peito de frente para a cesta.',
        exercise: 'Step-back de três',
        dose: '5 arremessos por posição, 3 rodadas',
        minutes: 12,
      },
      {
        name: 'Fadeaway em uma perna',
        description: 'De costas ou de lado para a cesta, gira sobre o pé de apoio, levanta a perna de dentro e arremessa caindo para longe do marcador.',
        tip: 'Comece perto do garrafão. A perna levantada é contrapeso: solte a bola no ponto mais alto do salto.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6 de cada lado',
        minutes: 8,
      },
      {
        name: 'Floater depois do bloqueio',
        description: 'Quando o pivô adversário fica parado no garrafão esperando, para antes dele e solta a bola alta, por cima do braço estendido.',
        tip: 'Saia do chão com um pé só, a dois passos do aro, e solte com a ponta dos dedos.',
        exercise: 'Floater em uma perna',
        dose: '20 tentativas, 10 de cada mão',
        minutes: 6,
      },
    ],
  },
  {
    id: 'kyrie-irving',
    name: 'Kyrie Irving',
    group: 'guard',
    heightCm: 188,
    archetype: 'Mãos mais rápidas',
    pace: 'Rápido e imprevisível',
    summary:
      'Drible baixo e colado ao corpo, combinações em sequência e finalizações com as duas mãos, usando a tabela em ângulos que quase ninguém tenta.',
    mindset: 'A bola não sai da sua mão até você querer. Cada drible prepara o próximo.',
    moves: [
      {
        name: 'Combinação crossover e entre as pernas',
        description: 'Encadeia dribles sem parar, sempre abaixo da cintura, mudando de mão a cada batida.',
        tip: 'Olhe para a frente o tempo todo. Se precisar olhar a bola, diminua a velocidade.',
        exercise: 'Drible com duas bolas',
        dose: '4 séries de 45 s',
        minutes: 10,
      },
      {
        name: 'Bandeja com efeito na tabela',
        description: 'Finaliza de bandeja e com efeito, batendo a bola alto na tabela para fugir do toco.',
        tip: 'Varie o ponto da tabela a cada tentativa: alto, baixo, perto e longe do aro.',
        exercise: 'Mikan drill',
        dose: '3 séries de 1 min',
        minutes: 8,
      },
      {
        name: 'Finalização com as duas mãos',
        description: 'Termina com a mão de fora mesmo quando é a mão fraca, protegendo a bola com o corpo.',
        tip: 'Treine a mesma bandeja dos dois lados do aro, sempre com a mão mais longe do defensor.',
        exercise: 'Bandeja com a mão fraca',
        dose: '10 bandejas de cada lado',
        minutes: 8,
      },
      {
        name: 'Pull-up de média distância',
        description: 'Para de uma vez depois do drible e sobe equilibrado, sem andar para os lados.',
        tip: 'O último drible é o mais forte: ele traz a bola direto para a posição de arremesso.',
        exercise: 'Arremesso após drible',
        dose: '5 arremessos por posição',
        minutes: 10,
      },
    ],
  },
  {
    id: 'lebron-james',
    name: 'LeBron James',
    group: 'forward',
    heightCm: 206,
    archetype: 'Ataque em linha reta',
    pace: 'Explosivo',
    summary:
      'Ataca o aro em linha reta usando força e velocidade, decide no ar entre finalizar e passar e corre a transição como poucos.',
    mindset: 'Ataque o aro primeiro. O passe aparece quando a defesa fecha em você.',
    moves: [
      {
        name: 'Infiltração com contato',
        description: 'Dois passos longos, ombro no defensor e finalização protegendo a bola com as duas mãos.',
        tip: 'Use o ombro de dentro para criar espaço e termine com a mão de fora.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 10',
        minutes: 10,
      },
      {
        name: 'Passe em movimento',
        description: 'Passa de uma mão na corrida, sem parar, para o canto ou para quem corta.',
        tip: 'Marque um alvo na parede e acerte em movimento, alternando as mãos.',
        exercise: 'Passe na parede',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
      {
        name: 'Jogo de costas',
        description: 'Leva o defensor menor para perto do aro e usa o corpo para girar e finalizar.',
        tip: 'Sinta o defensor com o antebraço antes de decidir o lado do giro.',
        exercise: 'Trabalho de pés no poste baixo',
        dose: '3 séries de 8 por lado',
        minutes: 8,
      },
      {
        name: 'Transição',
        description: 'Pega o rebote e já sai em velocidade máxima até o outro lado.',
        tip: 'Chegue ao meio da quadra em no máximo três dribles.',
        exercise: 'Suicídio',
        dose: '6 idas',
        minutes: 8,
      },
    ],
  },
  {
    id: 'stephen-curry',
    name: 'Stephen Curry',
    group: 'guard',
    heightCm: 188,
    archetype: 'Arremessador sem limite',
    pace: 'Sempre em movimento',
    summary:
      'Arremesso rápido de qualquer distância e movimentação sem bola constante: cansa o defensor antes mesmo de receber.',
    mindset: 'Depois de passar, continue correndo. A próxima bola é sua.',
    moves: [
      {
        name: 'Recepção e arremesso rápido',
        description: 'Recebe já com os pés prontos e solta a bola em menos de meio segundo.',
        tip: 'Mãos prontas antes de a bola chegar. O arremesso começa na recepção.',
        exercise: 'Arremesso de três',
        dose: '10 arremessos por posição',
        minutes: 12,
      },
      {
        name: 'Movimentação sem bola',
        description: 'Corta, sai do bloqueio e volta para a linha de três sem parar.',
        tip: 'Chegue na linha já de frente para a cesta, com os pés alinhados.',
        exercise: 'Corre e arremessa',
        dose: '4 séries de 1 min',
        minutes: 12,
      },
      {
        name: 'Drible para o arremesso longo',
        description: 'Usa um ou dois dribles rápidos para criar espaço longe da linha.',
        tip: 'Mantenha a bola baixa e perto do corpo até subir para o arremesso.',
        exercise: 'Drible com duas bolas',
        dose: '3 séries de 45 s',
        minutes: 8,
      },
    ],
  },
  {
    id: 'shai-gilgeous-alexander',
    name: 'Shai Gilgeous-Alexander',
    group: 'guard',
    heightCm: 198,
    archetype: 'Rei da média distância',
    pace: 'Pausado, cheio de fintas',
    summary:
      'Mudanças de direção curtas, fintas de corpo e arremesso de média distância. Atrai o contato e vai muito para a linha de lance livre.',
    mindset: 'Uma finta bem vendida vale mais que três dribles.',
    moves: [
      {
        name: 'Mudança de direção curta',
        description: 'Muda de direção com passos curtos e o corpo baixo, sem perder velocidade.',
        tip: 'Quanto mais curto o passo, mais rápida a mudança.',
        exercise: 'Zigue-zague com mudança de direção',
        dose: '6 idas',
        minutes: 8,
      },
      {
        name: 'Meia distância parando de uma vez',
        description: 'Para em dois tempos no cotovelo e sobe antes de o defensor se recuperar.',
        tip: 'Pare com os dois pés no chão ao mesmo tempo.',
        exercise: 'Arremesso de média distância',
        dose: '6 arremessos por posição',
        minutes: 12,
      },
      {
        name: 'Eurostep',
        description: 'Primeiro passo para um lado, segundo para o outro, finalizando longe do toco.',
        tip: 'Mostre a bola para o lado do primeiro passo para vender a finta.',
        exercise: 'Eurostep entre cones',
        dose: '3 séries de 10',
        minutes: 10,
      },
      {
        name: 'Cavar o contato',
        description: 'Procura o corpo do defensor na subida e finaliza mesmo desequilibrado.',
        tip: 'Mantenha a bola alta e os olhos no aro durante o contato.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 8',
        minutes: 8,
      },
    ],
  },
  {
    id: 'nikola-jokic',
    name: 'Nikola Jokić',
    group: 'center',
    heightCm: 211,
    archetype: 'Pivô que joga de armador',
    pace: 'Calmo e preciso',
    summary:
      'Passa como um armador, joga de costas para a cesta com trabalho de pés e arremessa caindo para trás de um pé só.',
    mindset: 'Veja a quadra inteira antes de receber. A melhor jogada já está decidida.',
    moves: [
      {
        name: 'Passe do poste alto',
        description: 'Recebe no cotovelo e acha quem corta pelas costas da defesa.',
        tip: 'Receba, gire de frente para a cesta e só então decida.',
        exercise: 'Passe na parede',
        dose: '4 séries de 30 s, com alvo',
        minutes: 10,
      },
      {
        name: 'Jogo de costas',
        description: 'Ganha posição, sente o defensor e gira para o lado livre.',
        tip: 'Drop step e meia-volta, sempre dos dois lados do garrafão.',
        exercise: 'Trabalho de pés no poste baixo',
        dose: '3 séries de 8 por lado',
        minutes: 10,
      },
      {
        name: 'Arremesso de um pé só',
        description: 'Arremesso caindo para trás, apoiado na perna de dentro.',
        tip: 'Comece a meio metro do garrafão e só recue quando acertar 6 de 10.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6',
        minutes: 10,
      },
      {
        name: 'Floater no garrafão',
        description: 'Solta a bola alta antes de o pivô adversário chegar, sem precisar saltar muito.',
        tip: 'Solte a bola cedo, ainda subindo.',
        exercise: 'Floater em uma perna',
        dose: '20 tentativas',
        minutes: 6,
      },
    ],
  },
  {
    id: 'giannis-antetokounmpo',
    name: 'Giannis Antetokounmpo',
    group: 'forward',
    heightCm: 211,
    archetype: 'Passadas longas até o aro',
    pace: 'Explosivo',
    summary:
      'Usa a envergadura e passadas enormes para chegar ao aro de muito longe. Na defesa, aparece na ajuda para contestar tudo perto da cesta.',
    mindset: 'Toda posse termina no aro. Se a defesa fechar, passe e volte a atacar.',
    moves: [
      {
        name: 'Eurostep de passadas longas',
        description: 'Sai da linha de três e chega ao aro em dois dribles, mudando de direção na última passada.',
        tip: 'Alongue o último passo o máximo que conseguir sem perder o equilíbrio.',
        exercise: 'Eurostep entre cones',
        dose: '3 séries de 10',
        minutes: 10,
      },
      {
        name: 'Finalização com contato',
        description: 'Recebe o corpo do defensor e termina forte, com as duas mãos quando dá.',
        tip: 'Suba com os dois pés para ter mais força no contato.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 10',
        minutes: 10,
      },
      {
        name: 'Explosão vertical',
        description: 'Impulsão de dois pés para enterrar, pegar rebote e dar toco.',
        tip: 'Aterrisse suave, com os joelhos dobrados, antes do próximo salto.',
        exercise: 'Saltos na caixa',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Defesa de ajuda',
        description: 'Desliza do lado fraco para fechar a infiltração do adversário.',
        tip: 'Fique entre a bola e a cesta e chegue antes do atacante.',
        exercise: 'Deslizamento defensivo',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
    ],
  },
  {
    id: 'kevin-durant',
    name: 'Kevin Durant',
    group: 'forward',
    heightCm: 211,
    archetype: 'Arremesso impossível de marcar',
    pace: 'Fluido',
    summary:
      'Altura de pivô com drible e arremesso de armador. Sobe para arremessar de qualquer lugar da quadra, quase sempre por cima do defensor.',
    mindset: 'Um bom arremesso é aquele que só você consegue dar.',
    moves: [
      {
        name: 'Pull-up do cotovelo',
        description: 'Um drible para o lado, parada brusca e arremesso de média distância no ponto mais alto do salto.',
        tip: 'Suba reto e solte no topo: a altura faz o resto.',
        exercise: 'Arremesso após drible',
        dose: '5 arremessos por posição',
        minutes: 12,
      },
      {
        name: 'Arremesso de média distância',
        description: 'Arremesso parado dos cinco pontos ao redor do garrafão, com a mesma mecânica sempre.',
        tip: 'Repita a mesma rotina antes de cada arremesso.',
        exercise: 'Arremesso de média distância',
        dose: '6 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Turnaround por cima do defensor',
        description: 'De costas no cotovelo, gira e arremessa caindo levemente para trás.',
        tip: 'Gire para o lado do ombro mais livre e mantenha a bola acima da cabeça.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6 de cada lado',
        minutes: 10,
      },
    ],
  },
  {
    id: 'jayson-tatum',
    name: 'Jayson Tatum',
    group: 'forward',
    heightCm: 203,
    archetype: 'Ala de três níveis',
    pace: 'Paciente',
    summary:
      'Pontua da linha de três, da média distância e perto do aro, e ainda defende várias posições.',
    mindset: 'Leia o defensor antes de escolher a distância.',
    moves: [
      {
        name: 'Step-back de três',
        description: 'Drible para dentro, recuo e arremesso de três em base larga.',
        tip: 'Mantenha a bola no mesmo bolso de arremesso depois do recuo.',
        exercise: 'Step-back de três',
        dose: '5 arremessos por posição, 3 rodadas',
        minutes: 12,
      },
      {
        name: 'Fadeaway de média distância',
        description: 'De costas ou de lado no cotovelo, gira e arremessa se afastando do defensor.',
        tip: 'Fique de frente para a cesta no ar, não só na aterrissagem.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Defesa no perímetro',
        description: 'Desliza lateralmente sem cruzar as pernas e acompanha o atacante até o fim.',
        tip: 'Base baixa e mãos ativas o tempo todo.',
        exercise: 'Deslizamento defensivo',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
    ],
  },
  {
    id: 'anthony-edwards',
    name: 'Anthony Edwards',
    group: 'guard',
    heightCm: 193,
    archetype: 'Ataque explosivo',
    pace: 'Intenso',
    summary:
      'Primeiro passo explosivo, enterradas no trânsito e arremesso de três depois do drible. Defende com a mesma energia que ataca.',
    mindset: 'Jogue cada posse no volume máximo.',
    moves: [
      {
        name: 'Ataque ao aro',
        description: 'Explode no primeiro passo e termina por cima ou através do defensor.',
        tip: 'Abaixe o ombro no primeiro passo para ganhar a frente.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 10',
        minutes: 10,
      },
      {
        name: 'Impulsão',
        description: 'Saltos explosivos para finalizar acima do aro.',
        tip: 'Use os braços para subir mais.',
        exercise: 'Saltos na caixa',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Pull-up de três',
        description: 'Um ou dois dribles e arremesso de três sem perder o ritmo.',
        tip: 'Pare com os pés já virados para a cesta.',
        exercise: 'Arremesso após drible',
        dose: '5 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Fechar o arremessador',
        description: 'Sai da ajuda e chega no arremessador com passos curtos e mão alta.',
        tip: 'Corra os primeiros dois terços e encurte o passo no final.',
        exercise: 'Closeout',
        dose: '3 séries de 8',
        minutes: 8,
      },
    ],
  },
  {
    id: 'victor-wembanyama',
    name: 'Victor Wembanyama',
    group: 'center',
    heightCm: 224,
    archetype: 'Pivô que faz tudo',
    pace: 'Imprevisível',
    summary:
      'Altura de pivô, drible de ala e arremesso de três. Na defesa, protege o aro e ainda fecha arremessos no perímetro.',
    mindset: 'Não deixe sua posição dizer o que você pode fazer em quadra.',
    moves: [
      {
        name: 'Arremesso de três do pivô',
        description: 'Arremesso de três parado, saindo do bloqueio ou depois de um passe.',
        tip: 'Pés na largura dos ombros e soltura alta.',
        exercise: 'Arremesso de três',
        dose: '10 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Drible em campo aberto',
        description: 'Leva a bola de um lado ao outro como um armador, trocando de mão.',
        tip: 'Passos longos e drible na altura da cintura.',
        exercise: 'Zigue-zague com mudança de direção',
        dose: '6 idas',
        minutes: 8,
      },
      {
        name: 'Turnaround de média distância',
        description: 'Gira de costas no cotovelo e arremessa por cima de qualquer defensor.',
        tip: 'Gire sobre o pé de apoio sem arrastar o outro.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Contestar no perímetro',
        description: 'Sai do garrafão até a linha de três para fechar o arremesso com a mão alta.',
        tip: 'Chegue equilibrado para não ser driblado na saída.',
        exercise: 'Closeout',
        dose: '3 séries de 8',
        minutes: 8,
      },
    ],
  },
  {
    id: 'jalen-brunson',
    name: 'Jalen Brunson',
    group: 'guard',
    heightCm: 188,
    archetype: 'Trabalho de pés de veterano',
    pace: 'Pausado',
    summary:
      'Compensa a altura com fintas, giros e trabalho de pés. Chega no garrafão no próprio tempo e finaliza de média distância ou com floater.',
    mindset: 'Velocidade não é tudo. Quem controla o ritmo controla o defensor.',
    moves: [
      {
        name: 'Corta-luz e leitura',
        description: 'Usa o bloqueio para chegar ao cotovelo e decide entre arremesso e passe.',
        tip: 'Saia do bloqueio colado no pivô para o defensor não passar.',
        exercise: 'Corta-luz com cadeira',
        dose: '3 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Mudança de ritmo',
        description: 'Desacelera no meio da jogada e acelera de novo quando o defensor relaxa.',
        tip: 'Mude o ritmo, não só a direção.',
        exercise: 'Hesitação em linha reta',
        dose: '6 idas',
        minutes: 8,
      },
      {
        name: 'Giro e fadeaway',
        description: 'Para no cotovelo, finta, gira e arremessa se afastando do defensor.',
        tip: 'Venda a finta com os olhos e os ombros antes de girar.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6 de cada lado',
        minutes: 10,
      },
      {
        name: 'Floater',
        description: 'Solta a bola alta no meio do garrafão antes de o pivô chegar.',
        tip: 'Decida o floater antes de entrar no garrafão.',
        exercise: 'Floater em uma perna',
        dose: '20 tentativas',
        minutes: 8,
      },
    ],
  },
  {
    id: 'james-harden',
    name: 'James Harden',
    group: 'guard',
    heightCm: 196,
    archetype: 'Mestre do step-back',
    pace: 'Lento, cheio de pausas',
    summary:
      'Controla a posse inteira com o drible. Usa o corta-luz para escolher o marcador, recua para o step-back de três e, quando a defesa sobe, ataca o aro procurando o contato.',
    mindset: 'Faça o defensor reagir primeiro. A pausa é uma arma.',
    moves: [
      {
        name: 'Leitura do pick-and-roll',
        description: 'Chama o corta-luz, espera o pivô adversário se comprometer e decide entre o arremesso, a infiltração e o passe.',
        tip: 'Saia do bloqueio devagar: quem tem pressa erra a leitura.',
        exercise: 'Corta-luz com cadeira',
        dose: '3 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Step-back de três',
        description: 'Um ou dois dribles de ataque, recuo com os dois pés e arremesso de três em base larga.',
        tip: 'Recue para trás, não para o lado, para cair equilibrado.',
        exercise: 'Step-back de três',
        dose: '5 arremessos por posição, 3 rodadas',
        minutes: 12,
      },
      {
        name: 'Eurostep',
        description: 'Primeiro passo para um lado e segundo para o outro, longe do braço do defensor.',
        tip: 'Mostre a bola para o lado do primeiro passo e esconda no segundo.',
        exercise: 'Eurostep entre cones',
        dose: '3 séries de 10',
        minutes: 10,
      },
      {
        name: 'Procurar o contato',
        description: 'Encosta no defensor na subida e finaliza mesmo com o braço dele no caminho.',
        tip: 'Leve a bola para cima antes do contato, não depois.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 8',
        minutes: 8,
      },
    ],
  },
  {
    id: 'damian-lillard',
    name: 'Damian Lillard',
    group: 'guard',
    heightCm: 188,
    archetype: 'Arremesso do logo',
    pace: 'Calmo nos minutos finais',
    summary:
      'Arremessa de muito longe da linha de três com a mesma mecânica de perto. Usa o corta-luz para ganhar meio segundo e não tem medo da última bola do jogo.',
    mindset: 'O último arremesso é igual ao primeiro. Mesma rotina, mesma mecânica.',
    moves: [
      {
        name: 'Três de muito longe',
        description: 'Arremesso de três um ou dois passos atrás da linha, sem mudar a mecânica.',
        tip: 'A força vem das pernas. Se precisar empurrar com os braços, chegue mais perto.',
        exercise: 'Arremesso de três',
        dose: '10 arremessos por posição, um passo atrás da linha',
        minutes: 12,
      },
      {
        name: 'Pull-up depois do corta-luz',
        description: 'Sai do bloqueio e já sobe para o arremesso antes de o defensor se recuperar.',
        tip: 'Pés prontos antes de pegar a bola no último drible.',
        exercise: 'Corta-luz com cadeira',
        dose: '3 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Drible para o arremesso',
        description: 'Drible baixo e rápido para criar o espaço do arremesso longo.',
        tip: 'Termine o drible com a bola já subindo para o bolso de arremesso.',
        exercise: 'Drible com duas bolas',
        dose: '3 séries de 45 s',
        minutes: 8,
      },
    ],
  },
  {
    id: 'ja-morant',
    name: 'Ja Morant',
    group: 'guard',
    heightCm: 188,
    archetype: 'Voo até o aro',
    pace: 'Explosivo',
    summary:
      'Primeiro passo rapidíssimo e impulsão de ala. Ataca o garrafão sem medo dos pivôs e termina com bandejas em ângulos difíceis ou com floater.',
    mindset: 'Ataque o aro como se ninguém estivesse embaixo dele.',
    moves: [
      {
        name: 'Primeiro passo explosivo',
        description: 'Uma hesitação curta e a explosão para passar o defensor no primeiro passo.',
        tip: 'Empurre o chão com o pé de trás e mantenha o corpo baixo.',
        exercise: 'Hesitação em linha reta',
        dose: '6 idas de fundo a fundo',
        minutes: 8,
      },
      {
        name: 'Impulsão',
        description: 'Saltos explosivos de um e de dois pés para finalizar acima dos pivôs.',
        tip: 'Aterrisse com os joelhos dobrados e salte de novo na hora.',
        exercise: 'Saltos na caixa',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Finalização com as duas mãos',
        description: 'Troca de mão no ar e termina do lado oposto ao braço do pivô.',
        tip: 'Mude o ângulo da bandeja a cada tentativa: de frente, de lado e pela linha de fundo.',
        exercise: 'Bandeja com a mão fraca',
        dose: '10 bandejas de cada lado',
        minutes: 10,
      },
      {
        name: 'Floater',
        description: 'Quando o pivô espera embaixo do aro, solta a bola alta antes de chegar nele.',
        tip: 'Decida o floater ainda fora do garrafão.',
        exercise: 'Floater em uma perna',
        dose: '20 tentativas',
        minutes: 8,
      },
    ],
  },
  {
    id: 'tyrese-haliburton',
    name: 'Tyrese Haliburton',
    group: 'guard',
    heightCm: 196,
    archetype: 'Armador que pensa no passe',
    pace: 'Rápido nas decisões',
    summary:
      'Acelera o jogo e acha o passe antes de a defesa girar. Quase não perde a bola e ainda arremessa de três com uma mecânica própria.',
    mindset: 'A bola anda mais rápido que qualquer jogador. Passe antes de precisar.',
    moves: [
      {
        name: 'Passe antes de a defesa girar',
        description: 'Passa de uma mão, sem parar o drible, para o companheiro que acabou de ficar livre.',
        tip: 'Marque alvos diferentes na parede e acerte sem olhar para a bola.',
        exercise: 'Passe na parede',
        dose: '4 séries de 30 s, com alvo',
        minutes: 10,
      },
      {
        name: 'Pick-and-roll',
        description: 'Sai do bloqueio olhando o garrafão inteiro e escolhe entre o passe e o arremesso.',
        tip: 'Levante a cabeça antes do bloqueio, não depois.',
        exercise: 'Corta-luz com cadeira',
        dose: '3 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Três de recepção rápida',
        description: 'Recebe e arremessa de três em um movimento só.',
        tip: 'Mãos prontas e joelhos dobrados antes de a bola chegar.',
        exercise: 'Arremesso de três',
        dose: '10 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Transição',
        description: 'Pega o rebote e sai em velocidade para atacar antes de a defesa se arrumar.',
        tip: 'Dois dribles longos até o meio da quadra.',
        exercise: 'Suicídio',
        dose: '6 idas',
        minutes: 8,
      },
    ],
  },
  {
    id: 'devin-booker',
    name: 'Devin Booker',
    group: 'guard',
    heightCm: 196,
    archetype: 'Artista da média distância',
    pace: 'Paciente',
    summary:
      'Pontua de todos os lugares, mas vive na média distância: para em dois tempos, finta e sobe para o arremesso com a mecânica sempre igual.',
    mindset: 'Domine o arremesso que a defesa deixa. É o mais difícil de tirar.',
    moves: [
      {
        name: 'Pull-up de média distância',
        description: 'Um ou dois dribles, parada brusca e arremesso no cotovelo ou na linha de fundo.',
        tip: 'Pare com os pés já virados para a cesta.',
        exercise: 'Arremesso após drible',
        dose: '5 arremessos por posição',
        minutes: 12,
      },
      {
        name: 'Fadeaway',
        description: 'Gira de costas no cotovelo e arremessa se afastando do marcador.',
        tip: 'Mantenha os ombros de frente para a cesta durante o giro.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6 de cada lado',
        minutes: 10,
      },
      {
        name: 'Jogo de costas de armador',
        description: 'Leva o marcador menor para o poste e usa o trabalho de pés para se livrar.',
        tip: 'Sinta o defensor antes de girar: vá para o lado em que ele não está.',
        exercise: 'Trabalho de pés no poste baixo',
        dose: '3 séries de 8 por lado',
        minutes: 8,
      },
      {
        name: 'Arremesso parado',
        description: 'A base de tudo: arremesso de média distância com a mesma mecânica.',
        tip: 'Repita a mesma rotina antes de cada arremesso.',
        exercise: 'Arremesso de média distância',
        dose: '6 arremessos por posição',
        minutes: 10,
      },
    ],
  },
  {
    id: 'joel-embiid',
    name: 'Joel Embiid',
    group: 'center',
    heightCm: 213,
    archetype: 'Pivô com jogo de ala',
    pace: 'Paciente no poste',
    summary:
      'Trabalho de pés de pivô clássico com arremesso de média distância de ala. Força a falta perto do aro e vai muito para a linha de lance livre.',
    mindset: 'Use o tamanho e a técnica juntos. Um sem o outro não basta.',
    moves: [
      {
        name: 'Jogo de costas',
        description: 'Ganha posição no poste baixo e combina drop step, meia-volta e fintas.',
        tip: 'Uma finta de ombro antes do giro já tira o defensor do lugar.',
        exercise: 'Trabalho de pés no poste baixo',
        dose: '4 séries de 8 por lado',
        minutes: 12,
      },
      {
        name: 'Arremesso de média do pivô',
        description: 'Recebe no cotovelo, de frente para a cesta, e arremessa antes de o defensor chegar.',
        tip: 'Pés prontos na recepção, sem ajeitar depois.',
        exercise: 'Arremesso de média distância',
        dose: '6 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Turnaround',
        description: 'De costas no garrafão, gira e arremessa caindo um pouco para trás.',
        tip: 'Gire sobre o pé de apoio sem arrastar o outro.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Forçar a falta',
        description: 'Leva o corpo do defensor junto na finalização e termina mesmo com contato.',
        tip: 'Suba com os dois pés e a bola protegida acima da cabeça.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 8',
        minutes: 8,
      },
    ],
  },
  {
    id: 'kawhi-leonard',
    name: 'Kawhi Leonard',
    group: 'forward',
    heightCm: 201,
    archetype: 'Defesa e média distância',
    pace: 'Frio, sem pressa',
    summary:
      'Defende o melhor jogador adversário com mãos enormes e ataca em ritmo próprio, com pull-ups e fadeaways de média distância.',
    mindset: 'Sem pressa e sem emoção. Faça o trabalho dos dois lados da quadra.',
    moves: [
      {
        name: 'Pull-up de média distância',
        description: 'Drible forte para o lado e parada de uma vez, subindo no meio do defensor.',
        tip: 'O último drible é o mais forte: ele traz a bola para o arremesso.',
        exercise: 'Arremesso após drible',
        dose: '5 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Fadeaway do cotovelo',
        description: 'De costas ou de lado no cotovelo, gira e arremessa por cima do marcador.',
        tip: 'Solte a bola no ponto mais alto do salto.',
        exercise: 'Fadeaway do cotovelo',
        dose: '4 séries de 6 de cada lado',
        minutes: 10,
      },
      {
        name: 'Defesa no perímetro',
        description: 'Fica na frente do atacante com passos curtos e mãos ativas na linha do passe.',
        tip: 'Base baixa e mãos abertas: a bola passa perto delas.',
        exercise: 'Deslizamento defensivo',
        dose: '4 séries de 30 s',
        minutes: 10,
      },
      {
        name: 'Fechar o arremessador',
        description: 'Sai da ajuda e chega no arremessador com a mão alta sem ser driblado.',
        tip: 'Encurte o passo no fim para chegar equilibrado.',
        exercise: 'Closeout',
        dose: '3 séries de 8',
        minutes: 8,
      },
    ],
  },
  {
    id: 'trae-young',
    name: 'Trae Young',
    group: 'guard',
    heightCm: 185,
    archetype: 'Floater e passe',
    pace: 'Imprevisível',
    summary:
      'Arremessa de muito longe depois do drible, solta o floater no meio do garrafão e acha o pivô com passes por cima da defesa.',
    mindset: 'Seja ameaça de longe e de perto. A defesa não pode escolher.',
    moves: [
      {
        name: 'Floater',
        description: 'Solta a bola alta no meio do garrafão, por cima do braço do pivô.',
        tip: 'Saia do chão com um pé só e solte com a ponta dos dedos.',
        exercise: 'Floater em uma perna',
        dose: '20 tentativas, 10 de cada mão',
        minutes: 10,
      },
      {
        name: 'Pick-and-roll',
        description: 'Usa o bloqueio para atrair dois defensores e acha o pivô que mergulha.',
        tip: 'Quando dois vierem em você, o passe já está pronto.',
        exercise: 'Corta-luz com cadeira',
        dose: '3 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Três depois do drible',
        description: 'Um ou dois dribles e arremesso de três de longe da linha.',
        tip: 'Termine o drible já com os pés alinhados.',
        exercise: 'Arremesso após drible',
        dose: '5 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Passe por cima da defesa',
        description: 'Passe alto e preciso para o pivô perto do aro.',
        tip: 'Mire um ponto acima do alvo na parede, como se fosse um lob.',
        exercise: 'Passe na parede',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
    ],
  },
  {
    id: 'jimmy-butler',
    name: 'Jimmy Butler',
    group: 'forward',
    heightCm: 201,
    archetype: 'Trabalho de pés e fim de jogo',
    pace: 'Paciente, acelera no fim',
    summary:
      'Não depende de drible vistoso. Usa fintas e trabalho de pés para tirar o defensor do lugar, procura o contato perto do aro e vai muito para a linha de lance livre, principalmente quando o jogo aperta.',
    mindset: 'Jogo grande se ganha nos detalhes. Faça o simples melhor do que todo mundo.',
    moves: [
      {
        name: 'Finta e ataque',
        description: 'Recebe de frente para a cesta, faz o defensor subir com a finta de arremesso e passa por ele com um drible só.',
        tip: 'A finta é com os olhos e os ombros. Se os calcanhares saírem do chão, ela vira andada.',
        exercise: 'Finta de arremesso e um drible',
        dose: '4 séries de 6 de cada lado',
        minutes: 10,
      },
      {
        name: 'Procurar o contato',
        description: 'Encosta o ombro no defensor na subida para a bandeja e termina a jogada mesmo com o choque.',
        tip: 'Suba com a bola protegida do lado de fora do corpo e continue olhando para o aro depois do contato.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 8',
        minutes: 8,
      },
      {
        name: 'Pull-up de média distância',
        description: 'Dois dribles fortes para o cotovelo, parada em equilíbrio e arremesso antes de o defensor se recuperar.',
        tip: 'Pare com o peito de frente para a cesta. O último drible é o mais forte e leva a bola para o bolso de arremesso.',
        exercise: 'Arremesso após drible',
        dose: '5 arremessos por posição, 3 rodadas',
        minutes: 10,
      },
      {
        name: 'Roubar na linha de passe',
        description: 'Marca um pouco afastado do seu jogador, lê os olhos do armador e ataca o passe para sair em contra-ataque.',
        tip: 'Fique com uma mão na linha de passe e veja a bola e o seu jogador ao mesmo tempo.',
        exercise: 'Negar a linha de passe',
        dose: '4 séries de 30 s',
        minutes: 6,
      },
    ],
  },
  {
    id: 'paul-george',
    name: 'Paul George',
    group: 'forward',
    heightCm: 203,
    archetype: 'Ala de ataque e defesa',
    pace: 'Fluido e sem pressa',
    summary:
      'Ala comprido, com arremesso suave de longe e movimento limpo sem a bola. Do outro lado da quadra, usa os braços longos para marcar o melhor atacante do adversário.',
    mindset: 'Valha pelos dois lados da quadra. A defesa também é o seu jogo.',
    moves: [
      {
        name: 'Saída do bloqueio',
        description: 'Corre colado ao corta-luz, recebe já de pés prontos e solta a bola sem drible nenhum.',
        tip: 'Raspe o ombro no bloqueio e prepare as mãos antes de a bola chegar.',
        exercise: 'Arremesso saindo do bloqueio',
        dose: '4 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Pull-up de três',
        description: 'Ataca o defensor que recua e para de repente atrás da linha, subindo direto do drible.',
        tip: 'Puxe a bola para cima em uma linha só, sem baixá-la de novo antes de arremessar.',
        exercise: 'Pull-up de três',
        dose: '5 arremessos por posição, 3 rodadas',
        minutes: 10,
      },
      {
        name: 'Passo lateral de três',
        description: 'Quando o defensor chega fechando a linha, dá um passo para o lado e arremessa com espaço.',
        tip: 'O passo é largo e baixo. Caia equilibrado, com os pés na largura dos ombros.',
        exercise: 'Passo lateral de três',
        dose: '4 séries de 6 de cada lado',
        minutes: 8,
      },
      {
        name: 'Defesa no perímetro',
        description: 'Acompanha o atacante em deslocamento lateral, sem cruzar os pés, e usa os braços longos para atrapalhar o drible e o passe.',
        tip: 'Quadril baixo e peito erguido. Quem empurra é o pé de trás.',
        exercise: 'Deslizamento defensivo',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
    ],
  },
  {
    id: 'pascal-siakam',
    name: 'Pascal Siakam',
    group: 'forward',
    heightCm: 203,
    archetype: 'Giro e passada longa',
    pace: 'Sempre em movimento',
    summary:
      'Começou tarde no basquete e construiu o jogo em cima de energia e movimento. Corre a quadra inteira, ataca com passadas longas e usa o giro para sair do defensor perto do garrafão.',
    mindset: 'Corra mais do que o seu marcador. Quem não para acaba achando espaço.',
    moves: [
      {
        name: 'Giro para o aro',
        description: 'Ataca um lado, encosta no defensor e gira de costas para o outro, terminando perto do aro.',
        tip: 'Gire com a bola perto do corpo, sobre o pé da frente, e já saia olhando para a tabela.',
        exercise: 'Giro e bandeja',
        dose: '3 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Contra-ataque de ponta a ponta',
        description: 'Pega a bola na defesa e leva sozinho até o outro lado, com passadas longas e poucos dribles.',
        tip: 'Empurre a bola para a frente e corra atrás dela. Menos dribles significam mais velocidade.',
        exercise: 'Bandeja em velocidade',
        dose: '10 idas de cada lado',
        minutes: 8,
      },
      {
        name: 'Meia-volta no poste',
        description: 'De costas para a cesta, sente onde está o defensor, gira para o lado livre e arremessa.',
        tip: 'Use o antebraço para sentir o defensor, sem empurrar. Decida pelo lado em que ele estiver mais longe.',
        exercise: 'Meia-volta do poste',
        dose: '4 séries de 6 de cada lado',
        minutes: 8,
      },
      {
        name: 'Gancho curto',
        description: 'Perto do garrafão, protege a bola com o corpo e solta um gancho por cima do defensor.',
        tip: 'Ombro de dentro apontado para o aro e cotovelo alto na hora de soltar.',
        exercise: 'Gancho curto',
        dose: '20 tentativas, 10 de cada mão',
        minutes: 6,
      },
    ],
  },
  {
    id: 'zion-williamson',
    name: 'Zion Williamson',
    group: 'forward',
    heightCm: 198,
    archetype: 'Força e explosão no aro',
    pace: 'Explosivo',
    summary:
      'Combina a força de um pivô com a velocidade de um armador. Ataca o garrafão com a mão esquerda, sobe rápido duas vezes seguidas e termina por cima de quem aparecer.',
    mindset: 'Vá em direção ao contato. O aro é o seu lugar.',
    moves: [
      {
        name: 'Ataque com força',
        description: 'Baixa o ombro no primeiro passo, chega ao garrafão em dois dribles e sobe com os dois pés.',
        tip: 'Pare com os dois pés antes de subir: é a base que transforma velocidade em altura.',
        exercise: 'Subida com força',
        dose: '3 séries de 8 de cada lado',
        minutes: 10,
      },
      {
        name: 'Segunda subida',
        description: 'Quando a bola volta do aro, salta de novo antes de todo mundo e coloca de volta na cesta.',
        tip: 'Volte ao chão com os joelhos dobrados, pronto para saltar outra vez sem preparação.',
        exercise: 'Duas subidas na tabela',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Finalizar com contato',
        description: 'Usa o corpo para abrir espaço no ar e termina a bandeja mesmo com o defensor em cima.',
        tip: 'Mantenha a bola longe do defensor, do outro lado do corpo.',
        exercise: 'Bandeja com contato',
        dose: '3 séries de 8',
        minutes: 8,
      },
      {
        name: 'Passe depois de atrair a defesa',
        description: 'Quando dois defensores fecham no garrafão, solta a bola para o companheiro que ficou livre.',
        tip: 'Decida antes de sair do chão. Olhe para o aro, mas saiba onde está o companheiro.',
        exercise: 'Passe após o drible',
        dose: '4 séries de 30 s',
        minutes: 6,
      },
      {
        name: 'Explosão nas pernas',
        description: 'A potência dele vem do trabalho físico: saltos curtos, rápidos e repetidos.',
        tip: 'Aterrisse sem barulho e com os joelhos alinhados aos pés. Pare a série quando o salto perder altura.',
        exercise: 'Saltos na caixa',
        dose: '4 séries de 6',
        minutes: 6,
      },
    ],
  },
  {
    id: 'scottie-barnes',
    name: 'Scottie Barnes',
    group: 'forward',
    heightCm: 201,
    archetype: 'Ala que organiza o jogo',
    pace: 'Enérgico',
    summary:
      'Ala grande que joga como armador. Pega o rebote, sai driblando e encontra os companheiros em velocidade, e na defesa consegue marcar jogadores de várias posições.',
    mindset: 'Faça o que o time precisa agora: rebote, passe, defesa ou cesta.',
    moves: [
      {
        name: 'Rebote para sair jogando',
        description: 'Tira o adversário do caminho, pega a bola no ponto mais alto e já procura para onde correr.',
        tip: 'Primeiro o contato, depois a bola. Assim que descer, olhe para a frente.',
        exercise: 'Bloqueio de rebote parado',
        dose: '4 séries de 8',
        minutes: 6,
      },
      {
        name: 'Passe em corrida',
        description: 'Em contra-ataque, solta a bola longa e na frente do companheiro, para ele não precisar diminuir o passo.',
        tip: 'Passe para onde o companheiro vai estar, não para onde ele está.',
        exercise: 'Passe longo em corrida',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
      {
        name: 'Passe depois do drible',
        description: 'Ataca o garrafão com o corpo grande e, quando a defesa fecha, acha o arremessador aberto.',
        tip: 'Passe com a mão de fora, sem precisar parar o drible com as duas mãos.',
        exercise: 'Passe após o drible',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
      {
        name: 'Bandeja em velocidade',
        description: 'Termina o contra-ataque em passadas longas, sem perder velocidade na subida.',
        tip: 'Mantenha a bola alta e protegida nos dois últimos passos.',
        exercise: 'Bandeja em velocidade',
        dose: '10 idas de cada lado',
        minutes: 8,
      },
      {
        name: 'Ajudar e voltar',
        description: 'Sai do seu jogador para ajudar no garrafão e volta a tempo de contestar o arremesso.',
        tip: 'Fique entre a bola e o seu jogador. Volte com passos curtos e com a mão alta.',
        exercise: 'Ajuda e recuperação',
        dose: '4 séries de 30 s',
        minutes: 6,
      },
    ],
  },
  {
    id: 'anthony-davis',
    name: 'Anthony Davis',
    group: 'center',
    heightCm: 208,
    archetype: 'Pivô que protege e finaliza',
    pace: 'Leve para o tamanho',
    summary:
      'Grande, mas se move como um ala. Termina pontes aéreas, arremessa de média distância e usa o tempo de salto e os braços longos para proteger o aro.',
    mindset: 'Proteja o aro nos dois lados: ninguém entra fácil, e você não perde a bola lá em cima.',
    moves: [
      {
        name: 'Bola no alto',
        description: 'Corre para o aro depois do corta-luz e pega a bola no ponto mais alto, sem deixá-la descer.',
        tip: 'Mãos para cima antes de saltar. Pegue com as duas mãos e termine sem trazer a bola para baixo.',
        exercise: 'Pega no alto e finaliza',
        dose: '4 séries de 6',
        minutes: 8,
      },
      {
        name: 'Média distância de frente',
        description: 'Recebe no cotovelo, de frente para a cesta, e arremessa se o defensor ficar longe.',
        tip: 'Mesmo sendo alto, mantenha a mecânica simples: pés para a cesta, cotovelo alinhado e finalização alta.',
        exercise: 'Arremesso de média distância',
        dose: '6 arremessos por posição',
        minutes: 10,
      },
      {
        name: 'Jogo de costas',
        description: 'Ganha posição perto do aro, lê o defensor e usa os pés para encontrar o caminho.',
        tip: 'Receba com os joelhos dobrados e leve o quadril para dentro do defensor antes de girar.',
        exercise: 'Trabalho de pés no poste baixo',
        dose: '4 séries de 8 por lado',
        minutes: 10,
      },
      {
        name: 'Toco na ajuda',
        description: 'Sai do lado oposto, acerta o tempo do salto e contesta a bandeja sem fazer falta.',
        tip: 'Espere a bola sair da mão do atacante. Salte para cima, sem ir para a frente.',
        exercise: 'Contestar o arremesso',
        dose: '4 séries de 30 s',
        minutes: 6,
      },
    ],
  },
  {
    id: 'karl-anthony-towns',
    name: 'Karl-Anthony Towns',
    group: 'center',
    heightCm: 211,
    archetype: 'Pivô arremessador',
    pace: 'Tranquilo',
    summary:
      'Um dos pivôs que melhor arremessam de longe. Abre o garrafão ao sair para a linha de três e, quando o defensor chega correndo, ataca ou joga de costas perto da cesta.',
    mindset: 'Tamanho não tira a precisão. Treine o arremesso como um armador.',
    moves: [
      {
        name: 'Três do pivô',
        description: 'Faz o corta-luz, abre para a linha de três e arremessa antes de o defensor chegar.',
        tip: 'Pés prontos antes de a bola chegar. Um pivô não pode gastar tempo ajeitando o corpo.',
        exercise: 'Arremesso de três',
        dose: '5 arremessos por posição, 3 rodadas',
        minutes: 12,
      },
      {
        name: 'Receber e soltar',
        description: 'Recebe o passe e solta em um único movimento, do pé à ponta dos dedos.',
        tip: 'Comece dobrando os joelhos enquanto a bola vem. O impulso sai das pernas.',
        exercise: 'Receber e arremessar',
        dose: '4 séries de 8',
        minutes: 8,
      },
      {
        name: 'Finta e ataque',
        description: 'Se o defensor chega correndo, finge o arremesso e passa por ele a caminho do aro.',
        tip: 'Só um drible forte. Um defensor grande que subiu demora a voltar.',
        exercise: 'Finta de arremesso e um drible',
        dose: '4 séries de 6 de cada lado',
        minutes: 8,
      },
      {
        name: 'Meia-volta no poste',
        description: 'Quando um defensor menor marca, leva o jogo para perto do aro e arremessa por cima.',
        tip: 'Gire sobre o pé de apoio e solte a bola no ponto mais alto.',
        exercise: 'Meia-volta do poste',
        dose: '4 séries de 6 de cada lado',
        minutes: 6,
      },
      {
        name: 'Rebote ofensivo',
        description: 'Depois do arremesso de um companheiro, volta para o garrafão e disputa a segunda chance.',
        tip: 'Vá ao espaço que o defensor deixou, em vez de esperar a bola no mesmo lugar.',
        exercise: 'Rebote ofensivo',
        dose: '3 séries de 8',
        minutes: 6,
      },
    ],
  },
  {
    id: 'bam-adebayo',
    name: 'Bam Adebayo',
    group: 'center',
    heightCm: 206,
    archetype: 'Pivô que marca todo mundo',
    pace: 'Intenso',
    summary:
      'Marca do armador ao pivô na mesma jogada, com pés rápidos para o tamanho. No ataque, faz o jogo fluir pelo cotovelo do garrafão: passa, entrega a bola em movimento e corre para o aro.',
    mindset: 'A defesa é a sua assinatura. No ataque, faça os outros jogarem melhor.',
    moves: [
      {
        name: 'Trocar na marcação',
        description: 'Depois do corta-luz, assume o armador sem dar espaço e o acompanha lateralmente.',
        tip: 'Comece um passo atrás e use a base larga. Para um pivô, a primeira passada define a jogada.',
        exercise: 'Deslizamento defensivo',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
      {
        name: 'Defender o bloqueio',
        description: 'Lê a jogada de corta-luz e decide entre subir, recuar ou trocar com o companheiro.',
        tip: 'Comunique alto, antes do bloqueio chegar. Defesa de pick-and-roll começa com a voz.',
        exercise: 'Defesa do bloqueio',
        dose: '3 séries de 8',
        minutes: 8,
      },
      {
        name: 'Entrega curta',
        description: 'Recebe no alto do garrafão, entrega a bola para o arremessador que passa e faz o bloqueio com o corpo.',
        tip: 'Entregue na altura do peito. Depois, vire de frente para o aro e corra.',
        exercise: 'Passe curto no bloqueio',
        dose: '4 séries de 30 s',
        minutes: 8,
      },
      {
        name: 'Arremesso do cotovelo',
        description: 'Se o defensor recua para proteger o aro, arremessa de média distância do cotovelo.',
        tip: 'Não pare de tentar o que não está caindo: a confiança nesse arremesso se ganha em repetição.',
        exercise: 'Arremesso de média distância',
        dose: '6 arremessos por posição',
        minutes: 8,
      },
      {
        name: 'Subida para a enterrada',
        description: 'Corre para o aro depois do passe e sobe forte, com os dois pés, para terminar.',
        tip: 'Vá até o fim: a jogada só acaba quando a bola passa pelo aro.',
        exercise: 'Subida com força',
        dose: '3 séries de 8',
        minutes: 6,
      },
    ],
  },
]

type CatalogRow = { id: number; name: string; category: string; metric: string }

/** Divide 100% entre as categorias pelos minutos, sem perder pontos no arredondamento (maior resto). */
export function splitPercent(minutesByCategory: Record<string, number>) {
  const total = Object.values(minutesByCategory).reduce((sum, m) => sum + m, 0)
  if (!total) return {}
  const parts = Object.entries(minutesByCategory).map(([category, m]) => {
    const exact = (m * 100) / total
    return { category, value: Math.floor(exact), rest: exact - Math.floor(exact) }
  })
  let missing = 100 - parts.reduce((sum, p) => sum + p.value, 0)
  for (const part of [...parts].sort((a, b) => b.rest - a.rest)) {
    if (missing-- <= 0) break
    part.value++
  }
  return Object.fromEntries(parts.sort((a, b) => b.value - a.value).map((p) => [p.category, p.value]))
}

function resolve(style: Style, catalog: Map<string, CatalogRow>) {
  const find = (name: string) => {
    const row = catalog.get(name)
    return row ? { exerciseId: row.id, name: row.name, category: row.category, metric: row.metric } : null
  }
  const moves = style.moves.map(({ exercise, ...move }) => ({ ...move, exercise: find(exercise) }))
  // Nomes que sumiram do catálogo são ignorados, como nas rotinas prontas.
  const session = [WARMUP, ...style.moves, COOLDOWN].flatMap(({ exercise, dose, minutes }) => {
    const found = find(exercise)
    return found ? [{ ...found, dose, minutes }] : []
  })
  const minutesByCategory: Record<string, number> = {}
  for (const block of session) minutesByCategory[block.category] = (minutesByCategory[block.category] ?? 0) + block.minutes
  return { moves, session, mix: splitPercent(minutesByCategory) }
}

const styleParam = z.object({ id: z.string().regex(/^[a-z-]{1,60}$/) })

export function stylesRouter(db: Database) {
  const router = Router()

  // Só o catálogo padrão: os estilos não dependem dos exercícios de cada atleta.
  const loadCatalog = async () =>
    new Map(
      (await many<CatalogRow>(db, 'SELECT id, name, category, metric FROM exercises WHERE user_id IS NULL ORDER BY id')).map(
        (row) => [row.name, row],
      ),
    )

  // Os estilos são iguais para todo mundo e só mudam numa nova versão: o navegador pode guardar por 5 min.
  const CACHE = 'private, max-age=300'

  router.get('/', async (_req, res) => {
    const catalog = await loadCatalog()
    res.setHeader('Cache-Control', CACHE)
    res.json(
      STYLES.map((style) => {
        const { session, mix } = resolve(style, catalog)
        return {
          id: style.id,
          name: style.name,
          group: style.group,
          archetype: style.archetype,
          moveCount: style.moves.length,
          minutes: session.reduce((sum, block) => sum + block.minutes, 0),
          mix,
        }
      }),
    )
  })

  router.get('/:id', async (req, res) => {
    const { id } = parse(styleParam, req.params)
    const style = STYLES.find((s) => s.id === id)
    if (!style) throw notFound('Estilo')
    const { moves, session, mix } = resolve(style, await loadCatalog())
    res.setHeader('Cache-Control', CACHE)
    res.json({ ...style, moves, session, mix, minutes: session.reduce((sum, block) => sum + block.minutes, 0) })
  })

  return router
}
