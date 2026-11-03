// Conteúdo da aba Equipamentos: bolas de exemplo com link de afiliado da Amazon.
// Os botões abrem a busca do produto na Amazon, onde ficam o preço, as fotos e a compra.
// A Amazon não permite copiar preço nem imagem para cá; por isso a bola é desenhada nas cores do time.

/** Tag do Programa de Associados da Amazon. Troque pela sua quando a conta for aprovada. */
export const TAG_AFILIADO = 'seutag-20'

export const linkAmazon = (busca: string) =>
  `https://www.amazon.com.br/s?k=${encodeURIComponent(busca)}&tag=${TAG_AFILIADO}`

import type { IconeTime } from './icones-times'

export type Conferencia = 'leste' | 'oeste'

export interface Time {
  sigla: string
  cidade: string
  nome: string
  conferencia: Conferencia
  /** Cor da bola e cor das costuras. */
  cor: string
  costura: string
  /** Ícone próprio inspirado no nome do time (nunca o logo). */
  icone: IconeTime
}

export interface BolaMarca {
  id: string
  marca: string
  nome: string
  texto: string
  uso: string
  material: string
  cor: string
  costura: string
  busca: string
}

export const TIMES: Time[] = [
  { sigla: 'ATL', cidade: 'Atlanta', nome: 'Hawks', conferencia: 'leste', cor: '#E03A3E', costura: '#C1D32F', icone: 'pena' },
  { sigla: 'BOS', cidade: 'Boston', nome: 'Celtics', conferencia: 'leste', cor: '#007A33', costura: '#BA9653', icone: 'trevo' },
  { sigla: 'BKN', cidade: 'Brooklyn', nome: 'Nets', conferencia: 'leste', cor: '#111111', costura: '#FFFFFF', icone: 'rede' },
  { sigla: 'CHA', cidade: 'Charlotte', nome: 'Hornets', conferencia: 'leste', cor: '#1D1160', costura: '#1BA9BE', icone: 'vespa' },
  { sigla: 'CHI', cidade: 'Chicago', nome: 'Bulls', conferencia: 'leste', cor: '#CE1141', costura: '#111111', icone: 'chifres' },
  { sigla: 'CLE', cidade: 'Cleveland', nome: 'Cavaliers', conferencia: 'leste', cor: '#860038', costura: '#FDBB30', icone: 'espada' },
  { sigla: 'DET', cidade: 'Detroit', nome: 'Pistons', conferencia: 'leste', cor: '#C8102E', costura: '#1D42BA', icone: 'pistao' },
  { sigla: 'IND', cidade: 'Indiana', nome: 'Pacers', conferencia: 'leste', cor: '#002D62', costura: '#FDBB30', icone: 'bandeira' },
  { sigla: 'MIA', cidade: 'Miami', nome: 'Heat', conferencia: 'leste', cor: '#98002E', costura: '#F9A01B', icone: 'chama' },
  { sigla: 'MIL', cidade: 'Milwaukee', nome: 'Bucks', conferencia: 'leste', cor: '#00471B', costura: '#EEE1C6', icone: 'galhada' },
  { sigla: 'NYK', cidade: 'Nova York', nome: 'Knicks', conferencia: 'leste', cor: '#006BB6', costura: '#F58426', icone: 'predios' },
  { sigla: 'ORL', cidade: 'Orlando', nome: 'Magic', conferencia: 'leste', cor: '#0077C0', costura: '#C4CED4', icone: 'estrela' },
  { sigla: 'PHI', cidade: 'Filadélfia', nome: '76ers', conferencia: 'leste', cor: '#006BB6', costura: '#ED174C', icone: 'sino' },
  { sigla: 'TOR', cidade: 'Toronto', nome: 'Raptors', conferencia: 'leste', cor: '#CE1141', costura: '#A1A1A4', icone: 'garras' },
  { sigla: 'WAS', cidade: 'Washington', nome: 'Wizards', conferencia: 'leste', cor: '#002B5C', costura: '#E31837', icone: 'chapeu-mago' },
  { sigla: 'DAL', cidade: 'Dallas', nome: 'Mavericks', conferencia: 'oeste', cor: '#00538C', costura: '#B8C4CA', icone: 'chapeu' },
  { sigla: 'DEN', cidade: 'Denver', nome: 'Nuggets', conferencia: 'oeste', cor: '#0E2240', costura: '#FEC524', icone: 'pepita' },
  { sigla: 'GSW', cidade: 'Golden State', nome: 'Warriors', conferencia: 'oeste', cor: '#1D428A', costura: '#FFC72C', icone: 'escudo' },
  { sigla: 'HOU', cidade: 'Houston', nome: 'Rockets', conferencia: 'oeste', cor: '#CE1141', costura: '#C4CED4', icone: 'foguete' },
  { sigla: 'LAC', cidade: 'Los Angeles', nome: 'Clippers', conferencia: 'oeste', cor: '#C8102E', costura: '#1D428A', icone: 'veleiro' },
  { sigla: 'LAL', cidade: 'Los Angeles', nome: 'Lakers', conferencia: 'oeste', cor: '#552583', costura: '#FDB927', icone: 'ondas' },
  { sigla: 'MEM', cidade: 'Memphis', nome: 'Grizzlies', conferencia: 'oeste', cor: '#5D76A9', costura: '#12173F', icone: 'pegada-urso' },
  { sigla: 'MIN', cidade: 'Minnesota', nome: 'Timberwolves', conferencia: 'oeste', cor: '#0C2340', costura: '#78BE20', icone: 'pegada-lobo' },
  { sigla: 'NOP', cidade: 'Nova Orleans', nome: 'Pelicans', conferencia: 'oeste', cor: '#0C2340', costura: '#B4975A', icone: 'pelicano' },
  { sigla: 'OKC', cidade: 'Oklahoma City', nome: 'Thunder', conferencia: 'oeste', cor: '#007AC1', costura: '#EF3B24', icone: 'raio' },
  { sigla: 'PHX', cidade: 'Phoenix', nome: 'Suns', conferencia: 'oeste', cor: '#1D1160', costura: '#E56020', icone: 'sol' },
  { sigla: 'POR', cidade: 'Portland', nome: 'Trail Blazers', conferencia: 'oeste', cor: '#E03A3E', costura: '#111111', icone: 'pinheiros' },
  { sigla: 'SAC', cidade: 'Sacramento', nome: 'Kings', conferencia: 'oeste', cor: '#5A2D81', costura: '#C4CED4', icone: 'coroa' },
  { sigla: 'SAS', cidade: 'San Antonio', nome: 'Spurs', conferencia: 'oeste', cor: '#C4CED4', costura: '#111111', icone: 'espora' },
  { sigla: 'UTA', cidade: 'Utah', nome: 'Jazz', conferencia: 'oeste', cor: '#002B5C', costura: '#F9A01B', icone: 'nota' },
]

export const buscaTime = (t: Time) => `bola basquete ${t.cidade} ${t.nome} NBA`

const LARANJA = '#D9661F'
const COURO = '#A8521E'
const ESCURO = '#1B1B1B'

export const MARCAS: BolaMarca[] = [
  {
    id: 'wilson-oficial',
    marca: 'Wilson',
    nome: 'NBA Official Game Ball',
    texto: 'A bola usada nos jogos da NBA. Couro, feita para quadra coberta.',
    uso: 'Quadra coberta',
    material: 'Couro',
    cor: COURO,
    costura: ESCURO,
    busca: 'bola Wilson NBA Official Game Ball',
  },
  {
    id: 'wilson-evolution',
    marca: 'Wilson',
    nome: 'Evolution',
    texto: 'Muito usada em colégios e ginásios. Pegada macia, boa para treino de arremesso.',
    uso: 'Quadra coberta',
    material: 'Couro sintético',
    cor: '#7A3B1E',
    costura: ESCURO,
    busca: 'bola basquete Wilson Evolution',
  },
  {
    id: 'wilson-authentic',
    marca: 'Wilson',
    nome: 'NBA Authentic',
    texto: 'Mesmo visual da bola oficial, em versão que aguenta quadra de rua.',
    uso: 'Coberta e externa',
    material: 'Composto',
    cor: LARANJA,
    costura: ESCURO,
    busca: 'bola basquete Wilson NBA Authentic indoor outdoor',
  },
  {
    id: 'wilson-drv',
    marca: 'Wilson',
    nome: 'NBA DRV Pro',
    texto: 'Feita para asfalto e cimento: borracha resistente e gomos fundos.',
    uso: 'Externa',
    material: 'Borracha',
    cor: '#E2752B',
    costura: ESCURO,
    busca: 'bola basquete Wilson DRV Pro',
  },
  {
    id: 'spalding-tf1000',
    marca: 'Spalding',
    nome: 'TF-1000 Legacy',
    texto: 'Clássica de ginásio, com toque firme e boa aderência.',
    uso: 'Quadra coberta',
    material: 'Couro sintético',
    cor: COURO,
    costura: ESCURO,
    busca: 'bola basquete Spalding TF-1000 Legacy',
  },
  {
    id: 'spalding-tf250',
    marca: 'Spalding',
    nome: 'React TF-250',
    texto: 'Coringa para quem joga no ginásio e na rua.',
    uso: 'Coberta e externa',
    material: 'Composto',
    cor: LARANJA,
    costura: ESCURO,
    busca: 'bola basquete Spalding React TF-250',
  },
  {
    id: 'spalding-street',
    marca: 'Spalding',
    nome: 'Street',
    texto: 'Bola de borracha barata e resistente para a quadra do bairro.',
    uso: 'Externa',
    material: 'Borracha',
    cor: '#E2752B',
    costura: ESCURO,
    busca: 'bola basquete Spalding Street borracha',
  },
  {
    id: 'molten-bg4500',
    marca: 'Molten',
    nome: 'BG4500',
    texto: 'Aprovada pela FIBA. Gomos em duas cores, como nos jogos internacionais.',
    uso: 'Quadra coberta',
    material: 'Couro sintético',
    cor: '#C9551D',
    costura: '#F1E6D2',
    busca: 'bola basquete Molten BG4500',
  },
  {
    id: 'molten-gg7x',
    marca: 'Molten',
    nome: 'GG7X',
    texto: 'Muito comum em escolas e clubes. Durável e com boa pegada.',
    uso: 'Coberta e externa',
    material: 'Borracha',
    cor: LARANJA,
    costura: ESCURO,
    busca: 'bola basquete Molten GG7X',
  },
]
