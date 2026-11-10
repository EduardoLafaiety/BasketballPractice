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
]

/** Minutos de leitura, a 200 palavras por minuto. */
export function minutosDeLeitura(a: Artigo): number {
  const texto = [a.resumo, ...a.secoes.flatMap((s) => s.paragrafos), ...a.pratica, ...a.ciencia.map((c) => c.achado)].join(' ')
  return Math.max(1, Math.round(texto.split(/\s+/).length / 200))
}

export const categoria = (id: Categoria) => CATEGORIAS.find((c) => c.id === id)!
