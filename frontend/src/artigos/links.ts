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
}

/** Instituições, pelo nome com que a referência começa. */
const INSTITUICOES: [string, string][] = [
  ['Naismith Memorial Basketball Hall of Fame', 'https://www.hoophall.com/'],
  ['FIBA', 'https://www.fiba.basketball/'],
  ['NBA', 'https://www.nba.com/history'],
  ['NCAA', 'https://www.ncaa.org/'],
  ['Confederação Brasileira de Basketball', 'https://www.cbb.com.br/'],
]

/**
 * Link da referência, tanto da lista de fontes ("Mah CD, Mah KE… Sleep, 2011.") quanto da citação
 * curta do quadro da ciência ("Mah CD et al. Sleep, 2011."): as duas levam ao mesmo estudo.
 */
export function linkDaFonte(texto: string): string | null {
  const instituicao = INSTITUICOES.find(([nome]) => texto.startsWith(nome))
  if (instituicao) return instituicao[1]
  const autor = texto.match(/^[^\s,]+/)?.[0]
  const ano = texto.match(/(\d{4})\.?\s*$/)?.[1]
  return (autor && ano && ESTUDOS[`${autor} ${ano}`]) || null
}
