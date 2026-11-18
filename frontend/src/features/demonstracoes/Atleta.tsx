import type { MutableRefObject } from 'react'
import { PECAS, type ElementosBola } from './desenho'
import { RAIO_BOLA } from './motor'

export interface ElementosAtleta {
  partes: Record<string, SVGPathElement | null>
  sombra: SVGEllipseElement | null
}

export const novoAtleta = (): ElementosAtleta => ({ partes: {}, sombra: null })
export const novaBola = (): ElementosBola => ({ bola: null, sombra: null })

/** O atleta da demonstração: sombra no chão e as peças do corpo, que `pintar` move a cada quadro. */
export function Atleta({ els, frente }: { els: MutableRefObject<ElementosAtleta>; frente: boolean }) {
  return (
    <>
      <ellipse ref={(el) => { els.current.sombra = el }} className="demo-sombra" rx="0" ry="3.5" />
      <g className="demo-corpo demo-atleta">
        {PECAS.map((p) => (
          <path
            key={p.id}
            ref={(el) => { els.current.partes[p.id] = el }}
            className={`demo-${p.material} demo-${frente ? 'perto' : p.lado}`}
          />
        ))}
      </g>
    </>
  )
}

/** Sombra da bola no chão; fica antes do corpo, para o atleta passar por cima dela. */
export function SombraBola({ els }: { els: MutableRefObject<ElementosBola> }) {
  return <ellipse ref={(el) => { els.current.sombra = el }} className="demo-sombra" rx={RAIO_BOLA} ry="2.2" visibility="hidden" />
}

/** Bola com os gomos, para dar para ver o giro. */
export function Bola({ els }: { els: MutableRefObject<ElementosBola> }) {
  const r = RAIO_BOLA
  return (
    <g ref={(el) => { els.current.bola = el }} visibility="hidden">
      <circle r={r} className="demo-bola" />
      <path
        className="demo-bola-gomo"
        d={`M${-r} 0H${r}M0 ${-r}V${r}M${-r * 0.72} ${-r * 0.7}Q${-r * 0.2} 0 ${-r * 0.72} ${r * 0.7}M${r * 0.72} ${-r * 0.7}Q${r * 0.2} 0 ${r * 0.72} ${r * 0.7}`}
      />
    </g>
  )
}
