import { useCallback, useState } from 'react'
import { bipe, vibrar } from '../lib/audio'
import type { ArremessosZona, Zona } from '../types'
import Icone from './Icone'
import Quadra, { NOME_ZONA, type DadosZonas } from './Quadra'

interface Toque {
  acertou: boolean
  zona: Zona | null
}

/** Estado do contador ao vivo: tudo é recalculado a partir da lista de toques (desfazer é só tirar o último). */
export function useContador() {
  const [toques, setToques] = useState<Toque[]>([])
  const [zona, setZona] = useState<Zona | null>(null)

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
    acertos,
    tentativas: toques.length,
    sequenciaAtual,
    melhorSequencia,
    zonas,
    zona,
    setZona,
    registrar,
    desfazer: useCallback(() => setToques((atual) => atual.slice(0, -1)), []),
    zerar: useCallback(() => setToques([]), []),
  }
}

export type EstadoContador = ReturnType<typeof useContador>

export const zonasParaLista = (zonas: DadosZonas): ArremessosZona[] =>
  (Object.entries(zonas) as [Zona, { acertos: number; tentativas: number }][]).map(([zona, z]) => ({ zona, ...z }))

export default function Contador({ contador, comQuadra = true }: { contador: EstadoContador; comQuadra?: boolean }) {
  const [verQuadra, setVerQuadra] = useState(false)
  const { acertos, tentativas, sequenciaAtual, melhorSequencia } = contador
  const pct = tentativas ? Math.round((acertos / tentativas) * 100) : null

  return (
    <div className="contador">
      <div className="contador-placar" aria-live="polite">
        <div>
          <strong>{pct === null ? '–' : `${pct}%`}</strong>
          <span className="meta">{acertos}/{tentativas}</span>
        </div>
        <div>
          <strong>{sequenciaAtual}</strong>
          <span className="meta">seguidos</span>
        </div>
        <div>
          <strong>{melhorSequencia}</strong>
          <span className="meta">recorde da sessão</span>
        </div>
      </div>

      {comQuadra && (
        <>
          <button type="button" className="link botao-link" onClick={() => setVerQuadra((v) => !v)}>
            {verQuadra ? 'Esconder quadra' : 'Marcar a zona de cada arremesso'}
          </button>
          {verQuadra && (
            <>
              <Quadra
                modo="registro"
                dados={contador.zonas}
                selecionada={contador.zona}
                aoSelecionar={(z) => contador.setZona((atual) => (atual === z ? null : z))}
              />
              <p className="meta centro">
                {contador.zona ? `Zona: ${NOME_ZONA[contador.zona]}` : 'Toque numa zona; os próximos arremessos contam nela.'}
              </p>
            </>
          )}
        </>
      )}

      <div className="contador-botoes">
        <button type="button" className="btn contador-toque contador-toque-acerto" onClick={() => contador.registrar(true)}>
          <strong>{acertos}</strong>
          <span><Icone nome="check" tamanho={16} />Acertou</span>
        </button>
        <button type="button" className="btn contador-toque contador-toque-erro" onClick={() => contador.registrar(false)}>
          <strong>{tentativas - acertos}</strong>
          <span><Icone nome="xis" tamanho={16} />Errou</span>
        </button>
      </div>
      <div className="acoes contador-extra">
        <button type="button" className="chip" onClick={contador.desfazer} disabled={!tentativas}>
          Desfazer
        </button>
        <button
          type="button"
          className="chip"
          disabled={!tentativas}
          onClick={() => window.confirm('Zerar o contador?') && contador.zerar()}
        >
          Zerar
        </button>
      </div>
    </div>
  )
}
