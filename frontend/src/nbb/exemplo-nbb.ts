// Exemplo do JSON que o backend gera (backend/src/scripts/export-nbb.ts): 18 times, para cobrir as três faixas.
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
}
