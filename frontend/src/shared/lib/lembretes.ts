import type { Config, DiaSemana } from '../types'

const CHAVE_ULTIMO = 'bp.lembrete.ultimo'

export const suportaNotificacoes = () => typeof window !== 'undefined' && 'Notification' in window

export async function pedirPermissao() {
  if (!suportaNotificacoes()) return 'denied' as NotificationPermission
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Mostra uma notificação; pelo service worker quando houver (funciona melhor no celular). */
export async function notificar(titulo: string, corpo: string) {
  if (!suportaNotificacoes() || Notification.permission !== 'granted') return false
  const opcoes: NotificationOptions = { body: corpo, icon: '/icon.svg', badge: '/icon.svg', tag: 'bp-lembrete' }
  try {
    const registro = await navigator.serviceWorker?.getRegistration()
    if (registro) {
      await registro.showNotification(titulo, opcoes)
      return true
    }
  } catch {
    // cai no Notification direto
  }
  new Notification(titulo, opcoes)
  return true
}

/** Próximo horário de lembrete a partir de `agora`, ou null se não houver dia marcado. */
export function proximoLembrete(lembretes: Config['lembretes'], agora = new Date()) {
  if (!lembretes.ativo || lembretes.dias.length === 0) return null
  const [hora, minuto] = lembretes.horario.split(':').map(Number)
  for (let i = 0; i < 8; i++) {
    const quando = new Date(agora)
    quando.setDate(agora.getDate() + i)
    quando.setHours(hora, minuto, 0, 0)
    if (quando > agora && lembretes.dias.includes(quando.getDay() as DiaSemana)) return quando
  }
  return null
}

/** Evita lembrar duas vezes no mesmo dia (várias abas abertas, recarregar a página). */
export function marcarLembrado(dia: string) {
  try {
    if (localStorage.getItem(CHAVE_ULTIMO) === dia) return false
    localStorage.setItem(CHAVE_ULTIMO, dia)
  } catch {
    // sem armazenamento: pode repetir, mas não deixa de lembrar
  }
  return true
}
