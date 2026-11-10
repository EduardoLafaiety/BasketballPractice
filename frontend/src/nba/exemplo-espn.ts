// Para os testes: resposta da ESPN reduzida ao que o site lê.
export const respostaEspn = {
  currentSeason: { year: 2027, displayName: '2026-27' },
  leaders: {
    categories: [
      {
        name: 'reboundsPerGame',
        leaders: [
          { value: 14.6, athlete: { displayName: 'Domantas Sabonis' }, team: { displayName: 'Sacramento Kings', abbreviation: 'SAC', color: '5a2d81' } },
          { value: 13.6, athlete: { displayName: 'Karl-Anthony Towns' }, team: { displayName: 'New York Knicks', abbreviation: 'NY', color: '1d428a' } },
        ],
      },
      { name: 'PER', leaders: [{ value: 33.1, athlete: { displayName: 'Nikola Jokic' }, team: { abbreviation: 'DEN', color: '0e2240' } }] },
      {
        name: 'pointsPerGame',
        leaders: [
          { value: 39.29999923706055, athlete: { displayName: 'Luka Doncic' }, team: { displayName: 'Los Angeles Lakers', abbreviation: 'LAL', color: '552583' } },
          { value: 30.6, athlete: { displayName: 'Stephen Curry' }, team: { displayName: 'Golden State Warriors', abbreviation: 'GS', color: 'cor-ruim' } },
          { value: 30.1, team: { abbreviation: 'SA' } },
        ],
      },
    ],
  },
}
