import { useMemo } from 'react'
import { LADO, bolaPng } from '../components/bolaPixel'
import { ICONES_TIMES, type IconeTime } from './icones-times'

// Bola em pixel art (o mesmo sprite da abertura), pintada nas cores do produto, com sombra no chão e o
// nome impresso por cima. Não usa logos nem fotos da Amazon.

/** Mistura a cor com branco (quanto > 0) ou preto (quanto < 0). */
function tom(hex: string, quanto: number) {
  const n = parseInt(hex.slice(1), 16)
  const alvo = quanto > 0 ? 255 : 0
  const canal = (c: number) => Math.round(c + (alvo - c) * Math.abs(quanto))
  const r = canal(n >> 16), g = canal((n >> 8) & 255), b = canal(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

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

// Do brilho à sombra: os seis tons do couro, a partir da cor do produto.
const TONS = [0.5, 0.3, 0.12, 0, -0.28, -0.5]
// O sprite (40 × 40, raio 19) ocupa o círculo de centro (60, 60) e raio 52 do desenho.
const ESCALA = 52 / 19
const DESLOCA = 60 - (LADO / 2) * ESCALA

export default function Bola({ cor, costura, nome, icone }: { cor: string; costura: string; nome: string; icone?: IconeTime }) {
  const impressao = tinta(cor, costura)
  // Uma imagem por cor (e não centenas de retângulos de SVG por bola): a lista tem uma bola por time.
  const sprite = useMemo(() => bolaPng(TONS.map((t) => tom(cor, t)), '#141414'), [cor])

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
