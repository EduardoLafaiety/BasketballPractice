import { useId } from 'react'
import type { Zona } from '../types'

export type DadosZonas = Partial<Record<Zona, { acertos: number; tentativas: number }>>

// Meia-quadra em escala 1 unidade = 3 cm (500 × 470 ≈ 15 m × 14 m), tabela no topo.
// Lado "_e"/"_d" é a esquerda/direita de quem está de frente para a cesta.
const CESTA = { x: 250, y: 52 }
const RAIO_TRES = 237.5
const CANTO_TRES = 30 // distância da linha de três do canto até a lateral
const Y_FIM_CANTO = CESTA.y + Math.sqrt(RAIO_TRES ** 2 - (CESTA.x - CANTO_TRES) ** 2)

const DENTRO_DOS_TRES = `M${CANTO_TRES},0 L${CANTO_TRES},${Y_FIM_CANTO} A${RAIO_TRES},${RAIO_TRES} 0 0 0 ${500 - CANTO_TRES},${Y_FIM_CANTO} L${500 - CANTO_TRES},0 Z`

// Setores angulares a partir da cesta (0° = lateral direita, 90° = meio da quadra).
const SETORES: { sufixo: 'canto_d' | 'ala_d' | 'topo' | 'ala_e' | 'canto_e'; de: number; ate: number }[] = [
  { sufixo: 'canto_d', de: -60, ate: 20 },
  { sufixo: 'ala_d', de: 20, ate: 68 },
  { sufixo: 'topo', de: 68, ate: 112 },
  { sufixo: 'ala_e', de: 112, ate: 160 },
  { sufixo: 'canto_e', de: 160, ate: 240 },
]

function cunha(de: number, ate: number) {
  const pontos = [`${CESTA.x},${CESTA.y}`]
  for (let a = de; a <= ate; a += 4) {
    const rad = (a * Math.PI) / 180
    pontos.push(`${CESTA.x + 1000 * Math.cos(rad)},${CESTA.y + 1000 * Math.sin(rad)}`)
  }
  return pontos.join(' ')
}

export const NOME_ZONA: Record<Zona, string> = {
  garrafao: 'Garrafão',
  lance_livre: 'Lance livre',
  media_canto_e: 'Média — canto esquerdo',
  media_ala_e: 'Média — 45° esquerda',
  media_topo: 'Média — topo',
  media_ala_d: 'Média — 45° direita',
  media_canto_d: 'Média — canto direito',
  tres_canto_e: 'Três — canto esquerdo',
  tres_ala_e: 'Três — 45° esquerda',
  tres_topo: 'Três — topo',
  tres_ala_d: 'Três — 45° direita',
  tres_canto_d: 'Três — canto direito',
}

const ROTULO: Record<Zona, [number, number]> = {
  garrafao: [250, 115],
  lance_livre: [250, 196],
  media_canto_e: [100, 62],
  media_ala_e: [118, 190],
  media_topo: [250, 262],
  media_ala_d: [382, 190],
  media_canto_d: [400, 62],
  tres_canto_e: [15, 70],
  tres_ala_e: [62, 330],
  tres_topo: [250, 395],
  tres_ala_d: [438, 330],
  tres_canto_d: [485, 70],
}

/** Cor do mapa de calor: vermelho abaixo de 25%, verde acima de 65%. */
export function corAproveitamento(pct: number) {
  const t = Math.min(1, Math.max(0, (pct - 25) / 40))
  return `hsl(${Math.round(t * 120)} 70% 45%)`
}

interface Props {
  /** "registro": toque para escolher a zona; "mapa": mapa de calor do aproveitamento. */
  modo: 'registro' | 'mapa'
  dados: DadosZonas
  selecionada?: Zona | null
  aoSelecionar?: (zona: Zona) => void
  rotulo?: string
}

