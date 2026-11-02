// Conteúdo da aba Alimentação: sugestões gerais, sem gramas, medidas com a própria mão.
// Não é uma dieta: a página avisa que alergias, doenças e metas de peso pedem um nutricionista.

export type PosicaoDieta = 'armador' | 'ala' | 'pivo'
export type Refeicao = 'cafe' | 'almoco' | 'lanche' | 'janta'

export interface CardapioPosicao {
  id: PosicaoDieta
  nome: string
  numeros: string
  titulo: string
  subtitulo: string
  resumo: string
  foco: string[]
  porcoes: { rotulo: string; valor: string }[]
  refeicoes: Record<Refeicao, { opcoes: string[][]; porque: string }>
  /** Só o pivô tem: algo leve antes de dormir. */
  ceia?: string[]
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
      { rotulo: 'Proteína', valor: '1 palma' },
      { rotulo: 'Carboidrato', valor: '1–2 punhos' },
      { rotulo: 'Legumes', valor: '2 mãos' },
    ],
    refeicoes: {
      cafe: { opcoes: [['Pão integral', 'Ovo mexido', 'Banana', 'Café com leite'], ['Tapioca', 'Queijo branco', 'Mamão']], porque: 'Carboidrato de manhã já abastece o treino do dia.' },
      almoco: { opcoes: [['Arroz', 'Feijão', 'Frango grelhado', 'Salada'], ['Macarrão', 'Carne moída magra', 'Legumes']], porque: 'Prato completo, porção moderada: energia sem perder agilidade.' },
      lanche: { opcoes: [['Iogurte natural', 'Aveia', 'Banana'], ['Fruta', 'Castanhas']], porque: 'Lanche leve segura a fome sem pesar no treino.' },
      janta: { opcoes: [['Peixe', 'Batata-doce', 'Salada'], ['Omelete', 'Legumes', 'Arroz (pouco)']], porque: 'Proteína para recuperar; carboidrato menor se não treinou.' },
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
      { rotulo: 'Proteína', valor: '1–1,5 palma' },
      { rotulo: 'Carboidrato', valor: '2 punhos' },
      { rotulo: 'Legumes', valor: '2 mãos' },
    ],
    refeicoes: {
      cafe: { opcoes: [['Ovos (2 ou 3)', 'Pão integral', 'Fruta', 'Leite'], ['Cuscuz', 'Ovo', 'Queijo branco', 'Café com leite']], porque: 'Ovo de manhã dá proteína cedo para o músculo do salto.' },
      almoco: { opcoes: [['Arroz', 'Feijão', 'Patinho', 'Legumes'], ['Arroz', 'Feijão', 'Frango', 'Salada', 'Beterraba']], porque: 'Carne vermelha magra e feijão trazem ferro, ligado ao fôlego.' },
      lanche: { opcoes: [['Pão integral', 'Frango desfiado', 'Suco natural'], ['Iogurte', 'Aveia', 'Banana']], porque: 'Carboidrato e proteína 2 a 3 horas antes do treino.' },
      janta: { opcoes: [['Frango', 'Batata-doce', 'Brócolis'], ['Peixe', 'Arroz', 'Salada']], porque: 'Recupera as pernas para o próximo dia.' },
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
      { rotulo: 'Proteína', valor: '1,5–2 palmas' },
      { rotulo: 'Carboidrato', valor: '2–3 punhos' },
      { rotulo: 'Legumes', valor: '2 mãos' },
    ],
    refeicoes: {
      cafe: { opcoes: [['Cuscuz', 'Ovos', 'Queijo', 'Vitamina de banana'], ['Pão', 'Ovos', 'Pasta de amendoim', 'Leite']], porque: 'Começar o dia com volume ajuda a fechar a energia do dia.' },
      almoco: { opcoes: [['Arroz', 'Feijão', 'Carne', 'Batata', 'Salada'], ['Macarrão', 'Frango', 'Legumes']], porque: 'Prato maior: o corpo maior gasta mais.' },
      lanche: { opcoes: [['Vitamina de banana com aveia'], ['Pão', 'Pasta de amendoim', 'Fruta']], porque: 'Vitamina é um jeito fácil de somar energia.' },
      janta: { opcoes: [['Arroz', 'Feijão', 'Frango', 'Legumes'], ['Macarrão', 'Carne moída', 'Salada']], porque: 'Janta reforçada; antes de dormir ainda tem a ceia.' },
    },
    ceia: ['Iogurte', 'ou copo de leite'],
  },
]

export const PRE_TREINO = ['Banana', 'Pasta de amendoim (1 polegar)', 'ou pão com mel']
export const POS_TREINO = ['Leite com achocolatado', 'ou sanduíche de frango', 'Água']

export const MAOS = [
  { icone: '✋', nome: 'Palma', texto: 'Proteína: frango, carne, peixe, ovos' },
  { icone: '✊', nome: 'Punho', texto: 'Carboidrato: arroz, macarrão, batata, pão' },
  { icone: '🤲', nome: 'Duas mãos abertas', texto: 'Salada e legumes' },
  { icone: '👍', nome: 'Polegar', texto: 'Gordura boa: azeite, castanhas, pasta de amendoim' },
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
