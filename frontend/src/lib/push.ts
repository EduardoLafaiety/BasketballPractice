import { request } from '../api'

// Web Push: com o navegador inscrito, o lembrete chega mesmo com o site fechado (o servidor manda na hora certa).

export const suportaPush = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** Chave VAPID em base64url para o formato que o PushManager pede. */
export function chaveParaBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export const configPush = () => request<{ enabled: boolean; publicKey: string | null }>('GET', '/push/config')

async function registro() {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) throw new Error('Abra o site publicado (ou instale o app) para receber notificações com ele fechado.')
  return reg
}

export async function inscricaoAtual() {
  if (!suportaPush()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Pede a permissão (se preciso), inscreve este navegador e manda a inscrição para a API. */
export async function ativarPush() {
  const { enabled, publicKey } = await configPush()
  if (!enabled || !publicKey) throw new Error('As notificações com o app fechado ainda não foram ligadas neste servidor.')
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('As notificações estão bloqueadas para este site. Libere nas configurações do navegador.')
  const reg = await registro()
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(publicKey) }))
  const { endpoint, keys } = inscricao.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await request('POST', '/push/subscriptions', { endpoint, keys, tzOffset: new Date().getTimezoneOffset() })
}

export async function desativarPush() {
  const inscricao = await inscricaoAtual()
  if (!inscricao) return
  await request('DELETE', '/push/subscriptions', { endpoint: inscricao.endpoint }).catch(() => undefined)
  await inscricao.unsubscribe()
}

export const testarPush = () => request<{ sent: number }>('POST', '/push/test')
