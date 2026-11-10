// Conteúdo da aba Artigos: textos curtos de leitura, com os estudos por trás de cada ideia.
// Os números citados vêm das fontes listadas em cada artigo; ao editar, mantenha texto e fonte juntos.

export type Categoria = 'historia' | 'mentalidade' | 'condicionamento' | 'sono' | 'recuperacao'

export const CATEGORIAS: { id: Categoria; nome: string; resumo: string; cor: string }[] = [
  { id: 'historia', nome: 'História', resumo: 'De onde veio o jogo e as regras', cor: 'var(--c-condicionamento)' },
  { id: 'mentalidade', nome: 'Mentalidade', resumo: 'Como pensa quem evolui', cor: 'var(--c-finalizacao)' },
  { id: 'condicionamento', nome: 'Condicionamento', resumo: 'Corpo pronto para o jogo', cor: 'var(--c-defesa)' },
  { id: 'sono', nome: 'Sono', resumo: 'O treino que acontece à noite', cor: 'var(--c-drible)' },
  { id: 'recuperacao', nome: 'Recuperação', resumo: 'Água, descanso e carga', cor: 'var(--c-passe)' },
]

/** Um achado de pesquisa, contado em uma frase, com a referência ao lado. */
export interface Estudo {
  achado: string
  fonte: string
}

export interface Artigo {
  id: string
  categoria: Categoria
  titulo: string
  resumo: string
  secoes: { titulo: string; paragrafos: string[] }[]
  /** O que levar para o treino amanhã. */
  pratica: string[]
  /** Estudos com o resultado principal; vazio nos artigos de história. */
  ciencia: Estudo[]
  fontes: string[]
  /** Uma tela do app ligada ao assunto. */
  noApp?: { to: string; rotulo: string }
}

