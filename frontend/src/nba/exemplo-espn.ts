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

const linha = (sigla: string, nome: string, seed: number, v: number, d: number, atras: number, seq: string) => ({
  team: { abbreviation: sigla, displayName: nome },
  stats: [
    { name: 'playoffSeed', value: seed },
    { name: 'wins', value: v },
    { name: 'losses', value: d },
    { name: 'winPercent', value: v / (v + d) },
    { name: 'gamesBehind', value: atras },
    { name: 'streak', displayValue: seq },
  ],
})

/** Classificação, com as conferências fora de ordem e os times fora de ordem, como pode vir. */
export const respostaTabela = {
  children: [
    {
      name: 'Western Conference',
      abbreviation: 'West',
      standings: { entries: [linha('SA', 'San Antonio Spurs', 2, 9, 2, 0.5, 'W9'), linha('LAL', 'Los Angeles Lakers', 1, 10, 2, 0, 'W6')] },
    },
    {
      name: 'Eastern Conference',
      abbreviation: 'East',
      standings: { entries: [linha('MIL', 'Milwaukee Bucks', 15, 1, 9, 7.5, 'L6'), linha('PHI', 'Philadelphia 76ers', 1, 9, 2, 0, 'W1'), linha('NY', 'New York Knicks', 5, 5, 4, 3, 'W3')] },
    },
  ],
}

/** Notícias da ESPN: uma matéria, uma manchete, uma prévia automática de jogo (que fica de fora). */
export const respostaNoticiasEspn = (agora: number) => ({
  articles: [
    {
      id: 1,
      type: 'Story',
      headline: 'As Jaylen Brown faces the Celtics for the first time',
      description: 'Jaylen Brown and the 76ers host the Celtics.',
      published: new Date(agora - 2 * 3_600_000).toISOString(),
      images: [{ url: 'https://a.espncdn.com/photo/brown.jpg' }],
      links: { web: { href: 'https://www.espn.com/nba/story/_/id/1' } },
    },
    {
      id: 2,
      type: 'HeadlineNews',
      headline: 'Victor Wembanyama scores 40 points in 25 minutes',
      description: 'Spurs win 9th straight.',
      published: new Date(agora - 30 * 3_600_000).toISOString(),
      links: { web: { href: 'http://www.espn.com/nba/story/_/id/2' } },
    },
    {
      id: 3,
      type: 'Preview',
      headline: 'Memphis hosts Denver on home skid',
      published: new Date(agora - 3_600_000).toISOString(),
      links: { web: { href: 'http://www.espn.com/nba/preview?gameId=3' } },
    },
  ],
})

/** RSS da CBS Sports: uma notícia e uma propaganda de aposta (que fica de fora). */
export const rssCbs = (agora: number) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>
      Use DraftKings promo code to get $200 bonus
    </title>
    <link>https://www.cbssports.com/betting/news/promo/</link>
    <description>Bonus bets after your first wager</description>
    <pubDate>${new Date(agora - 600_000).toUTCString()}</pubDate>
    <guid isPermaLink="false">aposta</guid>
  </item>
  <item>
    <title>
      Re-grading the Jaylen Brown-Paul George trade
    </title>
    <link>
      https://www.cbssports.com/nba/news/re-grading/
    </link>
    <description>Brown and George will go head-to-head on Tuesday</description>
    <pubDate>${new Date(agora - 1_800_000).toUTCString()}</pubDate>
    <guid isPermaLink="false">troca</guid>
    <enclosure url="https://sportshub.cbsistatic.com/i/brown.jpg" type="image/jpeg" />
  </item>
</channel></rss>`
