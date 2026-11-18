import { FUNDO, LADO_SPRITE, PALETA, SPRITES } from './spritesConquistas'

/** Quadrados da mesma cor lado a lado, juntos num retângulo só: poucos elementos por ícone. */
function retangulos(grade: string[]) {
  const itens: { x: number; y: number; w: number; cor: string }[] = []
  grade.forEach((linha, y) => {
    let x = 0
    while (x < linha.length) {
      const letra = linha[x]
      let fim = x
      while (fim + 1 < linha.length && linha[fim + 1] === letra) fim++
      if (letra !== '.' && PALETA[letra]) itens.push({ x, y, w: fim - x + 1, cor: PALETA[letra] })
      x = fim + 1
    }
  })
  return itens
}

const cache = new Map<string, ReturnType<typeof retangulos>>()

export const temSprite = (id: string) => id in SPRITES
export const fundoDaConquista = (id: string) => FUNDO[id] ?? '#3a3a3a'

/** O ícone colorido (pixel art 16 × 16) de uma conquista desbloqueada. */
export default function IconeConquista({ id }: { id: string }) {
  let itens = cache.get(id)
  if (!itens) {
    itens = retangulos(SPRITES[id] ?? [])
    cache.set(id, itens)
  }
  return (
    <svg className="conquista-sprite" viewBox={`0 0 ${LADO_SPRITE} ${LADO_SPRITE}`} shapeRendering="crispEdges" aria-hidden>
      {itens.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.cor} />
      ))}
    </svg>
  )
}
