import { useEffect } from 'react'

/**
 * Mantém a tela acesa enquanto `ativo` for true (Wake Lock API).
 * O navegador solta o bloqueio quando a aba fica oculta; ele é pedido de novo ao voltar.
 */
export function useTelaLigada(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return
    let bloqueio: WakeLockSentinel | null = null
    let cancelado = false

    const pedir = async () => {
      try {
        const novo = await navigator.wakeLock.request('screen')
        if (cancelado) void novo.release()
        else bloqueio = novo
      } catch {
        // negado (ex.: modo economia de bateria): segue sem bloqueio
      }
    }
    const aoVoltar = () => document.visibilityState === 'visible' && void pedir()

    void pedir()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      void bloqueio?.release()
    }
  }, [ativo])
}

export const suportaTelaLigada = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator
