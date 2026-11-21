// Os 30 times da NBA: sigla, nome, conferência e as duas cores de cada um. Usado pelas estatísticas da NBA,
// pelos escudos e pelas cores do "Jogue como".

export type Conferencia = 'leste' | 'oeste'

export interface Time {
  sigla: string
  cidade: string
  nome: string
  conferencia: Conferencia
  /** As duas cores do time (usadas no site todo). */
  cor: string
  costura: string
}

export const TIMES: Time[] = [
  { sigla: 'ATL', cidade: 'Atlanta', nome: 'Hawks', conferencia: 'leste', cor: '#E03A3E', costura: '#C1D32F' },
  { sigla: 'BOS', cidade: 'Boston', nome: 'Celtics', conferencia: 'leste', cor: '#007A33', costura: '#BA9653' },
  { sigla: 'BKN', cidade: 'Brooklyn', nome: 'Nets', conferencia: 'leste', cor: '#111111', costura: '#FFFFFF' },
  { sigla: 'CHA', cidade: 'Charlotte', nome: 'Hornets', conferencia: 'leste', cor: '#1D1160', costura: '#1BA9BE' },
  { sigla: 'CHI', cidade: 'Chicago', nome: 'Bulls', conferencia: 'leste', cor: '#CE1141', costura: '#111111' },
  { sigla: 'CLE', cidade: 'Cleveland', nome: 'Cavaliers', conferencia: 'leste', cor: '#860038', costura: '#FDBB30' },
  { sigla: 'DET', cidade: 'Detroit', nome: 'Pistons', conferencia: 'leste', cor: '#C8102E', costura: '#1D42BA' },
  { sigla: 'IND', cidade: 'Indiana', nome: 'Pacers', conferencia: 'leste', cor: '#002D62', costura: '#FDBB30' },
  { sigla: 'MIA', cidade: 'Miami', nome: 'Heat', conferencia: 'leste', cor: '#98002E', costura: '#F9A01B' },
  { sigla: 'MIL', cidade: 'Milwaukee', nome: 'Bucks', conferencia: 'leste', cor: '#00471B', costura: '#EEE1C6' },
  { sigla: 'NYK', cidade: 'Nova York', nome: 'Knicks', conferencia: 'leste', cor: '#006BB6', costura: '#F58426' },
  { sigla: 'ORL', cidade: 'Orlando', nome: 'Magic', conferencia: 'leste', cor: '#0077C0', costura: '#C4CED4' },
  { sigla: 'PHI', cidade: 'Filadélfia', nome: '76ers', conferencia: 'leste', cor: '#006BB6', costura: '#ED174C' },
  { sigla: 'TOR', cidade: 'Toronto', nome: 'Raptors', conferencia: 'leste', cor: '#CE1141', costura: '#A1A1A4' },
  { sigla: 'WAS', cidade: 'Washington', nome: 'Wizards', conferencia: 'leste', cor: '#002B5C', costura: '#E31837' },
  { sigla: 'DAL', cidade: 'Dallas', nome: 'Mavericks', conferencia: 'oeste', cor: '#00538C', costura: '#B8C4CA' },
  { sigla: 'DEN', cidade: 'Denver', nome: 'Nuggets', conferencia: 'oeste', cor: '#0E2240', costura: '#FEC524' },
  { sigla: 'GSW', cidade: 'Golden State', nome: 'Warriors', conferencia: 'oeste', cor: '#1D428A', costura: '#FFC72C' },
  { sigla: 'HOU', cidade: 'Houston', nome: 'Rockets', conferencia: 'oeste', cor: '#CE1141', costura: '#C4CED4' },
  { sigla: 'LAC', cidade: 'Los Angeles', nome: 'Clippers', conferencia: 'oeste', cor: '#C8102E', costura: '#1D428A' },
  { sigla: 'LAL', cidade: 'Los Angeles', nome: 'Lakers', conferencia: 'oeste', cor: '#552583', costura: '#FDB927' },
  { sigla: 'MEM', cidade: 'Memphis', nome: 'Grizzlies', conferencia: 'oeste', cor: '#5D76A9', costura: '#12173F' },
  { sigla: 'MIN', cidade: 'Minnesota', nome: 'Timberwolves', conferencia: 'oeste', cor: '#0C2340', costura: '#78BE20' },
  { sigla: 'NOP', cidade: 'Nova Orleans', nome: 'Pelicans', conferencia: 'oeste', cor: '#0C2340', costura: '#B4975A' },
  { sigla: 'OKC', cidade: 'Oklahoma City', nome: 'Thunder', conferencia: 'oeste', cor: '#007AC1', costura: '#EF3B24' },
  { sigla: 'PHX', cidade: 'Phoenix', nome: 'Suns', conferencia: 'oeste', cor: '#1D1160', costura: '#E56020' },
  { sigla: 'POR', cidade: 'Portland', nome: 'Trail Blazers', conferencia: 'oeste', cor: '#E03A3E', costura: '#111111' },
  { sigla: 'SAC', cidade: 'Sacramento', nome: 'Kings', conferencia: 'oeste', cor: '#5A2D81', costura: '#C4CED4' },
  { sigla: 'SAS', cidade: 'San Antonio', nome: 'Spurs', conferencia: 'oeste', cor: '#C4CED4', costura: '#111111' },
  { sigla: 'UTA', cidade: 'Utah', nome: 'Jazz', conferencia: 'oeste', cor: '#002B5C', costura: '#F9A01B' },
]
