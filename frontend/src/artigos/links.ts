// Link de cada referência dos artigos, para a pessoa ler a fonte original. Estudos pelo DOI (o
// endereço permanente do artigo científico, conferido no Crossref e no doi.org); instituições pelo
// site oficial; o livro sem DOI pela ficha na Open Library.

const doi = (d: string) => `https://doi.org/${d}`

/** Estudos e livros, pelo sobrenome do primeiro autor e o ano. */
const ESTUDOS: Record<string, string> = {
  'Dweck 2006': 'https://openlibrary.org/books/OL8363726M',
  'Sisk 2018': doi('10.1177/0956797617739704'),
  'Ericsson 1993': doi('10.1037/0033-295X.100.3.363'),
  'Macnamara 2014': doi('10.1177/0956797614535810'),
  'Lonsdale 2008': doi('10.1080/02640410701473962'),
  'Hatzigeorgiadis 2011': doi('10.1177/1745691611413136'),
  'Stojanović 2018': doi('10.1007/s40279-017-0794-z'),
  'Markovic 2007': doi('10.1136/bjsm.2007.035113'),
  'McGuine 2006': doi('10.1177/0363546505284191'),
  'Mah 2011': doi('10.5665/sleep.1132'),
  'Milewski 2014': doi('10.1097/BPO.0000000000000151'),
  'Paruthi 2016': doi('10.5664/jcsm.5866'),
  'Watson 2015': doi('10.5665/sleep.4716'),
  'Drake 2013': doi('10.5664/jcsm.3170'),
  'Baker 2007': doi('10.1249/mss.0b013e3180574b02'),
  'Sawka 2007': doi('10.1249/mss.0b013e31802ca597'),
  'Foster 2001': doi('10.1519/00124278-200102000-00019'),
  'Locke 2002': doi('10.1037/0003-066X.57.9.705'),
  'Kingston 1997': doi('10.1123/tsp.11.3.277'),
  'Vickers 1996': doi('10.1037/0096-1523.22.2.342'),
  'Harle 2001': doi('10.1123/tsp.15.3.289'),
  'Faigenbaum 2009': doi('10.1519/JSC.0b013e31819df407'),
  'Kay 2012': doi('10.1249/MSS.0b013e318225cb27'),
  'Behm 2011': doi('10.1007/s00421-011-1879-2'),
  'Walker 2002': doi('10.1016/S0896-6273(02)00746-8'),
  // Fullagar e Leeder saíram online um ano antes da edição impressa citada.
  'Fullagar 2015': doi('10.1007/s40279-014-0260-0'),
  'Morton 2018': doi('10.1136/bjsports-2017-097608'),
  'Jäger 2017': doi('10.1186/s12970-017-0177-8'),
  'Leeder 2012': doi('10.1136/bjsports-2011-090061'),
  'Roberts 2015': doi('10.1113/JP270570'),
  'Wiewelhove 2019': doi('10.3389/fphys.2019.00376'),
  'Shea 1979': doi('10.1037/0278-7393.5.2.179'),
  'Zachry 2005': doi('10.1016/j.brainresbull.2005.06.035'),
  'Wulf 2013': doi('10.1080/1750984X.2012.723728'),
  'Van Cutsem 2017': doi('10.1007/s40279-016-0672-0'),
  'Hewett 1999': doi('10.1177/03635465990270060301'),
  'van Dyk 2019': doi('10.1136/bjsports-2018-100045'),
  'Lian 2005': doi('10.1177/0363546504270454'),
  'Kongsgaard 2009': doi('10.1111/j.1600-0838.2009.00949.x'),
  // Chang saiu online no fim de 2014; a edição impressa citada é de 2015.
  'Chang 2015': doi('10.1073/pnas.1418490112'),
  'Carskadon 1998': doi('10.1093/sleep/21.8.871'),
  'Waterhouse 2007': doi('10.1080/02640410701244983'),
  'Burke 2011': doi('10.1080/02640414.2011.585473'),
  // Guest saiu na edição de 2021; a versão online da editora é de 2022.
  'Guest 2021': doi('10.1186/s12970-020-00383-4'),
  'Dupuy 2018': doi('10.3389/fphys.2018.00403'),
}

/** Instituições, pelo nome com que a referência começa. */
const INSTITUICOES: [string, string][] = [
  ['Naismith Memorial Basketball Hall of Fame', 'https://www.hoophall.com/'],
  ['FIBA', 'https://www.fiba.basketball/'],
  ['NBA', 'https://www.nba.com/history'],
  ['NCAA', 'https://www.ncaa.org/'],
  ['Confederação Brasileira de Basketball', 'https://www.cbb.com.br/'],
  ['Basketball-Reference', 'https://www.basketball-reference.com/'],
  ['WNBA', 'https://www.wnba.com/'],
  ['Comitê Olímpico Internacional', 'https://www.olympics.com/'],
  ['IWBF', 'https://iwbf.org/'],
  ['Comitê Paralímpico Internacional', 'https://www.paralympic.org/'],
]

/**
 * Link da referência, tanto da lista de fontes ("Mah CD, Mah KE… Sleep, 2011.") quanto da citação
 * curta do quadro da ciência ("Mah CD et al. Sleep, 2011."): as duas levam ao mesmo estudo.
 */
export function linkDaFonte(texto: string): string | null {
  const instituicao = INSTITUICOES.find(([nome]) => texto.startsWith(nome))
  if (instituicao) return instituicao[1]
  // O sobrenome pode vir com partícula: "van Dyk N", "Van Cutsem J".
  const autor = texto.match(/^(?:[Vv]an )?[^\s,]+/)?.[0]
  const ano = texto.match(/(\d{4})\.?\s*$/)?.[1]
  return (autor && ano && ESTUDOS[`${autor} ${ano}`]) || null
}
