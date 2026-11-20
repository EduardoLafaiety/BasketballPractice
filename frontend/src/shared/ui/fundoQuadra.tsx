// Peças paradas do visual de quadra (a bola da abertura, as linhas de fundo e a listra): ficam separadas das
// peças animadas de rolagem.tsx para a tela de entrada não carregar os bonecos e as coreografias.
import { forwardRef } from 'react'
import { bolaPng, LADO } from './bolaPixel'

/** Bola da PR 190: sprite original de 40 × 40 na paleta laranja escura. */
export const BolaCouro = forwardRef<HTMLImageElement>(function BolaCouro(_, ref) {
  return <img ref={ref} className="abertura-bola" src={bolaPng()} alt="" width={LADO} height={LADO} aria-hidden decoding="sync" />
})

/** Linhas de quadra no fundo, no lugar das curvas de nível do estilo original. */
export function LinhasQuadra() {
  return (
    <svg className="linhas-quadra" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <rect x="45" y="40" width="910" height="540" rx="3" />
      <path d="M500 40V580" />
      <circle cx="500" cy="310" r="80" />
      <rect x="45" y="220" width="180" height="180" />
      <rect x="775" y="220" width="180" height="180" />
      <circle cx="225" cy="310" r="60" />
      <circle cx="775" cy="310" r="60" />
      <path d="M45 75H125A245 245 0 0 1 125 545H45M955 75H875A245 245 0 0 0 875 545H955M80 275V345M920 275V345" />
      <circle cx="97" cy="310" r="8" />
      <circle cx="903" cy="310" r="8" />
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
