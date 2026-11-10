import { useEffect, useMemo, useRef } from 'react'
import { menosMovimento } from '../lib/movimento'
import { Atleta, Bola, novaBola, novoAtleta } from './Atleta'
import { pintar, posicionar } from './desenho'
import { instante, preparar, type Coreografia } from './motor'

/** Só o atleta repetindo um movimento, sem controles: decoração (tela de entrada). */
export default function Manequim({ coreografia, viewBox, velocidade = 0.7 }: { coreografia: Coreografia; viewBox: string; velocidade?: number }) {
  const anim = useMemo(() => preparar(coreografia), [coreografia])
  const atleta = useRef(novoAtleta())
  const bola = useRef(novaBola())

  useEffect(() => {
    const desenhar = (t: number) => {
      const agora = instante(anim, t)
      pintar(anim, agora, atleta.current.partes)
      posicionar(bola.current, agora.bola, agora.solo)
    }
    // Sem animação (ou para quem prefere menos movimento), fica parado numa pose de arremesso.
    const parado = typeof requestAnimationFrame !== 'function' || menosMovimento()
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
      <Atleta els={atleta} frente={anim.frente} />
      <Bola els={bola} />
    </svg>
  )
}
