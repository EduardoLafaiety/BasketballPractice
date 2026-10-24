interface Ponto {
  rotulo: string
  valor: number | null
}

/** Gráfico de linha simples em SVG; pontos sem valor quebram a linha. */
export default function GraficoLinha({
  pontos,
  sufixo = '',
  maximo,
  rotulo,
}: {
  pontos: Ponto[]
  sufixo?: string
  maximo?: number
  rotulo: string
}) {
  const L = 600
  const A = 200
  const m = { topo: 20, base: 28, lado: 12 }
  const valores = pontos.map((p) => p.valor).filter((v): v is number => v !== null)
  const max = maximo ?? Math.max(1, ...valores)
  const x = (i: number) => m.lado + (pontos.length <= 1 ? (L - 2 * m.lado) / 2 : (i * (L - 2 * m.lado)) / (pontos.length - 1))
  const y = (v: number) => m.topo + (1 - v / max) * (A - m.topo - m.base)

  // Segmentos contínuos entre pontos com valor.
  const segmentos: string[] = []
  let atual = ''
  pontos.forEach((p, i) => {
    if (p.valor === null) {
      if (atual) segmentos.push(atual)
      atual = ''
    } else atual += `${atual ? 'L' : 'M'}${x(i)},${y(p.valor)}`
  })
  if (atual) segmentos.push(atual)

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="grafico-linha" role="img" aria-label={rotulo}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={m.lado} x2={L - m.lado} y1={y(max * f)} y2={y(max * f)} className="grade-linha" />
          <text x={L - m.lado} y={y(max * f) - 4} className="eixo-texto" textAnchor="end">
            {Math.round(max * f)}
            {sufixo}
          </text>
        </g>
      ))}
      {segmentos.map((d, i) => (
        <path key={i} d={d} className="linha" />
      ))}
      {pontos.map((p, i) =>
        p.valor === null ? null : (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.valor)} r="4.5" className="ponto">
              <title>
                {p.rotulo}: {p.valor}
                {sufixo}
              </title>
            </circle>
          </g>
        ),
      )}
      {pontos.map((p, i) =>
        // Com muitos pontos, rotula um sim, um não.
        pontos.length > 8 && i % 2 === 1 ? null : (
          <text key={`r${i}`} x={x(i)} y={A - 8} className="eixo-texto" textAnchor="middle">
            {p.rotulo}
          </text>
        ),
      )}
    </svg>
  )
}