export default function Quadra({ modo, dados, selecionada, aoSelecionar, rotulo }: Props) {
  const id = useId().replace(/:/g, '')
  const interativa = modo === 'registro' && !!aoSelecionar

  const zona = (z: Zona, forma: JSX.Element) => {
    const d = dados[z]
    const pct = d && d.tentativas > 0 ? Math.round((d.acertos / d.tentativas) * 100) : null
    const cor =
      modo === 'mapa'
        ? pct === null
          ? 'var(--superficie-2)'
          : corAproveitamento(pct)
        : z === selecionada
          ? 'var(--laranja)'
          : d?.tentativas
            ? 'color-mix(in srgb, var(--laranja) 22%, var(--superficie-2))'
            : 'var(--superficie-2)'
    const titulo = `${NOME_ZONA[z]}${d?.tentativas ? `: ${d.acertos}/${d.tentativas} (${pct}%)` : ''}`
    return (
      <g
        key={z}
        className={`zona ${interativa ? 'zona-clicavel' : ''} ${z === selecionada ? 'zona-ativa' : ''}`}
        fill={cor}
        role={interativa ? 'button' : undefined}
        tabIndex={interativa ? 0 : undefined}
        aria-pressed={interativa ? z === selecionada : undefined}
        aria-label={titulo}
        onClick={interativa ? () => aoSelecionar!(z) : undefined}
        onKeyDown={
          interativa
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  aoSelecionar!(z)
                }
              }
            : undefined
        }
      >
        <title>{titulo}</title>
        {forma}
      </g>
    )
  }

  const texto = (z: Zona) => {
    const d = dados[z]
    if (!d?.tentativas) return null
    const [x, y] = ROTULO[z]
    const pequeno = z === 'tres_canto_e' || z === 'tres_canto_d'
    return (
      <text key={`t-${z}`} x={x} y={y} className={`zona-texto ${pequeno ? 'zona-texto-pequeno' : ''}`}>
        {modo === 'mapa' ? `${Math.round((d.acertos / d.tentativas) * 100)}%` : `${d.acertos}/${d.tentativas}`}
        {modo === 'mapa' && !pequeno && (
          <tspan x={x} dy="1.15em" className="zona-texto-sub">
            {d.acertos}/{d.tentativas}
          </tspan>
        )}
      </text>
    )
  }

  return (
    <svg
      viewBox="0 0 500 470"
      className="quadra"
      role="group"
      aria-label={rotulo ?? (modo === 'mapa' ? 'Mapa de aproveitamento por zona' : 'Escolha a zona do arremesso')}
    >
      <defs>
        <clipPath id={`${id}-quadra`}>
          <rect width="500" height="470" />
        </clipPath>
        <clipPath id={`${id}-dentro`}>
          <path d={DENTRO_DOS_TRES} />
        </clipPath>
      </defs>

      {/* Camadas de baixo para cima: o que fica por cima recebe o toque. */}
      <g clipPath={`url(#${id}-quadra)`}>
        {SETORES.map((s) => zona(`tres_${s.sufixo}` as Zona, <polygon points={cunha(s.de, s.ate)} />))}
      </g>
      <g clipPath={`url(#${id}-dentro)`}>
        {SETORES.map((s) => zona(`media_${s.sufixo}` as Zona, <polygon points={cunha(s.de, s.ate)} />))}
      </g>
      {zona('garrafao', <rect x="170" y="0" width="160" height="190" />)}
      {zona('lance_livre', <circle cx="250" cy="190" r="34" />)}

      {/* Linhas da quadra, só desenho. */}
      <g className="quadra-linhas" pointerEvents="none">
        <rect x="1" y="1" width="498" height="468" />
        <path d={DENTRO_DOS_TRES} />
        <rect x="170" y="0" width="160" height="190" />
        <circle cx="250" cy="190" r="60" />
        <line x1="220" y1="40" x2="280" y2="40" />
        <circle cx={CESTA.x} cy={CESTA.y} r="8" />
        {SETORES.slice(1).map((s) => {
          const rad = (s.de * Math.PI) / 180
          return (
            <line
              key={s.sufixo}
              className="quadra-divisa"
              // Começa fora do garrafão para não cortar a área pintada.
              x1={CESTA.x + 160 * Math.cos(rad)}
              y1={CESTA.y + 160 * Math.sin(rad)}
              x2={CESTA.x + 1000 * Math.cos(rad)}
              y2={CESTA.y + 1000 * Math.sin(rad)}
              clipPath={`url(#${id}-quadra)`}
            />
          )
        })}
      </g>
      <g pointerEvents="none">{(Object.keys(ROTULO) as Zona[]).map(texto)}</g>
    </svg>
  )
}
