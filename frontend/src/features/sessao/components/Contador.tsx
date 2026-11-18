import { useState } from 'react'
import Icone from '../../../shared/ui/Icone'
import Quadra, { NOME_ZONA } from './Quadra'

import type { EstadoContador } from '../model/usarContador'
export { useContador, zonasParaLista } from '../model/usarContador'
export type { EstadoContador } from '../model/usarContador'
export type { Toque } from '../model/contador'
const ULTIMAS = 10

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

      {tentativas > 0 && (
        <ol className="contador-ultimas" aria-label={`Últimas ${contador.ultimas.length} tentativas: ${contador.ultimas.filter(Boolean).length} acertos`}>
          {Array.from({ length: ULTIMAS }, (_, i) => {
            const t = contador.ultimas[i]
            return <li key={i} className={t === undefined ? '' : t ? 'acerto' : 'erro'} />
          })}
        </ol>
      )}

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
