// Escudos dos times no CDN da ESPN, que usa a sigla dela em minúsculas (GS, SA, NY, UTAH…).
// O "combiner" já entrega a imagem pequena (56 px, nítida em tela retina).

export interface Escudos {
  /** Versão para fundo claro. */
  escudo: string
  /** Versão para fundo escuro. */
  escudoEscuro: string
}

const url = (siglaEspn: string, variante: '500' | '500-dark') =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/${variante}/${siglaEspn.toLowerCase()}.png&h=56&w=56`

export const escudos = (siglaEspn: string): Escudos => ({ escudo: url(siglaEspn, '500'), escudoEscuro: url(siglaEspn, '500-dark') })
