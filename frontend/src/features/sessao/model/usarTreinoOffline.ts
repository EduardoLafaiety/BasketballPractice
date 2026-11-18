import { useEffect, useState } from 'react'
import { tokenAtual } from '../../../shared/api/backend'
import type { Drill } from '../../../shared/types'
import type { PlanoGuiado } from './sessao'
import { guardarTreinoOffline, lerTreinoOffline } from './treino-offline'
import { prepararArquivosOffline } from './preparar-offline'

export function useTreinoOffline(conta: string) {
  const [online, setOnline] = useState(navigator.onLine)
  const [pacote, setPacote] = useState(() => lerTreinoOffline(conta))
  const [preparando, setPreparando] = useState(false)
  const [erro, setErro] = useState('')
  useEffect(() => {
    let ativa = true
    const atualizar = () => { if (ativa) { setOnline(navigator.onLine); setPacote(lerTreinoOffline(conta)) } }
    window.addEventListener('online', atualizar); window.addEventListener('offline', atualizar); window.addEventListener('storage', atualizar)
    return () => { ativa = false; window.removeEventListener('online', atualizar); window.removeEventListener('offline', atualizar); window.removeEventListener('storage', atualizar) }
  }, [conta])
  async function preparar(plano: PlanoGuiado, drills: Drill[]) {
    if (preparando) return
    const token = tokenAtual()
    setPreparando(true); setErro('')
    try {
      await prepararArquivosOffline()
      if (tokenAtual() !== token) return
      setPacote(guardarTreinoOffline(conta, plano, drills))
    } catch (e) { if (tokenAtual() === token) setErro(e instanceof Error ? e.message : 'Não foi possível preparar o treino.') }
    finally { if (tokenAtual() === token) setPreparando(false) }
  }
  return { online, pacote, preparando, erro, preparar }
}
