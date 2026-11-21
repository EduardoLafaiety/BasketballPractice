// Fotos reais das bolas. Chave: a sigla do time (ATL, BOS...) ou o id da bola de marca (wilson-evolution...).
// Valor: o caminho de uma foto própria em public/equipamentos/ (ex.: '/equipamentos/wilson-evolution.webp')
// ou o endereço da imagem gerada pelo SiteStripe da Amazon (https://...). Sem foto, o site mostra o desenho da bola.
// Não copiar imagens da Amazon para o repositório: só o endereço que o SiteStripe fornece.
export const FOTOS: Record<string, string> = {}

/** O endereço da foto da bola, se houver. */
export const fotoDe = (id: string): string | undefined => FOTOS[id]
