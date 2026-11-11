import { useId, useRef, useState, type PointerEvent } from 'react'
import { CANTO_TRES, CESTA, RAIO_TRES, Y_FIM_CANTO } from '../components/Quadra'
import { TAMANHO, type Peca, type Seta, type TipoQuadra, type TipoSeta } from './api'

export type Ferramenta = 'ataque' | 'defesa' | 'bola' | TipoSeta | 'mover' | 'apagar'

const ARCO = `M${CANTO_TRES},0 L${CANTO_TRES},${Y_FIM_CANTO} A${RAIO_TRES},${RAIO_TRES} 0 0 0 ${500 - CANTO_TRES},${Y_FIM_CANTO} L${500 - CANTO_TRES},0`

/** Linhas de meia quadra com a cesta no alto; `espelhar` desenha a outra metade (cesta embaixo). */
function MeiaQuadra({ espelhar = false }: { espelhar?: boolean }) {
  return (
    <g transform={espelhar ? 'translate(0 940) scale(1 -1)' : undefined}>
      <path d={ARCO} />
      <rect x="170" y="0" width="160" height="190" />
      <path d="M190 190 A60 60 0 0 0 310 190" />
      <line x1="220" y1="40" x2="280" y2="40" />
      <circle cx={CESTA.x} cy={CESTA.y} r="8" />
    </g>
  )
}

/** Caminho em zigue-zague de (x1, y1) até perto de (x2, y2), para o drible. */
function zigueZague(s: Seta) {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  const comprimento = Math.hypot(dx, dy)
  const passos = Math.max(2, Math.floor(comprimento / 18))
  const [ux, uy] = [dx / comprimento, dy / comprimento]
  const pontos = [`M${s.x1},${s.y1}`]
  for (let i = 1; i < passos; i++) {
    const t = (i / passos) * (comprimento - 14)
    const lado = i % 2 ? 7 : -7
    pontos.push(`L${(s.x1 + ux * t - uy * lado).toFixed(1)},${(s.y1 + uy * t + ux * lado).toFixed(1)}`)
  }
  pontos.push(`L${s.x2},${s.y2}`)
  return pontos.join(' ')
}

function DesenhoSeta({ seta, marcador, aoClicar }: { seta: Seta; marcador: string; aoClicar?: () => void }) {
  const comum = { className: `seta seta-${seta.tipo}`, onClick: aoClicar, 'data-seta': seta.tipo }
  if (seta.tipo === 'bloqueio') {
    // Linha com uma barra perpendicular na ponta: o corpo do bloqueador.
    const ang = Math.atan2(seta.y2 - seta.y1, seta.x2 - seta.x1)
    const [px, py] = [-Math.sin(ang) * 14, Math.cos(ang) * 14]
    return (
      <g {...comum}>
        <line x1={seta.x1} y1={seta.y1} x2={seta.x2} y2={seta.y2} />
        <line x1={seta.x2 - px} y1={seta.y2 - py} x2={seta.x2 + px} y2={seta.y2 + py} />
      </g>
    )
  }
  if (seta.tipo === 'drible') return <path {...comum} d={zigueZague(seta)} markerEnd={`url(#${marcador})`} />
  return <line {...comum} x1={seta.x1} y1={seta.y1} x2={seta.x2} y2={seta.y2} markerEnd={`url(#${marcador})`} />
}

interface Props {
  quadra: TipoQuadra
  pecas: Peca[]
  setas: Seta[]
  ferramenta: Ferramenta
  aoColocar: (x: number, y: number) => void
  aoDesenhar: (seta: Seta) => void
  aoMover: (indice: number, x: number, y: number) => void
  aoApagarPeca: (indice: number) => void
  aoApagarSeta: (indice: number) => void
}

