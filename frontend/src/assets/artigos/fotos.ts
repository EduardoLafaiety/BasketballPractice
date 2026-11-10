// Fotos dos artigos de História, da Wikimedia Commons, em domínio público ou com licença livre.
// Todas foram recortadas em 3:2 e reduzidas para 1200 e 640 px (a de Roma 1960 só tem 900); a do Amaury também foi clareada.
// As do Splitter (CC BY-SA 2.0) e do 3x3 (CC BY-SA 4.0) seguem a mesma licença nas versões recortadas. Lista também em CREDITOS.md.

const ARQUIVOS = import.meta.glob<string>('./*.webp', { eager: true, import: 'default', query: '?url' })
const fotos = (id: string) => ({ src: ARQUIVOS[`./${id}-1200.webp`], srcPequena: ARQUIVOS[`./${id}-640.webp`] })

export interface FotoArtigo {
  /** Versão de até 1200 px; `srcPequena`, de 640 px, serve os cartões da lista. */
  src: string
  srcPequena: string
  /** Descrição da cena, para o texto alternativo e a legenda. */
  legenda: string
  autor: string
  licenca: string
  /** Página do arquivo na Wikimedia Commons. */
  fonte: string
}

const commons = (arquivo: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(arquivo.replaceAll(' ', '_'))}`

/** Foto de cada artigo, pelo id do artigo. */
export const FOTOS_ARTIGOS: Record<string, FotoArtigo> = {
  'cesto-de-pessego': {
    ...fotos('cesto-de-pessego'),
    legenda: 'O primeiro time de basquete, com James Naismith (de terno, no centro), em 1892',
    autor: 'Autor desconhecido',
    licenca: 'Domínio público',
    fonte: commons('FirstTeam1892.jpg'),
  },
  'regras-que-mudaram': {
    ...fotos('regras-que-mudaram'),
    legenda: 'George Mikan (99), da DePaul, no Madison Square Garden nos anos 1940',
    autor: 'New York World-Telegram and the Sun, Biblioteca do Congresso dos EUA',
    licenca: 'Domínio público',
    fonte: commons('GeorgeMikan.jpg'),
  },
  'basquete-no-brasil': {
    ...fotos('basquete-no-brasil'),
    legenda: 'Amaury Pasos no jogo Brasil x União Soviética, no Mundial de 1963',
    autor: 'Correio da Manhã, Arquivo Nacional',
    licenca: 'Domínio público',
    fonte: commons('Amauri, Jogo Brasil X Rússia, Mundial de Basquete.tif'),
  },
  'dream-team': {
    ...fotos('dream-team'),
    legenda: 'David Robinson no lance livre do Dream Team contra Porto Rico, em Barcelona 1992',
    autor: 'Ken Hackman, Força Aérea dos EUA',
    licenca: 'Domínio público',
    fonte: commons('Dream Team at the 1992 Summer Olympics.JPEG'),
  },
  'brasileiros-na-nba': {
    ...fotos('brasileiros-na-nba'),
    legenda: 'Tiago Splitter (22), do San Antonio Spurs, no lance livre em dezembro de 2010',
    autor: 'Mike',
    licenca: 'CC BY-SA 2.0',
    fonte: commons('Tiago Splitter at the foul line Spurs-Magic100.jpg'),
  },
  'basquete-feminino': {
    ...fotos('basquete-feminino'),
    legenda: 'O time da Fort Shaw Indian School na Feira Mundial de St. Louis, em 1904',
    autor: 'Jessie Tarbox Beals (atribuída), Missouri History Museum',
    licenca: 'Domínio público',
    fonte: commons(
      '"Indian girls dressed for a ball game, U.S. Government Indian exhibit." (Fort Shaw Indian School basketball team) 1904 World\'s Fair (cropped).jpg',
    ),
  },
  'basquete-3x3': {
    ...fotos('basquete-3x3'),
    legenda: 'Jogo do Azerbaijão no 3x3 feminino dos Jogos de Paris, em 2024',
    autor: 'Dilaver Najafov',
    licenca: 'CC BY-SA 4.0',
    fonte: commons("Azerbaijan's 3x3 women's basketball team at the 2024 Summer Olympics 3.jpg"),
  },
  'basquete-em-cadeira-de-rodas': {
    ...fotos('basquete-em-cadeira-de-rodas'),
    legenda: 'Partida de basquete em cadeira de rodas nos primeiros Jogos Paralímpicos, em Roma, em 1960',
    autor: 'INAIL',
    licenca: 'Domínio público',
    fonte: commons('Roma 1960 - Partita di basket.jpg'),
  },
}
