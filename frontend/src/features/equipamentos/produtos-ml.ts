// Os links de afiliado do Mercado Livre, gerados no Gerador de links do Programa de Afiliados (conferidos em 21/11/2026).
// Só entra na prateleira a bola que tem produto de loja brasileira no Mercado Livre; time ou modelo sem link não aparece.
// Quando faltar bola, procurar o anúncio, gerar o link no gerador e acrescentar aqui.

export interface ProdutoTime {
  /** Link de afiliado do produto. */
  link: string
  /** A linha da Wilson que o Mercado Livre vende para esse time. */
  linha: 'Team Tribute' | 'Team Alliance'
}

/** Bolas de time (chave: sigla). */
export const PRODUTOS_TIMES: Record<string, ProdutoTime> = {
  BOS: { link: 'https://meli.la/28iQEpB', linha: 'Team Tribute' },
  CHI: { link: 'https://meli.la/14wWsF3', linha: 'Team Tribute' },
  GSW: { link: 'https://meli.la/12rViYo', linha: 'Team Tribute' },
  HOU: { link: 'https://meli.la/18Aom3U', linha: 'Team Tribute' },
  LAC: { link: 'https://meli.la/1MSpKDZ', linha: 'Team Tribute' },
  LAL: { link: 'https://meli.la/1g6H7av', linha: 'Team Tribute' },
  MIA: { link: 'https://meli.la/1jSFwV3', linha: 'Team Tribute' },
  PHI: { link: 'https://meli.la/24jMTvA', linha: 'Team Tribute' },
  MIL: { link: 'https://meli.la/1BLhVMj', linha: 'Team Alliance' },
}

/** Bolas de marca (chave: id em MARCAS). */
export const LINKS_MARCAS: Record<string, string> = {
  'wilson-evolution': 'https://meli.la/1Bos5Ww',
  'wilson-authentic': 'https://meli.la/27Ek3c8',
  'wilson-drv': 'https://meli.la/1mM8szi',
  'wilson-all-team-retro': 'https://meli.la/1prk5BM',
  'spalding-tf1000': 'https://meli.la/1F9WjMk',
  'spalding-tf250': 'https://meli.la/2VXP9Lz',
  'spalding-street': 'https://meli.la/1TB6Mg6',
  'molten-bg4500': 'https://meli.la/1xkbdVf',
}
