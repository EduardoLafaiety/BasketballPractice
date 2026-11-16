import { useMemo } from 'react'
import { LADO, bolaModeloPng, type ModeloBola } from '../components/bolaPixel'
import { ICONES_TIMES, type IconeTime } from './icones-times'

// Bola em pixel art, redesenhada a partir do modelo de verdade: as bolas de time têm os gomos alternados nas
// duas cores do time (como a Wilson NBA Team Tribute), as Molten têm a faixa clara ao longo das costuras, as
// de rua têm o canal largo e as de couro, o grão. Nome e símbolo vão impressos no gomo da frente. Não usa
// logos nem fotos da Amazon.

/** Luminância relativa (WCAG) de uma cor #rrggbb. */
function luminancia(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}

/** A cor do que vai impresso: a secundária do time, ou branco/preto quando ela some na bola. */
function tinta(cor: string, costura: string) {
  const [a, b] = [luminancia(cor), luminancia(costura)].sort((x, y) => y - x)
  if ((a + 0.05) / (b + 0.05) >= 3) return costura
  return luminancia(cor) > 0.3 ? '#111111' : '#FFFFFF'
}

const ESCURA = '#141414'
const CANAIS = [ESCURA, '#f4f2ea', '#8c8c8c']
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
/** A cor do canal que aparece nos dois gomos: preto, a não ser que um deles já seja quase preto. */
export function corDoCanal(gomos: readonly [string, string]) {
  const pior = (canal: string) => Math.min(contraste(canal, gomos[0]), contraste(canal, gomos[1]))
  return CANAIS.find((c) => pior(c) >= 1.6) ?? [...CANAIS].sort((a, b) => pior(b) - pior(a))[0]
}

// O sprite (40 × 40, raio 19) ocupa o círculo de centro (60, 60) e raio 52 do desenho.
const ESCALA = 52 / 19
const DESLOCA = 60 - (LADO / 2) * ESCALA

interface Props {
  /** Cor principal e segunda cor: nas bolas de time, os gomos se alternam entre as duas. */
  cor: string
  costura: string
  nome: string
  icone?: IconeTime
  /** Bola de time: gomos alternados em duas cores. */
  duasCores?: boolean
  canalLargo?: boolean
  faixa?: string
  grao?: boolean
}

export default function Bola({ cor, costura, nome, icone, duasCores, canalLargo, faixa, grao }: Props) {
  const impressao = tinta(cor, costura)
  // Uma imagem por modelo (e não centenas de retângulos de SVG por bola): a lista tem uma bola por time.
  const sprite = useMemo(() => {
    const gomos = [cor, duasCores ? costura : cor] as const
    const modelo: ModeloBola = { gomos, costura: duasCores ? corDoCanal(gomos) : costura, canalLargo, faixa, grao }
    return bolaModeloPng(modelo)
  }, [cor, costura, duasCores, canalLargo, faixa, grao])

  return (
    <svg className="bola-desenho" viewBox="0 0 120 126" width="132" height="139" aria-hidden>
      {/* Sombra no chão, em degraus. */}
      <path d="M30 114h60v3h-60zM24 117h72v3h-72zM30 120h60v3h-60z" fill="#000" opacity=".2" />

      <image href={sprite} x={DESLOCA} y={DESLOCA} width={LADO * ESCALA} height={LADO * ESCALA} style={{ imageRendering: 'pixelated' }} />

      {icone && (
        <g transform="translate(44 15) scale(1.3)" color={impressao} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
          {ICONES_TIMES[icone]}
        </g>
      )}
      <text
        className="bola-nome"
        x="60"
        y={icone ? 54 : 52}
        textAnchor="middle"
        fill={impressao}
        fontSize={icone ? 12 : 15}
        textLength={Math.min(icone ? 38 : 44, nome.length * (icone ? 6 : 7.5))}
        lengthAdjust="spacingAndGlyphs"
      >
        {nome.toUpperCase()}
      </text>
    </svg>
  )
}
