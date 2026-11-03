import { useId } from 'react'

// Bola com volume, desenhada nas cores do produto: sombra no chão, couro com textura de gomos,
// brilho, borda escurecida e o nome impresso no painel. Não usa logos nem fotos da Amazon.

/** Mistura a cor com branco (quanto > 0) ou preto (quanto < 0). */
function tom(hex: string, quanto: number) {
  const n = parseInt(hex.slice(1), 16)
  const alvo = quanto > 0 ? 255 : 0
  const canal = (c: number) => Math.round(c + (alvo - c) * Math.abs(quanto))
  const r = canal(n >> 16), g = canal((n >> 8) & 255), b = canal(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export default function Bola({ cor, costura, nome }: { cor: string; costura: string; nome: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const url = (s: string) => `url(#${s}${id})`

  return (
    <svg className="bola-desenho" viewBox="0 0 120 126" width="132" height="139" aria-hidden>
      <defs>
        <radialGradient id={`couro${id}`} cx=".36" cy=".3" r=".78">
          <stop offset="0" stopColor={tom(cor, 0.38)} />
          <stop offset=".55" stopColor={cor} />
          <stop offset="1" stopColor={tom(cor, -0.55)} />
        </radialGradient>
        <radialGradient id={`borda${id}`} cx=".5" cy=".5" r=".5">
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".38" />
        </radialGradient>
        <pattern id={`gomos${id}`} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
          <circle cx="1.3" cy="1.3" r=".55" fill="#000" fillOpacity=".16" />
        </pattern>
        <filter id={`desfoque${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <clipPath id={`recorte${id}`}>
          <circle cx="60" cy="60" r="52" />
        </clipPath>
        {/* Linha levemente curva do painel onde o nome é impresso, seguindo a curva da bola. */}
        <path id={`painel${id}`} d="M38 53 Q60 47 84 52" />
      </defs>

      <ellipse cx="60" cy="118" rx="36" ry="4.5" fill="#000" opacity=".22" filter={url('desfoque')} />

      <g clipPath={url('recorte')}>
        <circle cx="60" cy="60" r="52" fill={url('couro')} />
        <circle cx="60" cy="60" r="52" fill={url('gomos')} />
        <text className="bola-nome" fill={costura} fontSize="13">
          <textPath href={`#painel${id}`} startOffset="50%" textAnchor="middle" textLength={Math.min(44, nome.length * 7.5)} lengthAdjust="spacingAndGlyphs">
            {nome.toUpperCase()}
          </textPath>
        </text>
        <g fill="none" stroke="#141414" strokeOpacity=".88" strokeWidth="2.6" strokeLinecap="round">
          <path d="M6 63 Q60 79 114 63" />
          <path d="M42 8 C27 40 27 80 42 112" />
          <path d="M97 21 C80 44 80 80 97 101" />
          <path d="M13 33 C21 50 21 76 13 90" />
        </g>
        <circle cx="60" cy="60" r="52" fill={url('borda')} />
        <ellipse cx="42" cy="30" rx="15" ry="9" fill="#fff" opacity=".32" transform="rotate(-28 42 30)" filter={url('desfoque')} />
      </g>
    </svg>
  )
}
