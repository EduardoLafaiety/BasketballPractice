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

  router.get('/', async (_req, res) => {
    const catalog = await loadCatalog()
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
    res.json({ ...style, moves, session, mix, minutes: session.reduce((sum, block) => sum + block.minutes, 0) })
  })

  return router
}
