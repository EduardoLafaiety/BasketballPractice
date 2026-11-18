import { useCallback, useState } from 'react'
import { bipe, vibrar } from '../../../shared/lib/audio'
import type { Zona } from '../../../shared/types'
import type { DadosZonas, Toque } from './contador'

/** Estado do contador ao vivo: tudo é recalculado a partir da lista de toques (desfazer é só tirar o último). */
// Quantas das últimas tentativas aparecem na fileira de bolinhas.
const ULTIMAS = 10

export function useContador(inicial?: { toques: Toque[]; zona: Zona | null }) {
  const [toques, setToques] = useState<Toque[]>(inicial?.toques ?? [])
  const [zona, setZona] = useState<Zona | null>(inicial?.zona ?? null)

  let acertos = 0
  let sequenciaAtual = 0
  let melhorSequencia = 0
  const zonas: DadosZonas = {}
  for (const t of toques) {
    if (t.acertou) {
      acertos++
      sequenciaAtual++
      melhorSequencia = Math.max(melhorSequencia, sequenciaAtual)
    } else {
      sequenciaAtual = 0
    }
    if (t.zona) {
      const z = (zonas[t.zona] ??= { acertos: 0, tentativas: 0 })
      z.tentativas++
      if (t.acertou) z.acertos++
    }
  }

  const registrar = useCallback(
    (acertou: boolean) => {
      setToques((atual) => [...atual, { acertou, zona }])
      // Retorno sem olhar para a tela: som agudo no acerto, grave no erro.
      bipe(acertou ? 1046 : 330, 90, 0.2)
      vibrar(acertou ? 30 : [20, 40, 20])
    },
    [zona],
  )

  return {
    toques,
    acertos,
    tentativas: toques.length,
    sequenciaAtual,
    melhorSequencia,
    zonas,
    zona,
    setZona,
    /** Acerto ou erro das últimas tentativas, da mais antiga para a mais nova. */
    ultimas: toques.slice(-ULTIMAS).map((t) => t.acertou),
    registrar,
    desfazer: useCallback(() => setToques((atual) => atual.slice(0, -1)), []),
    zerar: useCallback(() => setToques([]), []),
  }
}

export type EstadoContador = ReturnType<typeof useContador>

export { zonasParaLista } from './contador'

