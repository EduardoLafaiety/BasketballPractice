import type { Headline } from './news.js'

// Manchetes escritas à mão, como o conteúdo da aba Jogue como: a demonstração as mostra enquanto não houver notícias
// automáticas. Não se atualizam sozinhas. Só título próprio, fonte e link: o texto das matérias é dos veículos.
export const CURATED_HEADLINES: Headline[] = [
  {
    title: 'Knicks e 76ers se enfrentam em 30/10 pela fase de grupos da NBA Cup',
    sourceName: 'Oficina da Net',
    url: 'https://oficinadanet.com.br/entretenimento/73777-knicks-x-76ers-onde-assistir-nba-cup-30-10-2026',
    publishedAt: '2026-10-30T14:58:00-03:00',
  },
  {
    title: 'Ernie Johnson anuncia que esta será sua última temporada no Inside the NBA',
    sourceName: 'Atlanta News First',
    url: 'https://www.atlantanewsfirst.com/2026/10/28/its-time-ernie-johnson-jr-retire-inside-nba-after-this-season/',
    publishedAt: '2026-10-28T12:00:00-03:00',
  },
  {
    title: 'Minas vence o Pato por 86 a 65, segue invicto e lidera o NBB',
    sourceName: 'Gazeta Esportiva',
    url: 'https://www.gazetaesportiva.com/campeonatos/nbb-novo-basquete-brasil/minas-vence-pato-basquete-mantem-invencibilidade-e-lidera-o-nbb/',
    publishedAt: '2026-10-27T22:20:00-03:00',
  },
  {
    title: 'Anthony Edwards fará artroscopia no joelho direito e desfalca o Timberwolves por semanas',
    sourceName: 'AP via NY1',
    url: 'https://ny1.com/nyc/all-boroughs/ap-top-news/2026/10/27/t-wolves-anthony-edwards-needs-procedure-on-right-knee-will-miss-several-weeks-ap-source-says',
    publishedAt: '2026-10-27T20:30:00-04:00',
  },
  {
    title: 'Paolo Banchero torce o tornozelo e deve desfalcar o Magic por 4 a 6 semanas',
    sourceName: 'Yahoo Sports',
    url: 'https://sports.yahoo.com/articles/2026-27-nba-news-injury-130000152.html',
    publishedAt: '2026-10-26T13:00:00Z',
  },
  {
    title: 'Temporada 2026-27 da NBA começa com o Knicks como atual campeão',
    sourceName: 'CNN Brasil',
    url: 'https://www.cnnbrasil.com.br/esportes/basquete/nba-2026-27-tudo-o-que-voce-precisa-saber-sobre-a-nova-temporada/',
    publishedAt: '2026-10-20T10:09:00-03:00',
  },
  {
    title: 'Brandon Miller acerta extensão de 5 anos e US$ 209 milhões com o Hornets',
    sourceName: 'WBTV',
    url: 'https://www.wbtv.com/2026/10/19/hornets-star-forward-agrees-5-year-209m-extension-reports-say/',
    publishedAt: '2026-10-19T17:23:00-04:00',
  },
  {
    title: 'NBB 2026/27 é lançado na Gávea, no Rio de Janeiro',
    sourceName: 'No Ataque',
    url: 'https://noataque.com.br/futebol/nbb/time/cruzeiro/noticia/2026/10/13/com-cruzeiro-nbb-faz-lancamento-da-temporada-2026-27-veja-datas-e-detalhes/',
    publishedAt: '2026-10-13T12:00:00-03:00',
  },
]

/** O JSON da demonstração: as notícias automáticas e, sem elas, as manchetes escritas à mão. */
export function staticSiteNews(automatic: Headline[]) {
  const origin = automatic.length ? 'gnews' : 'curated'
  const headlines = automatic.length ? automatic : CURATED_HEADLINES
  return headlines.map((h, index) => ({ id: index + 1, origin, expiresAt: null, ...h }))
}
