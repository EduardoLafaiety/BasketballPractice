import { bolaPng } from './bolaPixel'

/** A mesma arte da bola principal, dimensionada para a marca. */
export default function LogoBola({ tamanho = 34, className = '' }: { tamanho?: number; className?: string }) {
  return <img className={`logo-bola ${className}`} src={bolaPng()} width={tamanho} height={tamanho} alt="" aria-hidden="true" style={{ width: tamanho, height: tamanho, imageRendering: 'pixelated', flexShrink: 0, objectFit: 'contain' }} />
}
