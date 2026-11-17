// O jogador da ficha do Overall, em pixel art (16 × 20). A camisa e o short usam a cor da faixa do overall:
// J = camisa, S = short (um tom mais escuro), K = contorno, Q = pele, W = branco (número, meias, tênis).
export const JOGADOR: string[] = [
  '................',
  '.....KKKKKK.....',
  '....KKKKKKKK....',
  '....KQQQQQQK....',
  '....KQKQQKQK....',
  '....KQQQQQQK....',
  '.....KQQQQK.....',
  '......KQQK......',
  '...KKKJJJJKKK...',
  '..KQKJJWWJJKQK..',
  '..KQKJJWWJJKQK..',
  '..KQKJJJJJJKQK..',
  '...K.KJJJJK.K...',
  '....KSSSSSSK....',
  '....KSSSSSSK....',
  '....KQK..KQK....',
  '....KQK..KQK....',
  '....KWK..KWK....',
  '...KWWK..KWWK...',
  '...KKKK..KKKK...',
]

const FIXAS: Record<string, string> = { K: '#1b1209', Q: '#ffc27a', W: '#fff7e0' }

/** Escurece uma cor #rrggbb (fator 0–1 do brilho que fica). */
export function escurecer(hex: string, fator: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * fator))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function retangulos(cor: string) {
  const cores: Record<string, string> = { ...FIXAS, J: cor, S: escurecer(cor, 0.6) }
  const itens: { x: number; y: number; w: number; cor: string }[] = []
  JOGADOR.forEach((linha, y) => {
    let x = 0
    while (x < linha.length) {
      const letra = linha[x]
      let fim = x
      while (fim + 1 < linha.length && linha[fim + 1] === letra) fim++
      if (cores[letra]) itens.push({ x, y, w: fim - x + 1, cor: cores[letra] })
      x = fim + 1
    }
  })
  return itens
}

export default function JogadorPixel({ cor }: { cor: string }) {
  return (
    <svg className="jogador-pixel" viewBox="0 0 16 20" shapeRendering="crispEdges" aria-hidden>
      {retangulos(cor).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.cor} />
      ))}
    </svg>
  )
}
