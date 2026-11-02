// Conteúdo da aba Alimentação: sugestões gerais, com o peso do alimento pronto para comer.
// Não é uma dieta: a página avisa que alergias, doenças e metas de peso pedem um nutricionista.

export type PosicaoDieta = 'armador' | 'ala' | 'pivo'
export type Refeicao = 'cafe' | 'almoco' | 'lanche' | 'janta'

/** Um alimento com a quantidade sugerida (ex.: Arroz, 150 g). */
export type Item = { nome: string; qtd?: string }

const i = (nome: string, qtd?: string): Item => ({ nome, qtd })

export interface CardapioPosicao {
  id: PosicaoDieta
  nome: string
  numeros: string
  titulo: string
  subtitulo: string
  resumo: string
  foco: string[]
  /** Quanto vai no prato por refeição principal; no descanso, o carboidrato diminui. */
  porcoes: { rotulo: string; valor: string; descanso?: string }[]
  refeicoes: Record<Refeicao, { opcoes: Item[][]; porque: string }>
  /** Só o pivô tem: algo leve antes de dormir. */
  ceia?: Item[]
}

export const REFEICOES: { id: Refeicao; nome: string; hora: string }[] = [
  { id: 'cafe', nome: 'Café da manhã', hora: '7h' },
  { id: 'almoco', nome: 'Almoço', hora: '12h' },
  { id: 'lanche', nome: 'Café da tarde', hora: '16h' },
  { id: 'janta', nome: 'Janta', hora: '20h' },
]

