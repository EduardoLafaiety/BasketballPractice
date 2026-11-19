// Roupas, calçados, proteção e material de treino da aba Equipamentos. Como as bolas, cada item abre a busca
// na Amazon com o código de afiliado: preço, fotos e compra ficam por lá. O desenho é um sprite próprio
// (sprites.ts) nas cores do produto, sem marca nem foto da Amazon.
import type { Sprite } from './sprites'
import type { Time } from './dados'

export type Categoria = 'roupas' | 'calcados' | 'treino'

export interface Produto {
  id: string
  categoria: Categoria
  sprite: Sprite
  /** Cor principal e de destaque do desenho (e do cartão). */
  cor: string
  destaque: string
  tipo: string
  nome: string
  texto: string
  detalhes: string[]
  busca: string
}

export const CATEGORIAS: { id: Categoria; rotulo: string; resumo: string }[] = [
  { id: 'roupas', rotulo: 'Roupas', resumo: 'Regata, camiseta, moletom, shorts e meias' },
  { id: 'calcados', rotulo: 'Tênis e proteção', resumo: 'Tênis de quadra, joelheira e munhequeira' },
  { id: 'treino', rotulo: 'Treino e quadra', resumo: 'Cones, escada, elástico, tabela e mais' },
]

export const PRODUTOS: Produto[] = [
  // Roupas
  { id: 'regata-dupla-face', categoria: 'roupas', sprite: 'regata', cor: '#1D4ED8', destaque: '#F4F2EA', tipo: 'Regata', nome: 'Regata dupla-face de treino', texto: 'Uma cor de cada lado: vira o time do coletivo sem trocar de roupa.', detalhes: ['Treino', 'Tecido leve'], busca: 'regata basquete dupla face treino' },
  { id: 'regata-dry-fit', categoria: 'roupas', sprite: 'regata', cor: '#141414', destaque: '#FF6A13', tipo: 'Regata', nome: 'Regata de basquete dry fit', texto: 'Tecido que seca rápido e cava larga para o arremesso.', detalhes: ['Jogo e treino', 'Dry fit'], busca: 'regata basquete masculina dry fit' },
  { id: 'camiseta-treino', categoria: 'roupas', sprite: 'camiseta', cor: '#FF6A13', destaque: '#141414', tipo: 'Camiseta', nome: 'Camiseta de treino dry fit', texto: 'Para o aquecimento e para o treino sob o sol.', detalhes: ['Treino', 'Dry fit'], busca: 'camiseta dry fit treino basquete' },
  { id: 'camiseta-shooting', categoria: 'roupas', sprite: 'camiseta', cor: '#F4F2EA', destaque: '#C8102E', tipo: 'Camiseta', nome: 'Camiseta de aquecimento (shooting shirt)', texto: 'A camiseta que os times usam no aquecimento antes do jogo.', detalhes: ['Aquecimento', 'Manga curta'], busca: 'shooting shirt basquete camiseta aquecimento' },
  { id: 'moletom', categoria: 'roupas', sprite: 'moletom', cor: '#5A5A5A', destaque: '#141414', tipo: 'Moletom', nome: 'Moletom com capuz', texto: 'Para chegar e sair da quadra aquecido.', detalhes: ['Frio', 'Com capuz'], busca: 'moletom canguru capuz basquete' },
  { id: 'moletom-nba', categoria: 'roupas', sprite: 'moletom', cor: '#17408B', destaque: '#C9082A', tipo: 'Moletom', nome: 'Moletom NBA', texto: 'Moletom com capuz da liga ou do seu time.', detalhes: ['Frio', 'Coleção NBA'], busca: 'moletom NBA capuz' },
  { id: 'shorts', categoria: 'roupas', sprite: 'shorts', cor: '#141414', destaque: '#FF6A13', tipo: 'Shorts', nome: 'Shorts de basquete', texto: 'Comprido e folgado, para não prender no passo.', detalhes: ['Jogo e treino', 'Elástico na cintura'], busca: 'shorts basquete masculino' },
  { id: 'shorts-dry-fit', categoria: 'roupas', sprite: 'shorts', cor: '#1D4ED8', destaque: '#F4F2EA', tipo: 'Shorts', nome: 'Shorts dry fit com bolso', texto: 'Leve, com bolso para a chave e o celular no caminho da quadra.', detalhes: ['Treino', 'Com bolso'], busca: 'shorts dry fit basquete bolso' },
  { id: 'calca-agasalho', categoria: 'roupas', sprite: 'calca', cor: '#141414', destaque: '#F4F2EA', tipo: 'Calça', nome: 'Calça de agasalho', texto: 'Com faixa lateral, para o aquecimento em dia frio.', detalhes: ['Frio', 'Aquecimento'], busca: 'calça agasalho esportiva masculina' },
  { id: 'meia-basquete', categoria: 'roupas', sprite: 'meia', cor: '#C8102E', destaque: '#141414', tipo: 'Meia', nome: 'Meia de basquete cano alto', texto: 'Acolchoada na sola e no calcanhar, para os saltos.', detalhes: ['Cano alto', 'Acolchoada'], busca: 'meia basquete cano alto acolchoada' },
  { id: 'meia-compressao', categoria: 'roupas', sprite: 'meia', cor: '#1D4ED8', destaque: '#F4F2EA', tipo: 'Meia', nome: 'Meia de compressão', texto: 'Aperta a panturrilha e ajuda na volta depois do treino.', detalhes: ['Compressão', 'Cano alto'], busca: 'meia de compressão esportiva' },
  { id: 'testeira', categoria: 'roupas', sprite: 'testeira', cor: '#F4F2EA', destaque: '#141414', tipo: 'Testeira', nome: 'Testeira (headband)', texto: 'Segura o suor longe dos olhos no arremesso.', detalhes: ['Suor', 'Atoalhada'], busca: 'testeira headband esportiva basquete' },

  // Tênis e proteção
  { id: 'tenis-cano-alto', categoria: 'calcados', sprite: 'tenis', cor: '#141414', destaque: '#FF6A13', tipo: 'Tênis', nome: 'Tênis de basquete cano alto', texto: 'Mais firmeza no tornozelo para quem salta e muda de direção.', detalhes: ['Cano alto', 'Quadra'], busca: 'tênis basquete cano alto masculino' },
  { id: 'tenis-cano-baixo', categoria: 'calcados', sprite: 'tenis', cor: '#F4F2EA', destaque: '#1D4ED8', tipo: 'Tênis', nome: 'Tênis de basquete cano baixo', texto: 'Mais leve, para armadores e alas rápidos.', detalhes: ['Cano baixo', 'Leve'], busca: 'tênis basquete cano baixo' },
  { id: 'tenis-nike', categoria: 'calcados', sprite: 'tenis', cor: '#C8102E', destaque: '#141414', tipo: 'Tênis', nome: 'Tênis de basquete Nike', texto: 'Linhas de assinatura e modelos de quadra da Nike e da Jordan.', detalhes: ['Nike e Jordan', 'Quadra'], busca: 'tênis basquete Nike' },
  { id: 'tenis-adidas', categoria: 'calcados', sprite: 'tenis', cor: '#1D4ED8', destaque: '#F4F2EA', tipo: 'Tênis', nome: 'Tênis de basquete Adidas', texto: 'Modelos de quadra da Adidas, com amortecimento para salto.', detalhes: ['Adidas', 'Quadra'], busca: 'tênis basquete Adidas' },
  { id: 'tenis-under-armour', categoria: 'calcados', sprite: 'tenis', cor: '#FDB927', destaque: '#141414', tipo: 'Tênis', nome: 'Tênis de basquete Under Armour', texto: 'A linha de quadra da Under Armour, incluindo a do Curry.', detalhes: ['Under Armour', 'Quadra'], busca: 'tênis basquete Under Armour Curry' },
  { id: 'joelheira-compressao', categoria: 'calcados', sprite: 'joelheira', cor: '#141414', destaque: '#5A5A5A', tipo: 'Joelheira', nome: 'Joelheira de compressão', texto: 'Mantém o joelho aquecido e firme no treino de salto.', detalhes: ['Compressão', 'Par ou unidade'], busca: 'joelheira de compressão basquete' },
  { id: 'joelheira-protecao', categoria: 'calcados', sprite: 'joelheira', cor: '#F4F2EA', destaque: '#141414', tipo: 'Joelheira', nome: 'Joelheira com proteção', texto: 'Com espuma na frente, para as quedas no chão da quadra.', detalhes: ['Com espuma', 'Impacto'], busca: 'joelheira com proteção espuma basquete' },
  { id: 'munhequeira', categoria: 'calcados', sprite: 'munhequeira', cor: '#F4F2EA', destaque: '#FF6A13', tipo: 'Munhequeira', nome: 'Munhequeira atoalhada', texto: 'Seca o suor da mão antes do lance livre.', detalhes: ['Suor', 'Par'], busca: 'munhequeira atoalhada esportiva' },
  { id: 'manga-compressao', categoria: 'calcados', sprite: 'manga', cor: '#141414', destaque: '#F4F2EA', tipo: 'Manga', nome: 'Manga de compressão para braço', texto: 'Mantém o braço do arremesso aquecido.', detalhes: ['Compressão', 'Braço'], busca: 'manga de compressão braço basquete' },
  { id: 'tornozeleira', categoria: 'calcados', sprite: 'tornozeleira', cor: '#141414', destaque: '#F4F2EA', tipo: 'Tornozeleira', nome: 'Tornozeleira estabilizadora', texto: 'Com tiras em X, para quem já torceu o tornozelo.', detalhes: ['Estabilidade', 'Com tiras'], busca: 'tornozeleira estabilizadora basquete' },

  // Treino e quadra
  { id: 'cones', categoria: 'treino', sprite: 'cone', cor: '#FF6A13', destaque: '#F4F2EA', tipo: 'Cones', nome: 'Kit de cones de treino', texto: 'Marcam o caminho do drible e das mudanças de direção.', detalhes: ['Drible', 'Agilidade'], busca: 'kit cones treino agilidade' },
  { id: 'escada', categoria: 'treino', sprite: 'escada', cor: '#FDB927', destaque: '#141414', tipo: 'Escada', nome: 'Escada de agilidade', texto: 'Trabalho de pés rápido, para a defesa e a saída de drible.', detalhes: ['Agilidade', 'Pés rápidos'], busca: 'escada de agilidade treino' },
  { id: 'elastico', categoria: 'treino', sprite: 'elastico', cor: '#2E9E5B', destaque: '#141414', tipo: 'Elástico', nome: 'Mini band (elástico de resistência)', texto: 'Para o passo lateral da defesa e o aquecimento do quadril.', detalhes: ['Força', 'Kit com níveis'], busca: 'mini band elástico resistência kit' },
  { id: 'corda', categoria: 'treino', sprite: 'corda', cor: '#141414', destaque: '#FF6A13', tipo: 'Corda', nome: 'Corda de pular', texto: 'Condicionamento e ritmo de pés em poucos minutos.', detalhes: ['Condicionamento', 'Ajustável'], busca: 'corda de pular ajustável' },
  { id: 'bomba', categoria: 'treino', sprite: 'bomba', cor: '#5A5A5A', destaque: '#FF6A13', tipo: 'Bomba de ar', nome: 'Bomba de ar com agulha', texto: 'Bola na pressão certa quica igual em todo treino.', detalhes: ['Com agulha', 'Portátil'], busca: 'bomba de ar para bola com agulha' },
  { id: 'garrafa', categoria: 'treino', sprite: 'garrafa', cor: '#1D4ED8', destaque: '#141414', tipo: 'Garrafa', nome: 'Garrafa squeeze', texto: 'Água à mão entre um exercício e outro.', detalhes: ['Hidratação', 'Squeeze'], busca: 'garrafa squeeze esportiva 1 litro' },
  { id: 'mochila', categoria: 'treino', sprite: 'mochila', cor: '#141414', destaque: '#FF6A13', tipo: 'Mochila', nome: 'Mochila com porta-bola', texto: 'Leva a bola, o tênis e a roupa num lugar só.', detalhes: ['Porta-bola', 'Porta-tênis'], busca: 'mochila basquete porta bola' },
  { id: 'tabela', categoria: 'treino', sprite: 'tabela', cor: '#5A5A5A', destaque: '#FF6A13', tipo: 'Tabela', nome: 'Tabela de basquete com base', texto: 'Para treinar arremesso em casa, com altura ajustável.', detalhes: ['Para casa', 'Altura ajustável'], busca: 'tabela de basquete com base ajustável' },
  { id: 'aro-rede', categoria: 'treino', sprite: 'aro', cor: '#F4F2EA', destaque: '#FF6A13', tipo: 'Aro', nome: 'Aro com rede', texto: 'Para pôr na parede ou trocar o aro da quadra.', detalhes: ['Oficial', 'Com rede'], busca: 'aro de basquete com rede oficial' },
  { id: 'rede', categoria: 'treino', sprite: 'aro', cor: '#F4F2EA', destaque: '#141414', tipo: 'Rede', nome: 'Rede de reposição', texto: 'Rede nova para o aro da quadra ou de casa.', detalhes: ['Reposição', 'Nylon'], busca: 'rede de basquete reposição nylon' },
]

/** Busca da regata de um time na Amazon. */
export const buscaRegata = (t: Time) => `regata NBA ${t.cidade} ${t.nome}`
