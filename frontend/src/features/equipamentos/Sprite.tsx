import { SPRITES, type Sprite as NomeSprite } from './sprites'

const CONTORNO = '#141414'
const BRANCO = '#F4F2EA'

/** Escurece uma cor #rrggbb (a sombra das joelheiras, o forro do capuz). */
function escurecer(hex: string, fator = 0.72) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.round(v * fator).toString(16).padStart(2, '0')
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`
}

/**
 * Roupa ou acessório em pixel art (16 × 16 blocos), nas cores do produto. Cada linha vira poucos retângulos:
 * blocos iguais lado a lado se juntam, e o desenho fica nítido em qualquer tamanho.
 */
export default function Sprite({ nome, cor, destaque, logo }: { nome: NomeSprite; cor: string; destaque: string; logo?: string }) {
  const tinta: Record<string, string> = { o: CONTORNO, a: cor, b: destaque, d: escurecer(cor), w: BRANCO }
  const blocos: { x: number; y: number; w: number; c: string }[] = []
  SPRITES[nome].forEach((linha, y) => {
    let x = 0
    while (x < linha.length) {
      const letra = linha[x]
      let fim = x + 1
      while (linha[fim] === letra) fim++
      if (tinta[letra]) blocos.push({ x, y, w: fim - x, c: tinta[letra] })
      x = fim
    }
  })

  return (
    <svg className="produto-sprite" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden focusable="false">
      {blocos.map((b) => <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={b.w} height={1} fill={b.c} />)}
      {/* O logo do time no peito da regata. */}
      {logo && <image href={logo} x={4.5} y={6} width={7} height={6.5} preserveAspectRatio="xMidYMid meet" />}
    </svg>
  )
}