export const POSICOES: CardapioPosicao[] = [
  {
    id: 'armador',
    nome: 'Armador',
    numeros: '1·2',
    titulo: 'Leve e rápido',
    subtitulo: 'Energia para tiros curtos o jogo inteiro',
    resumo:
      'Você corre mais que todo mundo: tiros curtos, troca de ritmo e defesa em cima da bola. O foco é ter energia o jogo inteiro sem pesar.',
    foco: ['Carboidrato distribuído', 'Peso estável', 'Hidratação'],
    porcoes: [
      { rotulo: 'Proteína', valor: '100–120 g' },
      { rotulo: 'Carboidrato', valor: '120–180 g', descanso: '80–120 g' },
      { rotulo: 'Legumes', valor: '100 g' },
    ],
    refeicoes: {
      cafe: {
        opcoes: [
          [i('Pão integral', '2 fatias · 50 g'), i('Ovo mexido', '2 ovos · 100 g'), i('Banana', '100 g'), i('Café com leite', '200 ml')],
          [i('Tapioca', '60 g de goma'), i('Queijo branco', '30 g'), i('Mamão', '150 g')],
        ],
        porque: 'Carboidrato de manhã já abastece o treino do dia.',
      },
      almoco: {
        opcoes: [
          [i('Arroz', '150 g'), i('Feijão', '100 g'), i('Frango grelhado', '120 g'), i('Salada', 'à vontade')],
          [i('Macarrão', '180 g'), i('Carne moída magra', '120 g'), i('Legumes', '100 g')],
        ],
        porque: 'Prato completo, porção moderada: energia sem perder agilidade.',
      },
      lanche: {
        opcoes: [
          [i('Iogurte natural', '170 g'), i('Aveia', '30 g'), i('Banana', '100 g')],
          [i('Fruta', '150 g'), i('Castanhas', '20 g')],
        ],
        porque: 'Lanche leve segura a fome sem pesar no treino.',
      },
      janta: {
        opcoes: [
          [i('Peixe', '120 g'), i('Batata-doce', '150 g'), i('Salada', 'à vontade')],
          [i('Omelete', '2 ovos · 100 g'), i('Legumes', '100 g'), i('Arroz', '80 g')],
        ],
        porque: 'Proteína para recuperar; carboidrato menor se não treinou.',
      },
    },
  },
  {
    id: 'ala',
    nome: 'Ala',
    numeros: '3·4',
    titulo: 'Explosão com velocidade',
    subtitulo: 'Salto, mudança de direção e ida e volta',
    resumo:
      'Você precisa de explosão para atacar a cesta e velocidade para voltar na defesa. O foco é proteína em toda refeição e carboidrato perto do treino.',
    foco: ['Proteína em toda refeição', 'Carboidrato no treino', 'Ferro'],
    porcoes: [
      { rotulo: 'Proteína', valor: '120–150 g' },
      { rotulo: 'Carboidrato', valor: '150–200 g', descanso: '100–150 g' },
      { rotulo: 'Legumes', valor: '100 g' },
    ],
    refeicoes: {
      cafe: {
        opcoes: [
          [i('Ovos', '3 ovos · 150 g'), i('Pão integral', '2 fatias · 50 g'), i('Fruta', '150 g'), i('Leite', '200 ml')],
          [i('Cuscuz', '150 g'), i('Ovo', '2 ovos · 100 g'), i('Queijo branco', '30 g'), i('Café com leite', '200 ml')],
        ],
        porque: 'Ovo de manhã dá proteína cedo para o músculo do salto.',
      },
      almoco: {
        opcoes: [
          [i('Arroz', '200 g'), i('Feijão', '120 g'), i('Patinho', '150 g'), i('Legumes', '100 g')],
          [i('Arroz', '200 g'), i('Feijão', '120 g'), i('Frango', '150 g'), i('Salada', 'à vontade'), i('Beterraba', '50 g')],
        ],
        porque: 'Carne vermelha magra e feijão trazem ferro, ligado ao fôlego.',
      },
      lanche: {
        opcoes: [
          [i('Pão integral', '2 fatias · 50 g'), i('Frango desfiado', '80 g'), i('Suco natural', '300 ml')],
          [i('Iogurte', '170 g'), i('Aveia', '40 g'), i('Banana', '100 g')],
        ],
        porque: 'Carboidrato e proteína 2 a 3 horas antes do treino.',
      },
      janta: {
        opcoes: [
          [i('Frango', '150 g'), i('Batata-doce', '200 g'), i('Brócolis', '100 g')],
          [i('Peixe', '150 g'), i('Arroz', '150 g'), i('Salada', 'à vontade')],
        ],
        porque: 'Recupera as pernas para o próximo dia.',
      },
    },
  },
  {
    id: 'pivo',
    nome: 'Pivô',
    numeros: '5',
    titulo: 'Força no contato',
    subtitulo: 'Garrafão, rebote e corpo a corpo',
    resumo:
      'Você vive no contato: briga por posição, rebote e bloqueio. O foco é volume maior no prato e proteína alta para sustentar o corpo.',
    foco: ['Mais volume no prato', 'Proteína alta', 'Ceia'],
    porcoes: [
      { rotulo: 'Proteína', valor: '150–180 g' },
      { rotulo: 'Carboidrato', valor: '200–300 g', descanso: '150–220 g' },
      { rotulo: 'Legumes', valor: '150 g' },
    ],
    refeicoes: {
      cafe: {
        opcoes: [
          [i('Cuscuz', '200 g'), i('Ovos', '3 ovos · 150 g'), i('Queijo', '40 g'), i('Vitamina de banana', '400 ml')],
          [i('Pão', '3 fatias · 75 g'), i('Ovos', '3 ovos · 150 g'), i('Pasta de amendoim', '20 g'), i('Leite', '300 ml')],
        ],
        porque: 'Começar o dia com volume ajuda a fechar a energia do dia.',
      },
      almoco: {
        opcoes: [
          [i('Arroz', '250 g'), i('Feijão', '150 g'), i('Carne', '180 g'), i('Batata', '150 g'), i('Salada', 'à vontade')],
          [i('Macarrão', '300 g'), i('Frango', '180 g'), i('Legumes', '150 g')],
        ],
        porque: 'Prato maior: o corpo maior gasta mais.',
      },
      lanche: {
        opcoes: [
          [i('Vitamina de banana com aveia', '400 ml · 40 g de aveia')],
          [i('Pão', '2 fatias · 50 g'), i('Pasta de amendoim', '20 g'), i('Fruta', '150 g')],
        ],
        porque: 'Vitamina é um jeito fácil de somar energia.',
      },
      janta: {
        opcoes: [
          [i('Arroz', '200 g'), i('Feijão', '120 g'), i('Frango', '180 g'), i('Legumes', '150 g')],
          [i('Macarrão', '250 g'), i('Carne moída', '150 g'), i('Salada', 'à vontade')],
        ],
        porque: 'Janta reforçada; antes de dormir ainda tem a ceia.',
      },
    },
    ceia: [i('Iogurte', '170 g'), i('ou leite', '250 ml')],
  },
]

