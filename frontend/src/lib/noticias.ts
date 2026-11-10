/** Disparado pelo painel admin para a barra mostrar a mudança na hora, sem esperar a próxima atualização. */
export const NOTICIAS_MUDARAM = 'bp:noticias-mudaram'

/** Há quanto tempo a notícia saiu: importante porque as automáticas chegam com horas de atraso. */
export function tempoAtras(iso: string, agora = Date.now()) {
  const minutos = Math.floor((agora - Date.parse(iso)) / 60_000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

export type Assunto = 'lesao' | 'mercado' | 'selecao' | 'wnba' | 'nbb' | 'nba' | 'basquete'

export const ROTULO_ASSUNTO: Record<Assunto, string> = {
  lesao: 'Lesão',
  mercado: 'Mercado',
  selecao: 'Seleção',
  wnba: 'WNBA',
  nbb: 'NBB',
  nba: 'NBA',
  basquete: 'Basquete',
}

const TIMES_NBA =
  'hawks|celtics|nets|hornets|bulls|cavaliers|cavs|mavericks|mavs|nuggets|pistons|warriors|rockets|pacers|clippers|lakers|grizzlies|heat|bucks|' +
  'timberwolves|wolves|pelicans|knicks|thunder|magic|76ers|sixers|suns|blazers|kings|spurs|raptors|jazz|wizards'
const TIMES_NBB = 'flamengo|franca|minas|paulistano|pinheiros|bauru|corinthians|unifacisa|brasília|botafogo|vasco|mogi|caxias|fortaleza|cearense'

// A ordem importa: uma troca no Lakers é "Mercado", não só "NBA"; um jogo do NBB é "NBB".
const REGRAS: [Assunto, RegExp][] = [
  ['lesao', /(lesão|lesões|lesionad|machuc|cirurgia|fratura|entorse|ruptura|desfalque)/i],
  ['mercado', /(troca|trocad|contrat|extensão|renova|assina|acerta|acordo|milhões|free agen|agente livre|dispensad|draft)/i],
  ['selecao', /(seleção|fiba|copa do mundo|olimp|pan-americano|americup)/i],
  ['wnba', /\bwnba\b/i],
  ['nbb', new RegExp(`\\b(nbb|lnb|liga nacional|${TIMES_NBB})\\b`, 'i')],
  ['nba', new RegExp(`\\b(nba|${TIMES_NBA})\\b`, 'i')],
]

/** Assunto da manchete, pelas palavras do título: vira a etiqueta colorida da barra. */
export function assuntoDa(titulo: string): Assunto {
  return REGRAS.find(([, re]) => re.test(titulo))?.[0] ?? 'basquete'
}