export const ARTIGOS: Artigo[] = [
  // História
  {
    id: 'cesto-de-pessego',
    categoria: 'historia',
    titulo: 'De um cesto de pêssego à NBA',
    resumo: 'Como um professor canadense inventou, em 1891, um jogo para o inverno que virou esporte olímpico.',
    secoes: [
      {
        titulo: 'Um jogo para dentro do ginásio',
        paragrafos: [
          'Em dezembro de 1891, James Naismith, professor canadense de educação física na escola de formação da ACM (YMCA) em Springfield, nos Estados Unidos, recebeu uma tarefa: criar uma atividade para os alunos no inverno, quando não dava para jogar ao ar livre.',
          'Ele prendeu dois cestos de pêssego na grade da galeria do ginásio, a cerca de 3,05 metros do chão, a mesma altura do aro até hoje, e escreveu 13 regras. No começo não havia drible: a bola só andava por passes.',
        ],
      },
      {
        titulo: 'O cesto ganha forma',
        paragrafos: [
          'Os cestos tinham fundo, então alguém precisava tirar a bola depois de cada ponto. Com o tempo vieram o aro de metal, a rede aberta e a tabela, que também impedia o público da galeria de desviar os arremessos.',
          'Em 1892, Senda Berenson adaptou as regras para as alunas do Smith College, e o jogo feminino começou praticamente junto com o masculino.',
        ],
      },
      {
        titulo: 'Do mundo às ligas profissionais',
        paragrafos: [
          'A Federação Internacional (FIBA) foi fundada em 1932, e o basquete masculino estreou nos Jogos Olímpicos de Berlim, em 1936, com Naismith na plateia. A final foi ao ar livre, numa quadra de terra com chuva.',
          'Nos Estados Unidos, a BAA nasceu em 1946 e, em 1949, se juntou à NBL. Da fusão saiu a NBA.',
        ],
      },
    ],
    pratica: [
      'O aro está a 3,05 m desde 1891: treinar o arremesso com a mesma mecânica sempre faz sentido.',
      'O passe veio antes do drible. Mover a bola rápido continua sendo a forma mais curta de achar um arremesso livre.',
    ],
    ciencia: [],
    fontes: [
      'Naismith Memorial Basketball Hall of Fame, história de James Naismith e das 13 regras originais.',
      'FIBA, história da federação e do basquete olímpico.',
      'NBA, história da liga (BAA, NBL e a fusão de 1949).',
    ],
  },
  {
    id: 'regras-que-mudaram',
    categoria: 'historia',
    titulo: 'As regras que mudaram o jogo',
    resumo: 'O relógio de 24 segundos, a linha de 3 e outras mudanças que deixaram o basquete mais rápido.',
    secoes: [
      {
        titulo: '19 a 18: o jogo que pediu um relógio',
        paragrafos: [
          'Em 1950, o Fort Wayne Pistons venceu o Minneapolis Lakers por 19 a 18. Quem estava na frente segurava a bola e o jogo parava.',
          'Na temporada 1954-55, a NBA adotou o relógio de arremesso de 24 segundos, ideia de Danny Biasone, dono do Syracuse Nationals. A média de pontos subiu na hora, e o jogo ganhou o ritmo que conhecemos.',
        ],
      },
      {
        titulo: 'A linha de 3',
        paragrafos: [
          'A ABA usou a linha de 3 pontos desde 1967. A NBA só a adotou na temporada 1979-80, e a FIBA em 1984.',
          'Por décadas ela foi um recurso de fim de jogo. Hoje é central: abre espaço na quadra e mudou o que se espera de alas e até de pivôs.',
        ],
      },
      {
        titulo: 'Regras contra os gigantes',
        paragrafos: [
          'A interferência no arremesso (goaltending) foi proibida no basquete universitário em 1944, quando pivôs altos como George Mikan e Bob Kurland passaram a tirar bolas que já desciam para a cesta.',
          'A enterrada chegou a ser proibida no basquete universitário entre 1967 e 1976, na época de Lew Alcindor, que depois se tornaria Kareem Abdul-Jabbar. O resultado foi o contrário do esperado: ele desenvolveu o gancho que virou sua marca.',
        ],
      },
    ],
    pratica: [
      'Treine decisões com tempo curto: 24 segundos passam rápido quando a defesa aperta.',
      'O arremesso de 3 depende de pernas. Treine-o também cansado, perto do fim do treino.',
    ],
    ciencia: [],
    fontes: [
      'NBA, história do relógio de 24 segundos e da linha de 3 pontos.',
      'Naismith Memorial Basketball Hall of Fame, perfis de George Mikan e Kareem Abdul-Jabbar.',
      'NCAA, histórico de mudanças nas regras do basquete universitário.',
    ],
  },
  {
    id: 'basquete-no-brasil',
    categoria: 'historia',
    titulo: 'O basquete no Brasil',
    resumo: 'Do Mackenzie em 1896 aos títulos mundiais, ao Pan de 1987 e à geração de Hortência e Paula.',
    secoes: [
      {
        titulo: 'A chegada',
        paragrafos: [
          'O basquete chegou ao Brasil em 1896, levado pelo professor norte-americano Augusto Shaw ao Mackenzie College, em São Paulo, apenas cinco anos depois de ser inventado.',
        ],
      },
      {
        titulo: 'Os anos de ouro',
        paragrafos: [
          'A seleção masculina ganhou o bronze olímpico em 1948, 1960 e 1964 e foi bicampeã mundial, em 1959, no Chile, e em 1963, no Rio de Janeiro, com nomes como Amaury Pasos e Wlamir Marques.',
          'Em 1987, nos Jogos Pan-Americanos de Indianápolis, o Brasil venceu os Estados Unidos na final por 120 a 115, dentro da casa deles. Oscar Schmidt fez 46 pontos. Oscar entrou para o Hall da Fama do basquete em 2013.',
        ],
      },
      {
        titulo: 'A seleção feminina',
        paragrafos: [
          'Com Hortência, Paula e Janeth, a seleção feminina foi campeã mundial em 1994, na Austrália, e prata nos Jogos Olímpicos de Atlanta, em 1996. Em 2000, em Sydney, veio o bronze.',
          'Hortência entrou para o Hall da Fama do basquete em 2005.',
        ],
      },
    ],
    pratica: [
      'Oscar ficou conhecido por arremessar centenas de vezes por dia, muito depois de o treino acabar. Volume com foco ainda funciona.',
      'Assista a jogos antigos da seleção: a leitura de jogo e o arremesso de média distância continuam atuais.',
    ],
    ciencia: [],
    fontes: [
      'Confederação Brasileira de Basketball (CBB), histórico das seleções.',
      'FIBA, resultados das Copas do Mundo masculina e feminina.',
      'Naismith Memorial Basketball Hall of Fame, perfis de Oscar Schmidt e Hortência Marcari.',
    ],
  },
  {
    id: 'dream-team',
    categoria: 'historia',
    titulo: 'O Dream Team e o basquete sem fronteiras',
    resumo: 'Em 1992 os astros da NBA foram à Olimpíada pela primeira vez. Uma geração do mundo inteiro cresceu assistindo.',
    secoes: [
      {
        titulo: 'Profissionais nos Jogos',
        paragrafos: [
          'Até 1989, jogadores da NBA não podiam disputar os Jogos Olímpicos. Naquele ano a FIBA liberou os profissionais, e em Barcelona, em 1992, os Estados Unidos levaram Michael Jordan, Magic Johnson, Larry Bird, Charles Barkley, Scottie Pippen e outros astros.',
          'O time venceu os 8 jogos por uma média de mais de 40 pontos e virou um fenômeno mundial. Adversários pediam fotos com eles antes de a bola subir.',
        ],
      },
      {
        titulo: 'A geração que veio depois',
        paragrafos: [
          'Os garotos que viram aquele time pela TV viraram a geração de Dirk Nowitzki, Pau Gasol, Manu Ginóbili e Tony Parker. Em 2004, em Atenas, a Argentina de Ginóbili eliminou os Estados Unidos na semifinal e ficou com o ouro olímpico.',
          'Hoje a NBA é global: de 2019 a 2025, todos os eleitos melhor jogador da temporada (MVP) nasceram fora dos Estados Unidos, como Giannis Antetokounmpo, Nikola Jokić, Joel Embiid e Shai Gilgeous-Alexander.',
        ],
      },
    ],
    pratica: [
      'Assista a jogos de outras escolas: a Europa valoriza muito o passe e o jogo sem bola.',
      'Jokić mostra que leitura de jogo e passe compensam falta de velocidade e de salto.',
    ],
    ciencia: [],
    fontes: [
      'FIBA, história da liberação dos jogadores profissionais (1989) e resultados olímpicos.',
      'Naismith Memorial Basketball Hall of Fame, Dream Team de 1992 (homenageado em 2010).',
      'NBA, lista de vencedores do prêmio de MVP.',
    ],
    noApp: { to: '/jogue-como', rotulo: 'Jogar como um astro' },
  },
  {
    id: 'brasileiros-na-nba',
    categoria: 'historia',
    titulo: 'Os brasileiros na NBA',
    resumo: 'De Oscar, que recusou a liga para defender a seleção, aos campeões Splitter e Leandrinho.',
    secoes: [
      {
        titulo: 'O "não" de Oscar',
        paragrafos: [
          'Em 1984, Oscar Schmidt foi escolhido no draft pelo New Jersey Nets. Naquela época, quem jogava na NBA não podia defender a seleção, e Oscar preferiu continuar jogando pelo Brasil.',
          'O primeiro brasileiro a entrar em quadra na liga foi o pivô Rolando Ferreira, pelo Portland Trail Blazers, na temporada 1988-89.',
        ],
      },
      {
        titulo: 'A geração dos anos 2000',
        paragrafos: [
          'Nenê foi a 7ª escolha do draft de 2002 e jogou mais de uma década na liga. Anderson Varejão virou ídolo no Cleveland Cavaliers, e Leandrinho foi eleito o melhor sexto homem da temporada 2006-07 pelo Phoenix Suns.',
          'Em 2014, Tiago Splitter foi campeão com o San Antonio Spurs, o primeiro brasileiro campeão da NBA. No ano seguinte, Leandrinho ganhou o título com o Golden State Warriors.',
        ],
      },
    ],
    pratica: [
      'Leandrinho fez carreira com o primeiro passo rápido: velocidade se treina com tiros curtos e mudança de ritmo.',
      'Splitter e Varejão ganharam espaço fazendo o trabalho que pouca gente quer, como corta-luz, rebote e defesa.',
    ],
    ciencia: [],
    fontes: [
      'NBA, histórico do draft e dos prêmios de temporada.',
      'Basketball-Reference, carreiras de Rolando Ferreira, Nenê, Anderson Varejão, Leandro Barbosa e Tiago Splitter.',
      'Confederação Brasileira de Basketball (CBB), histórico de Oscar Schmidt na seleção.',
    ],
  },

  // Mentalidade
  {
    id: 'mentalidade-de-crescimento',
    categoria: 'mentalidade',
    titulo: 'Mentalidade de crescimento',
    resumo: 'Errar o arremesso é informação, não sentença. Como a forma de encarar o erro muda o treino.',
    secoes: [
      {
        titulo: 'Talento fixo ou habilidade que cresce',
        paragrafos: [
          'A psicóloga Carol Dweck descreveu duas formas de encarar a própria capacidade. Na mentalidade fixa, a pessoa acha que talento é algo que se tem ou não, e cada erro parece uma prova de que não tem. Na mentalidade de crescimento, a habilidade é vista como algo que se constrói com esforço, estratégia e ajuda.',
          'No basquete isso aparece todo dia: o jogador que evita a mão fraca para não parecer ruim e o que passa a semana driblando com ela até deixar de ser fraca.',
        ],
      },
      {
        titulo: 'O que a pesquisa permite dizer',
        paragrafos: [
          'Estudos mais recentes mostram que os efeitos de intervenções de mentalidade são, em média, pequenos. Não é mágica. O valor está no comportamento que ela favorece: buscar o exercício difícil, pedir correção e continuar depois de errar.',
        ],
      },
    ],
    pratica: [
      'Troque "eu não sei driblar com a esquerda" por "eu ainda não sei driblar com a esquerda".',
      'Depois de um erro, pergunte "o que mudo no próximo?" em vez de "por que sou tão ruim?".',
      'Escolha toda semana um ponto fraco para treinar de propósito.',
    ],
    ciencia: [
      {
        achado: 'Em uma análise de muitos estudos, a relação entre mentalidade e desempenho e o efeito de intervenções foram pequenos em média, maiores em grupos com mais dificuldades.',
        fonte: 'Sisk VF et al. Psychological Science, 2018.',
      },
    ],
    fontes: ['Dweck CS. Mindset: The New Psychology of Success. Random House, 2006.', 'Sisk VF, Burgoyne AP, Sun J, Butler JL, Macnamara BN. To what extent and under which circumstances are growth mind-sets important to academic achievement? Psychological Science, 2018.'],
    noApp: { to: '/metas', rotulo: 'Criar uma meta' },
  },
  {
    id: 'treino-deliberado',
    categoria: 'mentalidade',
    titulo: 'Treino deliberado: qualidade antes de quantidade',
    resumo: 'Mil arremessos no automático valem menos que trezentos com objetivo, correção e desconforto.',
    secoes: [
      {
        titulo: 'Não é só repetir',
        paragrafos: [
          'O psicólogo Anders Ericsson chamou de prática deliberada o treino feito para melhorar um ponto específico, com meta clara, retorno imediato sobre o resultado e dificuldade logo acima do que você já domina.',
          'Arremessar parado do mesmo lugar, acertando quase tudo, é confortável. Arremessar saindo do drible, contando os acertos e anotando onde a bola erra, é prática deliberada.',
        ],
      },
      {
        titulo: 'Prática importa, mas não explica tudo',
        paragrafos: [
          'Uma grande revisão encontrou que, no esporte, a quantidade de prática deliberada explica cerca de 18% da diferença de desempenho entre atletas. É muito, mas sobra espaço para genética, idade de início, qualidade do técnico e sono. A lição é treinar bem, não só treinar muito.',
        ],
      },
    ],
    pratica: [
      'Comece cada sessão com uma meta mensurável: "7 de 10 de lance livre" em vez de "treinar arremesso".',
      'Anote os resultados. Sem número não há retorno.',
      'Quando passar a acertar quase tudo, aumente a dificuldade: mais distância, defensor, cansaço ou menos tempo.',
    ],
    ciencia: [
      {
        achado: 'No esporte, a prática deliberada explicou cerca de 18% da variação no desempenho; em jogos como xadrez, 26%, e na música, 21%.',
        fonte: 'Macnamara BN, Hambrick DZ, Oswald FL. Psychological Science, 2014.',
      },
    ],
    fontes: [
      'Ericsson KA, Krampe RT, Tesch-Römer C. The role of deliberate practice in the acquisition of expert performance. Psychological Review, 1993.',
      'Macnamara BN, Hambrick DZ, Oswald FL. Deliberate practice and performance in music, games, sports, education, and professions: a meta-analysis. Psychological Science, 2014.',
    ],
    noApp: { to: '/desempenho', rotulo: 'Ver meu desempenho' },
  },
  {
    id: 'pressao-e-rotina',
    categoria: 'mentalidade',
    titulo: 'Rotina, fala interna e pressão',
    resumo: 'O que os bons arremessadores de lance livre fazem antes de soltar a bola e o que você fala para si mesmo.',
    secoes: [
      {
        titulo: 'A rotina antes do arremesso',
        paragrafos: [
          'Quicar a bola o mesmo número de vezes, respirar e olhar o aro: a rotina pré-arremesso tira a cabeça do placar e a leva para o movimento.',
          'Um estudo com jogadores da NBA viu que eles acertavam mais lances livres quando seguiam a própria rotina de sempre do que quando fugiam dela.',
        ],
      },
      {
        titulo: 'O que você fala para si mesmo',
        paragrafos: [
          'A fala interna, ou autodiálogo, funciona. Frases de instrução ("cotovelo embaixo da bola") ajudam mais em gestos finos, como o arremesso. Frases de motivação ("vai, aguenta") ajudam mais em força e resistência.',
        ],
      },
      {
        titulo: 'Visualizar também é treinar',
        paragrafos: [
          'Imaginar o movimento com detalhes, como a sensação da bola na mão, o som da rede e o ângulo do aro, ativa parte do mesmo planejamento motor do gesto real. Não substitui a quadra, mas complementa, principalmente em dias de descanso.',
        ],
      },
    ],
    pratica: [
      'Monte uma rotina de lance livre de no máximo 5 segundos e use sempre, no treino e no jogo.',
      'Escolha uma palavra-chave técnica para o arremesso e uma motivacional para o fim do treino.',
      'Antes de dormir, visualize 5 arremessos perfeitos do seu ponto preferido.',
    ],
    ciencia: [
      {
        achado: 'Jogadores da NBA acertaram mais lances livres quando mantiveram o comportamento habitual da rotina pré-arremesso.',
        fonte: 'Lonsdale C, Tam JT. Journal of Sports Sciences, 2008.',
      },
      {
        achado: 'O autodiálogo melhorou o desempenho esportivo; frases instrucionais tiveram mais efeito em tarefas de precisão.',
        fonte: 'Hatzigeorgiadis A et al. Perspectives on Psychological Science, 2011.',
      },
    ],
    fontes: [
      "Lonsdale C, Tam JT. On the temporal and behavioural consistency of pre-performance routines: an intra-individual analysis of elite basketball players' free throw shooting accuracy. Journal of Sports Sciences, 2008.",
      'Hatzigeorgiadis A, Zourbanos N, Galanis E, Theodorakis Y. Self-talk and sports performance: a meta-analysis. Perspectives on Psychological Science, 2011.',
    ],
    noApp: { to: '/ferramentas', rotulo: 'Abrir o contador de arremessos' },
  },
  {
    id: 'metas-de-processo',
    categoria: 'mentalidade',
    titulo: 'Metas de processo, não só de resultado',
    resumo: 'Ganhar o jogo não depende só de você. Dobrar os joelhos em todo arremesso, sim.',
    secoes: [
      {
        titulo: 'Três tipos de meta',
        paragrafos: [
          'Meta de resultado é ganhar o campeonato. Meta de desempenho é acertar 75% dos lances livres. Meta de processo é o que você faz em cada jogada: cotovelo alinhado, pés firmes, olhar no aro.',
          'O resultado depende do adversário, do juiz e da sorte. O processo depende só de você, e é ele que, repetido, leva ao desempenho e ao resultado.',
        ],
      },
      {
        titulo: 'Metas que funcionam',
        paragrafos: [
          'Décadas de pesquisa sobre metas mostram que objetivos específicos e desafiadores levam a mais desempenho do que um vago "dar o meu melhor". No esporte, um estudo com golfistas viu que quem usava metas de processo ganhou mais confiança e controlou melhor a ansiedade.',
          'Na prática, use as três juntas: o resultado dá a direção, o desempenho mede o caminho e o processo é o que você controla hoje.',
        ],
      },
    ],
    pratica: [
      'Para cada meta de resultado, escreva duas metas de processo que dependem só de você.',
      'Durante o jogo, pense no processo da próxima jogada, não no placar.',
      'No fim do treino, avalie o processo: "fiz o que combinei?", e não só o número de acertos.',
    ],
    ciencia: [
      {
        achado: 'Metas específicas e difíceis levaram a melhor desempenho do que metas vagas como "dar o melhor".',
        fonte: 'Locke EA, Latham GP. American Psychologist, 2002.',
      },
      {
        achado: 'Golfistas com metas de processo melhoraram a autoconfiança e o controle da ansiedade.',
        fonte: 'Kingston KM, Hardy L. The Sport Psychologist, 1997.',
      },
    ],
    fontes: [
      'Locke EA, Latham GP. Building a practically useful theory of goal setting and task motivation: a 35-year odyssey. American Psychologist, 2002.',
      'Kingston KM, Hardy L. Effects of different types of goals on processes that support performance. The Sport Psychologist, 1997.',
    ],
    noApp: { to: '/metas', rotulo: 'Criar uma meta' },
  },
  {
    id: 'olhar-quieto',
    categoria: 'mentalidade',
    titulo: 'O olhar quieto do bom arremessador',
    resumo: 'Os melhores fixam o olhar no aro por mais tempo antes de soltar a bola. E isso se treina.',
    secoes: [
      {
        titulo: 'Onde o olho para',
        paragrafos: [
          'A pesquisadora Joan Vickers filmou o olhar de jogadores durante o lance livre. Os arremessadores mais precisos fixavam o olhar num ponto do aro por mais tempo, e de forma mais estável, antes e durante o início do movimento. Ela chamou isso de olhar quieto.',
          'Os menos precisos mexiam mais os olhos e fixavam o alvo por menos tempo, muitas vezes já com o braço subindo.',
        ],
      },
      {
        titulo: 'Dá para treinar',
        paragrafos: [
          'Num estudo seguinte, um time universitário treinou o olhar quieto junto com a rotina de lance livre e melhorou o aproveitamento nos jogos em comparação com as temporadas anteriores.',
          'O treino é simples: escolha um ponto do aro, como os ganchos da frente, chegue nele com os olhos antes de começar o movimento e não tire mais o olhar até a bola sair da mão.',
        ],
      },
    ],
    pratica: [
      'Escolha sempre o mesmo ponto do aro para mirar.',
      'Olhos no alvo antes de o braço começar a subir, e parados lá até a bola sair.',
      'Coloque o olhar quieto dentro da sua rotina de lance livre.',
    ],
    ciencia: [
      {
        achado: 'No lance livre, os arremessadores de elite tiveram uma fixação final no alvo mais longa do que os de menor precisão.',
        fonte: 'Vickers JN. Journal of Experimental Psychology: Human Perception and Performance, 1996.',
      },
      {
        achado: 'O treino do olhar quieto melhorou o aproveitamento de lances livres de jogadores universitários.',
        fonte: 'Harle SK, Vickers JN. The Sport Psychologist, 2001.',
      },
    ],
    fontes: [
      'Vickers JN. Visual control when aiming at a far target. Journal of Experimental Psychology: Human Perception and Performance, 1996.',
      'Harle SK, Vickers JN. Training quiet eye improves accuracy in the basketball free throw. The Sport Psychologist, 2001.',
    ],
    noApp: { to: '/ferramentas', rotulo: 'Abrir o contador de arremessos' },
  },

  // Condicionamento
  {
    id: 'o-que-o-jogo-exige',
    categoria: 'condicionamento',
    titulo: 'O que o basquete exige do corpo',
    resumo: 'Corrida intermitente, saltos e mudanças de direção: por que correr longe e devagar não basta.',
    secoes: [
      {
        titulo: 'Um esporte de tiros',
        paragrafos: [
          'O basquete alterna o tempo todo esforços curtos e muito intensos, como sprints, saltos, cortes e contatos, com momentos de trote e pausas curtas. O coração fica alto durante boa parte do tempo de bola viva.',
          'Por isso o condicionamento precisa treinar três coisas: aguentar o jogo inteiro, repetir esforços intensos com pouca pausa e ser explosivo em cada um deles.',
        ],
      },
      {
        titulo: 'Como treinar isso',
        paragrafos: [
          'Tiros curtos com pausas curtas, como ida e volta na quadra com 20 a 30 segundos de descanso, se parecem mais com o jogo do que uma corrida contínua de 40 minutos.',
          'A força é a base: pernas e quadril fortes saltam mais, freiam melhor e se machucam menos. Agachamento, afundo e levantamento terra com técnica e carga adequada à idade fazem parte do treino de quem joga sério.',
        ],
      },
    ],
    pratica: [
      'Duas vezes por semana, faça blocos de tiros curtos com pausa curta no lugar da corrida longa.',
      'Inclua força de pernas e de tronco duas vezes por semana, com orientação de um profissional.',
      'Treine o arremesso também depois dos tiros: no jogo você arremessa cansado.',
    ],
    ciencia: [
      {
        achado: 'Uma revisão de estudos de jogos reais mostrou um esporte intermitente, de alta intensidade, com mudanças frequentes de movimento e frequência cardíaca alta em boa parte do tempo de bola viva.',
        fonte: 'Stojanović E et al. Sports Medicine, 2018.',
      },
    ],
    fontes: [
      'Stojanović E, Stojiljković N, Scanlan AT, Dalbo VJ, Berkelmans DM, Milanović Z. The activity demands and physiological responses encountered during basketball match-play: a systematic review. Sports Medicine, 2018.',
    ],
    noApp: { to: '/treinos', rotulo: 'Ver treinos de condicionamento' },
  },
  {
    id: 'salto-vertical',
    categoria: 'condicionamento',
    titulo: 'Salto vertical: pliometria com cuidado',
    resumo: 'Saltar mais alto se treina. O segredo é poucos saltos de qualidade e aterrissar bem.',
    secoes: [
      {
        titulo: 'O que é pliometria',
        paragrafos: [
          'São exercícios em que o músculo alonga e logo em seguida contrai com força, como saltar de uma caixa baixa e subir de novo assim que toca o chão. Eles ensinam o corpo a usar a energia elástica e a produzir força rápido.',
        ],
      },
      {
        titulo: 'Menos é mais',
        paragrafos: [
          'Cada salto deve ser máximo e com descanso suficiente. Se a altura cai ou a aterrissagem fica barulhenta e com o joelho caindo para dentro, a série acabou.',
          'Quem está começando conta os contatos com o chão por sessão e começa com cerca de 80 a 100, como sugerem os guias de preparação física para iniciantes, sempre em superfície que amorteça, como quadra ou grama, nunca no concreto.',
        ],
      },
      {
        titulo: 'Aterrissar é metade do exercício',
        paragrafos: [
          'Caia com os dois pés, joelhos alinhados com a ponta dos pés, quadril para trás e sem barulho. Aprender a frear protege o joelho e o tornozelo no jogo.',
        ],
      },
    ],
    pratica: [
      'Faça pliometria no começo do treino, descansado, depois do aquecimento.',
      'Duas sessões por semana bastam; deixe 48 horas entre elas.',
      'Se sentir dor no tendão abaixo da patela, pare e procure um profissional.',
    ],
    ciencia: [
      {
        achado: 'Uma meta-análise concluiu que o treino pliométrico melhora de forma consistente a altura do salto vertical.',
        fonte: 'Markovic G. British Journal of Sports Medicine, 2007.',
      },
    ],
    fontes: ['Markovic G. Does plyometric training improve vertical jump height? A meta-analytical review. British Journal of Sports Medicine, 2007.'],
    noApp: { to: '/ferramentas', rotulo: 'Registrar um teste físico' },
  },
  {
    id: 'prevencao-de-lesoes',
    categoria: 'condicionamento',
    titulo: 'Tornozelos e joelhos: prevenção de lesões',
    resumo: 'A entorse de tornozelo é a lesão mais comum do basquete. Equilíbrio e aquecimento certo ajudam a evitá-la.',
    secoes: [
      {
        titulo: 'Onde o basquete machuca',
        paragrafos: [
          'Saltos, aterrissagens no pé de outro jogador e mudanças bruscas de direção fazem da entorse de tornozelo a lesão mais comum do basquete. Joelho, principalmente na aterrissagem e nos cortes, vem logo em seguida.',
          'Quem já torceu o tornozelo tem mais chance de torcer de novo, então a prevenção vale em dobro depois da primeira lesão.',
        ],
      },
      {
        titulo: 'Equilíbrio se treina',
        paragrafos: [
          'Ficar num pé só, de olhos fechados, sobre uma superfície instável ou pegando uma bola, treina os receptores do tornozelo a reagir rápido. Um programa simples de equilíbrio reduziu as entorses em atletas de basquete e futebol do ensino médio.',
          'Aquecimentos neuromusculares, com corrida, saltos com aterrissagem controlada, força e equilíbrio, também reduzem lesões quando feitos com regularidade.',
        ],
      },
    ],
    pratica: [
      'Inclua 5 minutos de equilíbrio unipodal no aquecimento, 3 vezes por semana.',
      'Aqueça com saltos e mudanças de direção progressivos antes de arremessar de longe.',
      'Teve entorse? Volte com orientação de um fisioterapeuta, não só quando a dor passar.',
    ],
    ciencia: [
      {
        achado: 'Um programa de treino de equilíbrio reduziu a taxa de entorses de tornozelo em atletas de basquete e futebol do ensino médio.',
        fonte: 'McGuine TA, Keene JS. American Journal of Sports Medicine, 2006.',
      },
    ],
    fontes: ['McGuine TA, Keene JS. The effect of a balance training program on the risk of ankle sprains in high school athletes. American Journal of Sports Medicine, 2006.'],
    noApp: { to: '/treinos', rotulo: 'Ver o aquecimento' },
  },
  {
    id: 'forca-para-jovens',
    categoria: 'condicionamento',
    titulo: 'Musculação atrapalha o crescimento?',
    resumo: 'Não. Com orientação e carga certa, o treino de força é seguro para jovens e ajuda a saltar mais e se machucar menos.',
    secoes: [
      {
        titulo: 'Um mito antigo',
        paragrafos: [
          'Muita gente ainda acha que levantar peso na adolescência faz parar de crescer ou machuca a cartilagem de crescimento. A associação americana de força e condicionamento (NSCA) revisou os estudos e concluiu o contrário: com supervisão qualificada e progressão adequada, o treino de força é seguro e eficaz para crianças e adolescentes.',
          'Os acidentes que aparecem nos estudos vêm quase sempre de treino sem supervisão, carga exagerada ou equipamento usado do jeito errado.',
        ],
      },
      {
        titulo: 'O que o basquete ganha',
        paragrafos: [
          'Força nas pernas e no quadril melhora o salto, o primeiro passo e a freada nas mudanças de direção. Força no tronco ajuda a aguentar o contato no garrafão e a terminar a bandeja com o corpo estável.',
          'O começo é a técnica: agachamento, afundo, flexão e prancha com o peso do corpo, até o movimento sair limpo. Só depois a carga sobe, aos poucos.',
        ],
      },
    ],
    pratica: [
      'Comece com o peso do corpo e só aumente a carga quando a técnica estiver perfeita.',
      'Duas ou três sessões por semana, em dias que não sejam colados ao jogo.',
      'Treine com um profissional de educação física, principalmente antes dos 18 anos.',
    ],
    ciencia: [
      {
        achado: 'Com supervisão qualificada e programa adequado, o treino de força é seguro e eficaz para jovens e pode reduzir lesões no esporte.',
        fonte: 'Faigenbaum AD et al. Journal of Strength and Conditioning Research, 2009.',
      },
    ],
    fontes: ['Faigenbaum AD, Kraemer WJ, Blimkie CJ et al. Youth resistance training: updated position statement paper from the National Strength and Conditioning Association. Journal of Strength and Conditioning Research, 2009.'],
    noApp: { to: '/treinos', rotulo: 'Ver treinos de condicionamento' },
  },
  {
    id: 'alongamento-antes-do-jogo',
    categoria: 'condicionamento',
    titulo: 'Alongar antes do jogo tira a explosão?',
    resumo: 'Alongamento parado longo pode tirar um pouco de força. Curto, ele não atrapalha, e o aquecimento dinâmico é o melhor.',
    secoes: [
      {
        titulo: 'Depende do tempo',
        paragrafos: [
          'Uma revisão reuniu os estudos sobre alongamento estático antes do exercício. Segurar a posição por menos de 30 segundos quase não mudou a força. A partir de 60 segundos por músculo, a força e a potência caíram de forma mais clara, ainda que pouco.',
          'Para quem precisa saltar e arrancar, segurar o alongamento por muito tempo logo antes do jogo é o pior momento para isso.',
        ],
      },
      {
        titulo: 'O aquecimento que funciona',
        paragrafos: [
          'O aquecimento dinâmico, com polichinelo, corrida com elevação de joelho, afundo andando, balanço de perna e saltos progressivos, aquece o músculo e treina o movimento do jogo. Nos estudos, ele mantém ou melhora o desempenho.',
          'O alongamento parado continua útil para ganhar flexibilidade, só que em outro momento: depois do treino ou num dia separado.',
        ],
      },
    ],
    pratica: [
      'Antes do jogo, aquecimento dinâmico de 10 a 15 minutos.',
      'Se quiser alongar parado no aquecimento, no máximo 30 segundos por músculo.',
      'Alongamentos longos, para ganhar flexibilidade, ficam para depois do treino.',
    ],
    ciencia: [
      {
        achado: 'Alongamentos estáticos de menos de 30 segundos tiveram efeito pequeno ou nenhum; a partir de 60 segundos, a queda de força ficou mais clara.',
        fonte: 'Kay AD, Blazevich AJ. Medicine & Science in Sports & Exercise, 2012.',
      },
      {
        achado: 'O alongamento dinâmico antes do exercício não prejudicou e, em vários estudos, melhorou o desempenho.',
        fonte: 'Behm DG, Chaouachi A. European Journal of Applied Physiology, 2011.',
      },
    ],
    fontes: [
      'Kay AD, Blazevich AJ. Effect of acute static stretch on maximal muscle performance: a systematic review. Medicine & Science in Sports & Exercise, 2012.',
      'Behm DG, Chaouachi A. A review of the acute effects of static and dynamic stretching on performance. European Journal of Applied Physiology, 2011.',
    ],
    noApp: { to: '/treinos', rotulo: 'Ver o aquecimento' },
  },

  // Sono
  {
    id: 'sono-e-arremesso',
    categoria: 'sono',
    titulo: 'Dormir mais acerta mais arremessos',
    resumo: 'No estudo de Stanford, dormir mais melhorou o sprint e o aproveitamento nos lances livres e nas bolas de 3.',
    secoes: [
      {
        titulo: 'O estudo de Stanford',
        paragrafos: [
          'Pesquisadores da Universidade de Stanford acompanharam 11 jogadores do time masculino de basquete. Depois de algumas semanas com o sono de sempre, os atletas passaram de 5 a 7 semanas tentando ficar 10 horas por noite na cama.',
          'O sprint em vaivém de cerca de 86 metros caiu de 16,2 para 15,5 segundos. Os lances livres melhoraram 9%, e os arremessos de 3, 9,2%. Os jogadores também relataram se sentir melhor física e mentalmente nos treinos e jogos.',
        ],
      },
      {
        titulo: 'Por que funciona',
        paragrafos: [
          'É durante o sono que o corpo libera boa parte do hormônio do crescimento, repara o músculo e o cérebro consolida o que foi aprendido no treino. Um gesto técnico repetido de dia fica mais firme depois de uma boa noite.',
          'O estudo foi pequeno e sem grupo de comparação, então os números não são uma promessa. Mas a direção bate com o que se sabe sobre sono e desempenho.',
        ],
      },
    ],
    pratica: [
      'Em semana de jogo importante, tente ganhar de 30 a 60 minutos de sono por noite.',
      'Durma e acorde no mesmo horário, inclusive no fim de semana.',
      'Treinou um gesto novo? Uma boa noite de sono ajuda a fixá-lo.',
    ],
    ciencia: [
      {
        achado: 'Com cerca de 10 horas na cama por noite, o sprint caiu de 16,2 para 15,5 segundos, os lances livres melhoraram 9% e as bolas de 3, 9,2%.',
        fonte: 'Mah CD, Mah KE, Kezirian EJ, Dement WC. Sleep, 2011.',
      },
    ],
    fontes: ['Mah CD, Mah KE, Kezirian EJ, Dement WC. The effects of sleep extension on the athletic performance of collegiate basketball players. Sleep, 2011.'],
    noApp: { to: '/rotina', rotulo: 'Organizar minha rotina' },
  },
  {
    id: 'sono-e-lesoes',
    categoria: 'sono',
    titulo: 'Quanto dormir e o risco de lesão',
    resumo: 'Adolescentes que dormem menos de 8 horas se machucam mais. Veja quanto sono cada idade precisa.',
    secoes: [
      {
        titulo: 'Quanto dormir',
        paragrafos: [
          'A Academia Americana de Medicina do Sono recomenda de 8 a 10 horas por noite para adolescentes de 13 a 18 anos, e pelo menos 7 horas para adultos. Atletas em fase de muito treino costumam precisar do limite de cima.',
        ],
      },
      {
        titulo: 'Sono curto, mais lesões',
        paragrafos: [
          'Um estudo com atletas do ensino fundamental e médio encontrou que quem dormia menos de 8 horas por noite teve 1,7 vez mais chance de se lesionar do que quem dormia 8 horas ou mais.',
          'Cansado, o tempo de reação piora, a coordenação falha e a aterrissagem fica descuidada. É exatamente o cenário das entorses e das lesões de joelho.',
        ],
      },
    ],
    pratica: [
      'Conte para trás: se acorda às 6h30 e tem 15 anos, precisa estar dormindo entre 20h30 e 22h30.',
      'Em semanas de prova ou de muito treino, o sono é a primeira coisa a proteger, não a última.',
    ],
    ciencia: [
      {
        achado: 'Atletas adolescentes que dormiam menos de 8 horas tiveram 1,7 vez mais risco de lesão.',
        fonte: 'Milewski MD et al. Journal of Pediatric Orthopaedics, 2014.',
      },
      {
        achado: 'Recomendação de 8 a 10 horas de sono por noite para adolescentes de 13 a 18 anos.',
        fonte: 'Paruthi S et al. Journal of Clinical Sleep Medicine, 2016.',
      },
    ],
    fontes: [
      'Milewski MD, Skaggs DL, Bishop GA et al. Chronic lack of sleep is associated with increased sports injuries in adolescent athletes. Journal of Pediatric Orthopaedics, 2014.',
      'Paruthi S et al. Recommended amount of sleep for pediatric populations: a consensus statement of the American Academy of Sleep Medicine. Journal of Clinical Sleep Medicine, 2016.',
      'Watson NF et al. Recommended amount of sleep for a healthy adult. Sleep, 2015.',
    ],
  },
  {
    id: 'higiene-do-sono',
    categoria: 'sono',
    titulo: 'Higiene do sono para quem treina à noite',
    resumo: 'Cafeína, telas e jogo tarde atrapalham o sono. Pequenos ajustes que ajudam a apagar mais rápido.',
    secoes: [
      {
        titulo: 'Cafeína dura mais do que parece',
        paragrafos: [
          'Num estudo, uma dose alta de cafeína tomada 6 horas antes de deitar ainda reduziu o sono em mais de 1 hora. Isso vale para café, energético, refrigerante de cola e pré-treino.',
        ],
      },
      {
        titulo: 'Depois do treino noturno',
        paragrafos: [
          'Treino ou jogo à noite deixa o corpo aquecido e a cabeça acelerada. Um banho morno, luz baixa e uma refeição leve ajudam a desacelerar.',
          'O quarto ideal é escuro, silencioso e fresco. A tela do celular na cama mantém o cérebro ligado: deixe-o longe nos últimos 30 minutos.',
        ],
      },
      {
        titulo: 'Cochilo',
        paragrafos: [
          'Dormiu mal? Um cochilo de 20 a 30 minutos no começo da tarde recupera parte do estado de alerta sem atrapalhar a noite seguinte.',
        ],
      },
    ],
    pratica: [
      'Sem cafeína nas 6 horas antes de dormir.',
      'Celular fora do alcance 30 minutos antes de deitar.',
      'Quarto escuro e fresco; se precisar, use máscara de dormir.',
      'Cochilo, se precisar, de até 30 minutos e antes das 16h.',
    ],
    ciencia: [
      {
        achado: 'Uma dose de 400 mg de cafeína tomada 6 horas antes de deitar reduziu o sono total em mais de 1 hora.',
        fonte: 'Drake C et al. Journal of Clinical Sleep Medicine, 2013.',
      },
    ],
    fontes: ['Drake C, Roehrs T, Shambroom J, Roth T. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. Journal of Clinical Sleep Medicine, 2013.'],
    noApp: { to: '/configuracoes', rotulo: 'Ajustar os lembretes' },
  },
  {
    id: 'sono-e-aprendizado',
    categoria: 'sono',
    titulo: 'O gesto novo se firma dormindo',
    resumo: 'Treinou um drible ou ajustou o arremesso? Parte do aprendizado acontece na noite seguinte.',
    secoes: [
      {
        titulo: 'Melhorar sem treinar',
        paragrafos: [
          'Num estudo de Harvard, as pessoas aprenderam uma sequência de movimentos com os dedos. Quem dormiu uma noite depois do treino ficou cerca de 20% mais rápido no dia seguinte, sem praticar de novo. Quem passou o mesmo tempo acordado não melhorou.',
          'O ganho acompanhou o sono leve das últimas horas da noite. Ou seja: quem acorda cedo demais corta justamente a parte que fixa o que foi treinado.',
        ],
      },
      {
        titulo: 'No basquete',
        paragrafos: [
          'Drible, passe e arremesso são sequências de movimento. O cérebro organiza essas sequências enquanto você dorme, e o gesto que saía travado no fim do treino costuma sair mais solto depois de uma boa noite.',
          'Isso vale principalmente quando você está mudando a mecânica do arremesso ou aprendendo um movimento novo.',
        ],
      },
    ],
    pratica: [
      'Deixe o movimento novo para o treino da tarde ou da noite e durma bem em seguida.',
      'Não corte o fim da noite: acordar 1 hora mais cedo tira justamente o sono que fixa o gesto.',
      'No dia seguinte, repita o movimento novo logo no começo do treino.',
    ],
    ciencia: [
      {
        achado: 'Depois de uma noite de sono, a velocidade numa tarefa motora melhorou cerca de 20% sem nova prática; o mesmo tempo acordado não trouxe ganho.',
        fonte: 'Walker MP et al. Neuron, 2002.',
      },
    ],
    fontes: ['Walker MP, Brakefield T, Morgan A, Hobson JA, Stickgold R. Practice with sleep makes perfect: sleep-dependent motor skill learning. Neuron, 2002.'],
    noApp: { to: '/treinos', rotulo: 'Escolher um movimento novo' },
  },
  {
    id: 'noite-mal-dormida',
    categoria: 'sono',
    titulo: 'O que uma noite mal dormida faz no jogo',
    resumo: 'A força quase não muda. Atenção, tempo de reação, humor e fôlego para esforços longos, sim.',
    secoes: [
      {
        titulo: 'Onde o cansaço aparece',
        paragrafos: [
          'Uma revisão sobre sono e desempenho esportivo concluiu que uma noite ruim mexe pouco com a força máxima e com um salto isolado. O que mais piora são os esforços longos, a atenção, o tempo de reação e o humor.',
          'No basquete isso é decisivo: ler o jogo, reagir ao corte do adversário e manter a intensidade no quarto período dependem justamente do que o sono curto atrapalha.',
        ],
      },
      {
        titulo: 'Uma noite não é o fim do mundo',
        paragrafos: [
          'Dormir mal na véspera por ansiedade é comum e, sozinho, não decide o jogo. O que pesa é a dívida acumulada: várias noites curtas seguidas.',
          'Se a noite foi ruim, um cochilo curto à tarde e um aquecimento caprichado ajudam. A semana inteira bem dormida antes do jogo vale mais do que a última noite.',
        ],
      },
    ],
    pratica: [
      'Proteja o sono a semana toda, não só na véspera.',
      'Dormiu mal? Cochilo de até 30 minutos e aquecimento mais longo.',
      'Evite decidir carga de treino pesada depois de várias noites curtas.',
    ],
    ciencia: [
      {
        achado: 'A perda de sono afetou mais o exercício prolongado, a função cognitiva e o humor do que a força máxima.',
        fonte: 'Fullagar HH et al. Sports Medicine, 2015.',
      },
    ],
    fontes: ['Fullagar HH, Skorski S, Duffield R, Hammes D, Coutts AJ, Meyer T. Sleep and athletic performance: the effects of sleep loss on exercise performance, and physiological and cognitive responses to exercise. Sports Medicine, 2015.'],
    noApp: { to: '/rotina', rotulo: 'Organizar minha rotina' },
  },

  // Recuperação
  {
    id: 'hidratacao',
    categoria: 'recuperacao',
    titulo: 'Hidratação: o arremesso também desidrata',
    resumo: 'Perder 2% do peso em suor já derruba o aproveitamento. Como saber quanto beber.',
    secoes: [
      {
        titulo: 'O efeito em quadra',
        paragrafos: [
          'Num estudo com jogadores de basquete, o desempenho em arremessos e deslocamentos foi caindo à medida que a desidratação aumentava, com piora clara por volta de 2% do peso corporal. Para um atleta de 70 kg, isso é só 1,4 kg de suor.',
        ],
      },
      {
        titulo: 'A balança diz quanto você perde',
        paragrafos: [
          'Pese-se antes e depois de um treino, sem roupa molhada. Cada quilo perdido é perto de 1 litro de suor. Para repor, beba de uma vez e meia esse volume nas horas seguintes.',
          'A cor da urina também ajuda: clara, cor de palha, é bom sinal. Escura indica que falta água.',
        ],
      },
    ],
    pratica: [
      'Beba água ao longo do dia, não só no treino.',
      'Leve garrafa para a quadra e beba nos intervalos, aos goles.',
      'Treinos longos e muito quentes pedem também sal: uma bebida esportiva ou um lanche salgado depois.',
    ],
    ciencia: [
      {
        achado: 'A desidratação progressiva, de 1% a 4% do peso corporal, piorou de forma progressiva as habilidades de jogadores de basquete.',
        fonte: 'Baker LB, Dougherty KA, Chow M, Kenney WL. Medicine & Science in Sports & Exercise, 2007.',
      },
      {
        achado: 'O Colégio Americano de Medicina do Esporte recomenda evitar perdas acima de 2% do peso corporal durante o exercício.',
        fonte: 'Sawka MN et al. Medicine & Science in Sports & Exercise, 2007.',
      },
    ],
    fontes: [
      'Baker LB, Dougherty KA, Chow M, Kenney WL. Progressive dehydration causes a progressive decline in basketball skill performance. Medicine & Science in Sports & Exercise, 2007.',
      'Sawka MN et al. American College of Sports Medicine position stand: exercise and fluid replacement. Medicine & Science in Sports & Exercise, 2007.',
    ],
    noApp: { to: '/alimentacao?aba=jogo', rotulo: 'Ver o dia de jogo na Alimentação' },
  },
  {
    id: 'carga-de-treino',
    categoria: 'recuperacao',
    titulo: 'Descanso também é treino',
    resumo: 'O corpo melhora no intervalo entre os treinos. Como medir a carga com uma nota de esforço.',
    secoes: [
      {
        titulo: 'Treino cansa, o descanso fortalece',
        paragrafos: [
          'O treino é o estímulo; a adaptação acontece depois, enquanto o corpo se recupera. Sem descanso suficiente, o cansaço se acumula, o rendimento cai e o risco de lesão sobe.',
          'Sinais de alerta: sono ruim, irritação, perna pesada por vários dias e desempenho caindo mesmo treinando mais.',
        ],
      },
      {
        titulo: 'Uma nota de esforço por treino',
        paragrafos: [
          'Um jeito simples de medir a carga, usado em times profissionais, é dar uma nota de 0 a 10 para o esforço do treino logo depois de terminar e multiplicar pela duração em minutos. Uma hora com nota 7 dá 420 unidades.',
          'Somando a semana, você vê se a carga está subindo devagar ou dando saltos. Aumentos bruscos de uma semana para a outra são os que mais pedem cuidado.',
        ],
      },
    ],
    pratica: [
      'Tenha pelo menos 1 dia sem treino intenso por semana.',
      'A cada 3 ou 4 semanas puxadas, faça uma semana mais leve.',
      'Anote nota de esforço e duração de cada treino e acompanhe a soma da semana.',
    ],
    ciencia: [
      {
        achado: 'Multiplicar a nota de esforço percebido (0 a 10) pela duração do treino é uma forma válida e simples de medir a carga.',
        fonte: 'Foster C et al. Journal of Strength and Conditioning Research, 2001.',
      },
    ],
    fontes: ['Foster C, Florhaug JA, Franklin J et al. A new approach to monitoring exercise training. Journal of Strength and Conditioning Research, 2001.'],
    noApp: { to: '/desempenho', rotulo: 'Ver meu desempenho' },
  },
  {
    id: 'proteina',
    categoria: 'recuperacao',
    titulo: 'Proteína: quanto e quando',
    resumo: 'O músculo se reconstrói com proteína. Dividir ao longo do dia funciona melhor do que concentrar numa refeição.',
    secoes: [
      {
        titulo: 'Quanto por dia',
        paragrafos: [
          'Para quem treina força e salto, as diretrizes esportivas falam em 1,4 a 2,0 g de proteína por quilo de peso por dia. Uma meta-análise viu que o ganho de força e de massa muscular para de crescer por volta de 1,6 g por quilo: comer muito mais que isso não traz vantagem.',
          'Para um atleta de 70 kg, 1,6 g por quilo dá cerca de 110 g de proteína por dia, o que se alcança com comida normal: carne, frango, peixe, ovos, leite, iogurte e feijão.',
        ],
      },
      {
        titulo: 'Quando',
        paragrafos: [
          'Distribuir de 20 a 40 g de proteína em cada refeição, a cada 3 ou 4 horas, aproveita melhor o estímulo do treino do que comer quase tudo no jantar.',
          'Depois do treino, uma refeição com proteína e carboidrato repõe a energia e começa a recuperação. Não precisa ser shake: um sanduíche com frango e um copo de leite resolvem.',
        ],
      },
    ],
    pratica: [
      'Coloque uma fonte de proteína em todas as refeições, inclusive no café da manhã.',
      'Depois do treino, coma em até 1 ou 2 horas, com proteína e carboidrato.',
      'Suplemento é opcional. Se for usar, converse com um nutricionista antes.',
    ],
    ciencia: [
      {
        achado: 'Somada ao treino de força, a proteína aumentou o ganho de força e de massa muscular, com o benefício estabilizando por volta de 1,6 g por quilo por dia.',
        fonte: 'Morton RW et al. British Journal of Sports Medicine, 2018.',
      },
      {
        achado: 'A Sociedade Internacional de Nutrição Esportiva recomenda de 1,4 a 2,0 g por quilo por dia, em doses de 20 a 40 g a cada 3 ou 4 horas.',
        fonte: 'Jäger R et al. Journal of the International Society of Sports Nutrition, 2017.',
      },
    ],
    fontes: [
      'Morton RW, Murphy KT, McKellar SR et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. British Journal of Sports Medicine, 2018.',
      'Jäger R, Kerksick CM, Campbell BI et al. International Society of Sports Nutrition position stand: protein and exercise. Journal of the International Society of Sports Nutrition, 2017.',
    ],
    noApp: { to: '/alimentacao', rotulo: 'Ver os cardápios da Alimentação' },
  },
  {
    id: 'banho-frio',
    categoria: 'recuperacao',
    titulo: 'Banho frio e gelo: quando vale a pena',
    resumo: 'A água gelada alivia a dor muscular, mas usada sempre depois da musculação pode frear o ganho de força.',
    secoes: [
      {
        titulo: 'O que o frio faz',
        paragrafos: [
          'Ficar de 10 a 15 minutos em água fria, entre 10 °C e 15 °C, diminui a dor muscular nos dias seguintes a um esforço forte. Uma meta-análise encontrou menos dor de 24 a 96 horas depois, em comparação com só descansar.',
        ],
      },
      {
        titulo: 'O lado ruim',
        paragrafos: [
          'A inflamação depois do treino também é um sinal para o músculo se adaptar. Num estudo de 12 semanas, quem entrava na água fria depois de cada treino de força ganhou menos massa muscular e menos força do que quem fazia uma recuperação ativa.',
          'Por isso o frio funciona melhor como ferramenta de ocasião: torneio com jogos seguidos, jogo no dia seguinte, semana pesada. No dia a dia da musculação, deixe o músculo se recuperar sozinho.',
        ],
      },
    ],
    pratica: [
      'Use água fria em torneios e jogos em dias seguidos, quando o que importa é estar inteiro amanhã.',
      'Evite o banho gelado logo depois do treino de força, na fase em que o objetivo é ficar mais forte.',
      'Gelo direto na pele, no máximo 15 a 20 minutos, sempre com um pano no meio.',
    ],
    ciencia: [
      {
        achado: 'A imersão em água fria reduziu a dor muscular de 24 a 96 horas depois do esforço, em comparação com a recuperação passiva.',
        fonte: 'Leeder J et al. British Journal of Sports Medicine, 2012.',
      },
      {
        achado: 'Usada depois de cada treino de força por 12 semanas, a água fria reduziu o ganho de massa muscular e de força.',
        fonte: 'Roberts LA et al. Journal of Physiology, 2015.',
      },
    ],
    fontes: [
      'Leeder J, Gissane C, van Someren K, Gregson W, Howatson G. Cold water immersion and recovery from strenuous exercise: a meta-analysis. British Journal of Sports Medicine, 2012.',
      'Roberts LA, Raastad T, Markworth JF et al. Post-exercise cold water immersion attenuates acute anabolic signalling and long-term adaptations in muscle to strength training. Journal of Physiology, 2015.',
    ],
  },
  {
    id: 'rolo-de-liberacao',
    categoria: 'recuperacao',
    titulo: 'Rolo de liberação: o que esperar',
    resumo: 'O rolo de espuma ajuda um pouco na flexibilidade e na dor, sem milagre. Como usar sem perder tempo.',
    secoes: [
      {
        titulo: 'Efeitos pequenos, mas reais',
        paragrafos: [
          'Uma meta-análise juntou os estudos sobre o rolo de liberação. Antes do treino, ele deu uma melhora pequena na flexibilidade e no sprint. Depois, diminuiu um pouco a dor muscular dos dias seguintes. Na força e no salto, praticamente não mudou nada.',
          'Ou seja: é um complemento barato e sem risco, que não substitui sono, comida e descanso.',
        ],
      },
      {
        titulo: 'Como usar',
        paragrafos: [
          'Passe o rolo de 30 a 60 segundos em cada grupo muscular, devagar, parando um pouco nos pontos mais sensíveis. Panturrilha, coxa, glúteo e a lateral da coxa são os mais pedidos no basquete.',
          'Antes do treino, use pouco tempo e emende no aquecimento dinâmico. Depois, pode ficar um pouco mais, com a respiração calma.',
        ],
      },
    ],
    pratica: [
      'De 30 a 60 segundos por músculo bastam.',
      'Dor forte não é sinal de que está funcionando: a pressão deve ser incômoda, não insuportável.',
      'Não role direto sobre articulações nem sobre a coluna lombar.',
    ],
    ciencia: [
      {
        achado: 'O rolo antes do exercício melhorou um pouco o sprint e a flexibilidade; depois do exercício, reduziu um pouco a dor percebida.',
        fonte: 'Wiewelhove T et al. Frontiers in Physiology, 2019.',
      },
    ],
    fontes: ['Wiewelhove T, Döweling A, Schneider C et al. A meta-analysis of the effects of foam rolling on performance and recovery. Frontiers in Physiology, 2019.'],
  },
]

/** Minutos de leitura, a 200 palavras por minuto. */
export function minutosDeLeitura(a: Artigo): number {
  const texto = [a.resumo, ...a.secoes.flatMap((s) => s.paragrafos), ...a.pratica, ...a.ciencia.map((c) => c.achado)].join(' ')
  return Math.max(1, Math.round(texto.split(/\s+/).length / 200))
}

export const categoria = (id: Categoria) => CATEGORIAS.find((c) => c.id === id)!