export default function QuadraTatica({ quadra, pecas, setas, ferramenta, aoColocar, aoDesenhar, aoMover, aoApagarPeca, aoApagarSeta }: Props) {
  const id = useId().replace(/:/g, '')
  const svg = useRef<SVGSVGElement>(null)
  const { largura, altura } = TAMANHO[quadra]
  const [rascunho, setRascunho] = useState<Seta | null>(null)
  const [arrastando, setArrastando] = useState<number | null>(null)
  const ehSeta = ferramenta === 'movimento' || ferramenta === 'passe' || ferramenta === 'drible' || ferramenta === 'bloqueio'

  /** Ponto do ponteiro nas coordenadas do desenho, sempre dentro da quadra. */
  const ponto = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * largura
    const y = ((e.clientY - r.top) / r.height) * altura
    return { x: Math.min(largura, Math.max(0, x)), y: Math.min(altura, Math.max(0, y)) }
  }

  const aoApertar = (e: PointerEvent<SVGSVGElement>) => {
    const p = ponto(e)
    if (ehSeta) {
      svg.current?.setPointerCapture?.(e.pointerId)
      setRascunho({ tipo: ferramenta, x1: p.x, y1: p.y, x2: p.x, y2: p.y })
    } else if (ferramenta === 'ataque' || ferramenta === 'defesa' || ferramenta === 'bola') {
      aoColocar(p.x, p.y)
    }
  }

  const aoArrastar = (e: PointerEvent<SVGSVGElement>) => {
    if (rascunho) {
      const p = ponto(e)
      setRascunho({ ...rascunho, x2: p.x, y2: p.y })
    } else if (arrastando !== null) {
      const p = ponto(e)
      aoMover(arrastando, p.x, p.y)
    }
  }

  const aoSoltar = (e: PointerEvent<SVGSVGElement>) => {
    if (rascunho) {
      const p = ponto(e)
      const final = { ...rascunho, x2: p.x, y2: p.y }
      // Toque sem arrastar não vira seta.
      if (Math.hypot(final.x2 - final.x1, final.y2 - final.y1) >= 12) aoDesenhar(final)
      setRascunho(null)
    }
    setArrastando(null)
  }

  return (
    <svg
      ref={svg}
      className={`quadra-tatica ferramenta-${ferramenta}`}
      viewBox={`0 0 ${largura} ${altura}`}
      role="application"
      aria-label={`Prancheta: ${quadra === 'meia' ? 'meia quadra' : 'quadra inteira'}, ${pecas.length} peças e ${setas.length} setas`}
      onPointerDown={aoApertar}
      onPointerMove={aoArrastar}
      onPointerUp={aoSoltar}
      onPointerLeave={aoSoltar}
    >
      <defs>
        <marker id={`${id}-ponta`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="seta-ponta" />
        </marker>
      </defs>
      <rect className="quadra-tatica-piso" width={largura} height={altura} />
      <g className="quadra-tatica-linhas">
        <rect x="1" y="1" width={largura - 2} height={altura - 2} />
        <MeiaQuadra />
        {quadra === 'inteira' && (
          <>
            <MeiaQuadra espelhar />
            <line x1="0" y1="470" x2="500" y2="470" />
            <circle cx="250" cy="470" r="60" />
          </>
        )}
      </g>

      {setas.map((s, i) => (
        <DesenhoSeta key={i} seta={s} marcador={`${id}-ponta`} aoClicar={ferramenta === 'apagar' ? () => aoApagarSeta(i) : undefined} />
      ))}
      {rascunho && <DesenhoSeta seta={rascunho} marcador={`${id}-ponta`} />}

      {pecas.map((p, i) => (
        <g
          key={i}
          className={`peca peca-${p.tipo}`}
          transform={`translate(${p.x} ${p.y})`}
          data-peca={p.tipo}
          onPointerDown={(e) => {
            if (ferramenta === 'mover') {
              e.stopPropagation()
              svg.current?.setPointerCapture?.(e.pointerId)
              setArrastando(i)
            } else if (ferramenta === 'apagar') {
              e.stopPropagation()
              aoApagarPeca(i)
            }
          }}
        >
          {p.tipo === 'ataque' && <circle r="16" />}
          {p.tipo === 'defesa' && <path d="M-12,-12 L12,12 M12,-12 L-12,12" />}
          {p.tipo === 'bola' && <circle r="9" />}
          {p.rotulo && p.tipo !== 'bola' && (
            <text x={p.tipo === 'defesa' ? 14 : 0} y={p.tipo === 'defesa' ? -12 : 1} dominantBaseline="middle" textAnchor="middle">
              {p.rotulo}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
