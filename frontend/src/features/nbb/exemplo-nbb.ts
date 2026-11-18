// Exemplo do JSON que o backend gera (backend/src/scripts/export-nbb.ts): 18 times, para cobrir as três faixas,
// líderes em duas categorias e três notícias.
const time = (position: number, abbreviation: string, name: string, wins: number, losses: number, extra: object = {}) => ({
  position,
  abbreviation,
  name,
  logo: `https://lnb.com.br/uploads/${abbreviation.toLowerCase()}-150.png`,
  games: wins + losses,
  wins,
  losses,
  winPct: wins / (wins + losses),
  pointsFor: 600,
  pointsAgainst: 600 - (wins - losses) * 10,
  pointsDiff: (wins - losses) * 10,
  points: wins * 2 + losses,
  ...extra,
})

const lider = (position: number, name: string, team: string, abbreviation: string, value: number) => ({
  position,
  name,
  team,
  teamAbbreviation: abbreviation,
  teamLogo: abbreviation ? `https://lnb.com.br/uploads/${abbreviation.toLowerCase()}-150.png` : '',
  games: 7,
  value,
})

const dia = (diasAtras: number) => {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const jsonNbb = {
  season: '2026/2027',
  updatedAt: '2026-11-13T12:53:37.973Z',
  // Fora de ordem, como pode vir.
  teams: [
    time(2, 'MOG', 'Mogi Basquete', 6, 1),
    time(1, 'MIN', 'Minas Storm', 7, 0),
    ...Array.from({ length: 14 }, (_, i) => time(i + 3, `T${String(i + 3).padStart(2, '0')}`, `Time ${i + 3}`, 4, 4, { pointsDiff: 0 })),
    time(17, 'BCE', 'Basquete Cearense', 1, 5),
    time(18, 'CAX', 'Caxias do Sul Basquete', 0, 7),
  ],
  leaders: [
    {
      id: 'pontos',
      label: 'Pontos',
      unit: 'pontos por jogo',
      short: 'pontos',
      leaders: [lider(2, 'Harris #1', 'Mogi Basquete', 'MOG', 21.71), lider(1, 'Dupree #11', 'Basquete Cearense', 'BCE', 23.33), lider(3, 'Time Novo #7', 'Time Novo', '', 20.1)],
    },
    { id: 'rebotes', label: 'Rebotes', unit: 'rebotes por jogo', short: 'rebotes', leaders: [lider(1, 'Georginho #14', 'Mogi Basquete', 'MOG', 9.43)] },
    { id: 'sem-lideres', label: 'Vazia', unit: '', short: '', leaders: [] },
  ],
  news: [
    {
      url: 'https://lnb.com.br/noticias/minas-vence-mogi/',
      title: 'Minas Storm vence Mogi Basquete e segue invicto',
      summary: 'Sétima vitória seguida na temporada.',
      image: 'https://lnb.com.br/uploads/minas-400x320.jpg',
      date: dia(0),
    },
    { url: 'https://lnb.com.br/noticias/rodada/', title: 'Rodada do NBB CAIXA tem clássicos', summary: '', image: '', date: dia(1) },
    { url: 'https://lnb.com.br/noticias/antiga/', title: 'Balanço da semana', summary: 'Resumo.', image: 'https://lnb.com.br/uploads/antiga.jpg', date: dia(4) },
  ],
}