export const PRE_TREINO = [i('Banana', '100 g'), i('Pasta de amendoim', '15 g'), i('ou pão com mel', '50 g + 10 g')]
export const POS_TREINO = [i('Leite com achocolatado', '300 ml'), i('ou sanduíche de frango', '50 g de pão + 80 g'), i('Água', '500 ml')]

/** Para quem não tem balança: o peso aproximado de medidas de cozinha. */
export const MEDIDAS_CASEIRAS = [
  { medida: '1 colher de servir de arroz', peso: '≈ 45 g' },
  { medida: '1 concha média de feijão', peso: '≈ 100 g' },
  { medida: '1 filé médio de frango', peso: '≈ 120 g' },
  { medida: '1 ovo', peso: '≈ 50 g' },
  { medida: '1 fatia de pão de forma', peso: '≈ 25 g' },
  { medida: '1 banana prata', peso: '≈ 100 g' },
  { medida: '1 colher de sopa de aveia', peso: '≈ 15 g' },
  { medida: '1 copo americano', peso: '≈ 190 ml' },
]

export const DIA_DE_JOGO = [
  { quando: '3–4h antes', detalhe: 'Refeição completa', titulo: 'Prato de almoço, sem exagero', texto: 'Base de carboidrato para encher o tanque, proteína magra e pouca gordura para não pesar.', alimentos: ['Arroz', 'Feijão (pouco)', 'Frango grelhado', 'Legumes cozidos'], cor: 'var(--c-passe)' },
  { quando: '1h antes', detalhe: 'Lanche leve', titulo: 'Algo rápido de digerir', texto: 'Carboidrato simples, quase sem fibra e gordura.', alimentos: ['Banana', 'Pão com mel', 'Torrada com geleia'], cor: 'var(--c-arremesso)' },
  { quando: 'Durante', detalhe: 'Pedidos de tempo e intervalo', titulo: 'Água em goles', texto: 'Pequenos goles a cada parada. Em jogo longo ou muito calor, um isotônico ou meia banana no intervalo.', alimentos: ['Água', 'Isotônico', 'Fruta no intervalo'], cor: 'var(--c-drible)' },
  { quando: 'Até 1h depois', detalhe: 'Recuperação', titulo: 'Repor e reconstruir', texto: 'Carboidrato para repor energia e proteína para os músculos. Depois, jantar normal.', alimentos: ['Leite com achocolatado', 'Sanduíche de frango', 'Iogurte com fruta'], cor: 'var(--c-defesa)' },
]

export const EVITAR_NO_JOGO = ['Fritura', 'Feijoada ou prato pesado', 'Refrigerante', 'Comida que você nunca comeu antes', 'Muita fibra perto do jogo']

export const DESPENSA = [
  { nome: 'Energia', icone: '⚡', cor: 'var(--c-condicionamento)', texto: 'Combustível para correr e saltar. Prioridade antes de treinos e jogos.', alimentos: ['Arroz', 'Macarrão', 'Batata-doce', 'Mandioca', 'Pão integral', 'Tapioca', 'Cuscuz', 'Aveia', 'Banana'] },
  { nome: 'Construção', icone: '💪', cor: 'var(--c-finalizacao)', texto: 'Proteína para recuperar e fortalecer o músculo depois do esforço.', alimentos: ['Frango', 'Ovo', 'Patinho ou carne magra', 'Peixe', 'Atum', 'Feijão com arroz', 'Leite', 'Iogurte natural', 'Queijo branco'] },
  { nome: 'Proteção', icone: '🛡️', cor: 'var(--c-passe)', texto: 'Vitaminas e minerais para a imunidade e para aguentar a temporada.', alimentos: ['Brócolis', 'Cenoura', 'Folhas verdes', 'Tomate', 'Laranja', 'Mamão', 'Beterraba'] },
  { nome: 'Hidratação', icone: '💧', cor: 'var(--c-drible)', texto: 'Perder água derruba o rendimento e a pontaria. Beba ao longo do dia, não só no treino.', alimentos: ['Água', 'Água de coco', 'Melancia', 'Suco natural', 'Isotônico (jogo longo)'] },
]
