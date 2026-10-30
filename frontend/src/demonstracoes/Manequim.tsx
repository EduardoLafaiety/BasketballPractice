import { useEffect, useMemo, useRef } from 'react'
import { PARTES, pintar, posicionar } from './desenho'
import { instante, preparar, RAIO_BOLA, type Coreografia } from './motor'

/** Só o manequim repetindo um movimento, sem controles: decoração (tela de entrada). */
export default function Manequim({ coreografia, viewBox, velocidade = 0.7 }: { coreografia: Coreografia; viewBox: string; velocidade?: number }) {
  const anim = useMemo(() => preparar(coreografia), [coreografia])
  const partes = useRef<Record<string, SVGPathElement | null>>({})
  const bola = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const desenhar = (t: number) => {
      const agora = instante(anim, t)
      pintar(anim, agora, partes.current)
      posicionar(bola.current, agora.bola)
    }
    // Sem animação (ou para quem prefere menos movimento), fica parado numa pose de arremesso.
    const parado = typeof requestAnimationFrame !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (parado) {
      desenhar(anim.inicioFase.at(-1) ?? 0)
      return
    }
    let t = 0
    let ultimo: number | null = null
    let quadro = requestAnimationFrame(function passo(agora) {
      t = (t + (ultimo === null ? 0 : Math.min(50, agora - ultimo)) * velocidade) % anim.total
      ultimo = agora
      desenhar(t)
      quadro = requestAnimationFrame(passo)
    })
    return () => cancelAnimationFrame(quadro)
  }, [anim, velocidade])

  return (
    <svg className="manequim" viewBox={viewBox} aria-hidden="true" focusable="false">
      <g className="demo-corpo">
        {PARTES.map((p) => (
          <path key={p.id} ref={(el) => { partes.current[p.id] = el }} className={`demo-${p.lado}`} />
        ))}
      </g>
      <circle ref={bola} r={RAIO_BOLA} className="demo-bola" />
    </svg>
  )
}
