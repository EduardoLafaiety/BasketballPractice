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
