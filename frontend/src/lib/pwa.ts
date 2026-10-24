import { useEffect, useState } from 'react'

// O evento de instalação chega uma vez, cedo; guardamos para o botão "Instalar" usar depois.
interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let pedido: EventoInstalar | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

export function iniciarPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pedido = e as EventoInstalar
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    pedido = null
    avisar()
  })

  // Só em produção: em dev o cache do service worker atrapalharia o recarregamento do Vite.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker não registrado', e))
    })
  }
}

export function usePodeInstalar() {
  const [pode, setPode] = useState(pedido !== null)
  useEffect(() => {
    const atualizar = () => setPode(pedido !== null)
    ouvintes.add(atualizar)
    atualizar()
    return () => {
      ouvintes.delete(atualizar)
    }
  }, [])
  return pode
}

export async function instalar() {
  if (!pedido) return false
  await pedido.prompt()
  const { outcome } = await pedido.userChoice
  pedido = null
  avisar()
  return outcome === 'accepted'
}

export const rodandoComoApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
