// Peças paradas do visual de quadra (a bola da abertura, as linhas de fundo e a listra): ficam separadas das
// peças animadas de rolagem.tsx para a tela de entrada não carregar os bonecos e as coreografias.
import { forwardRef } from 'react'

/** A bola da abertura: o couro com as costuras. */
export const BolaCouro = forwardRef<SVGSVGElement>(function BolaCouro(_, ref) {
  return (
    <svg ref={ref} className="abertura-bola" viewBox="0 0 400 400" aria-hidden>
      <defs>
        <radialGradient id="couro-bola" cx=".36" cy=".3" r=".8">
          <stop offset="0" stopColor="#ff9a52" />
          <stop offset=".62" stopColor="#ee6210" />
          <stop offset="1" stopColor="#a83d05" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#couro-bola)" />
      <path className="bola-costura" d="M10 200h380M200 10v380M64 68c70 62 70 202 0 264M336 68c-70 62-70 202 0 264" />
    </svg>
  )
})

/** Linhas de quadra no fundo, no lugar das curvas de nível do estilo original. */
export function LinhasQuadra() {
  return (
    <svg className="linhas-quadra" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <circle cx="500" cy="310" r="110" />
      <circle cx="500" cy="310" r="245" />
      <rect x="-40" y="190" width="240" height="240" />
      <rect x="800" y="190" width="240" height="240" />
      <path d="M500 -20V640M-40 40C120 40 240 170 240 310S120 580-40 580M1040 40C880 40 760 170 760 310S880 580 1040 580" />
    </svg>
  )
}

/** Listra no topo da seção: uma fatia da bola, com as costuras esticadas na largura da tela. */
export function ListraBola() {
  return (
    <svg className="listra-bola" viewBox="0 120 400 160" preserveAspectRatio="none" aria-hidden>
      <path vectorEffect="non-scaling-stroke" d="M10 200h380M200 10v380M64 68c70 62 70 202 0 264M336 68c-70 62-70 202 0 264" />
    </svg>
  )
}
