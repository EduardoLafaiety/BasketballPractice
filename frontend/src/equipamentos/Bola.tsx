import { useMemo, useState } from 'react'
import { CANAL_DO_MEIO, LADO, bolaModeloPng } from '../components/bolaPixel'
import { ICONES_TIMES, type IconeTime } from './icones-times'

// Bola em pixel art, réplica da bola de verdade vista de frente, como na foto do produto: a marca na faixa
// de cima, o logo do time (ou o nome do modelo) na faixa de baixo, e os canais na cor de destaque. O sprite
// das faixas é desenhado aqui; o logo vem pequeno do mesmo lugar dos escudos da aba NBA e é ampliado em
// blocos. Não usa fotos da Amazon.

/** Luminância relativa (WCAG) de uma cor #rrggbb. */
function luminancia(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}

/** Faixa escura pede o logo na versão para fundo escuro. */
export const ehEscura = (cor: string) => luminancia(cor) < 0.25
/** Tinta preta, como nas bolas de verdade, a não ser onde ela sumiria (faixa preta, couro escuro). */
const tinta = (fundo: string) => ((luminancia(fundo) + 0.05) / (luminancia('#141414') + 0.05) >= 3 ? '#141414' : '#F4F2EA')

// O sprite (40 × 40, raio 19) ocupa o círculo de centro (60, 60) e raio 52 do desenho.
const ESCALA = 52 / 19
const DESLOCA = 60 - (LADO / 2) * ESCALA
/** Linha do desenho onde passa o canal do meio: a marca fica acima, o logo abaixo. */
const MEIO = DESLOCA + CANAL_DO_MEIO * ESCALA
/** Lado do logo no desenho. Na tela são 44 px: o dobro dos 22 px pedidos, para cada ponto virar um bloco 2 × 2. */
const LOGO = 30
export const LADO_DO_LOGO = 22

interface Props {
  /** Cor da faixa do logo (e da calota de cima) e da faixa da marca (e da calota de baixo). */
  frente: string
  faixa: string
  canal: string
  /** O que vem impresso na faixa de cima: a marca da bola. */
  marca: string
  /** Bola de time: endereço do logo (para fundo claro e para fundo escuro) e o ícone que entra se ele não carregar. */
  logo?: { claro: string; escuro: string }
  icone?: IconeTime
  /** Bola de marca: o nome do modelo, no lugar do logo. */
  modelo?: string
  canalLargo?: boolean
  faixaClara?: string
  grao?: boolean
}

export default function Bola({ frente, faixa, canal, marca, logo, icone, modelo, canalLargo, faixaClara, grao }: Props) {
  const [semLogo, setSemLogo] = useState(false)
  // Uma imagem por modelo (e não centenas de retângulos de SVG por bola): a lista tem uma bola por time.
  const sprite = useMemo(
    () => bolaModeloPng({ gomos: [frente, faixa], costura: canal, canalLargo, faixa: faixaClara, grao }),
    [frente, faixa, canal, canalLargo, faixaClara, grao],
  )
  const centroDoLogo = MEIO + 2 + LOGO / 2

  return (
    <svg className="bola-desenho" viewBox="0 0 120 126" width="176" height="185" aria-hidden>
      {/* Sombra no chão, em degraus. */}
      <path d="M30 114h60v3h-60zM24 117h72v3h-72zM30 120h60v3h-60z" fill="#000" opacity=".2" />

      <image href={sprite} x={DESLOCA} y={DESLOCA} width={LADO * ESCALA} height={LADO * ESCALA} style={{ imageRendering: 'pixelated' }} />

      <text className="bola-nome" x="60" y={MEIO - 8} textAnchor="middle" fill={tinta(faixa)} fontSize="19" textLength={Math.min(64, marca.length * 9.5)} lengthAdjust="spacingAndGlyphs">
        {marca}
      </text>

      {logo && !semLogo && (
        <image
          className="bola-logo"
          href={ehEscura(frente) ? logo.escuro : logo.claro}
          x={60 - LOGO / 2}
          y={centroDoLogo - LOGO / 2}
          width={LOGO}
          height={LOGO}
          style={{ imageRendering: 'pixelated' }}
          onError={() => setSemLogo(true)}
        />
      )}
      {logo && semLogo && icone && (
        <g transform={`translate(${60 - 13} ${centroDoLogo - 13}) scale(1.1)`} color={tinta(frente)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
          {ICONES_TIMES[icone]}
        </g>
      )}
      {modelo && (
        <text className="bola-nome" x="60" y={centroDoLogo + 4} textAnchor="middle" fill={tinta(frente)} fontSize="13" textLength={Math.min(52, modelo.length * 7)} lengthAdjust="spacingAndGlyphs">
          {modelo}
        </text>
      )}
    </svg>
  )
}
