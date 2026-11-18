import { TETO, type Atributo } from './calculos'

const CENTRO = 110
const RAIO = 78
const ABREVIACAO: Record<Atributo['id'], string> = { arremesso3: '3PT', condicionamento: 'COND', defesa: 'DEF', drible: 'DRI', passe: 'PAS' }

/** O ponto de um eixo (0 = topo, em sentido horário) a uma fração do raio. */
const ponto = (i: number, n: number, fracao: number): [number, number] => {
  const ang = (-90 + (360 / n) * i) * (Math.PI / 180)
  return [CENTRO + Math.cos(ang) * RAIO * fracao, CENTRO + Math.sin(ang) * RAIO * fracao]
}
const poligono = (n: number, fracao: (i: number) => number) =>
  Array.from({ length: n }, (_, i) => ponto(i, n, fracao(i)).map((v) => Math.round(v * 10) / 10).join(',')).join(' ')

/** O gráfico de radar da ficha: um pentágono com os cinco atributos, preenchido na cor da faixa. */
export default function Radar({ atributos, cor }: { atributos: Atributo[]; cor: string }) {
  const n = atributos.length
  return (
    <svg className="radar" viewBox="0 0 220 220" role="img" aria-label="Gráfico dos atributos">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={poligono(n, () => f)} className="radar-grade" />
      ))}
      {atributos.map((_, i) => {
        const [x, y] = ponto(i, n, 1)
        return <line key={i} x1={CENTRO} y1={CENTRO} x2={x} y2={y} className="radar-grade" />
      })}
      <polygon points={poligono(n, (i) => atributos[i].valor / TETO)} fill={cor} fillOpacity={0.4} stroke={cor} strokeWidth={3} strokeLinejoin="miter" />
      {atributos.map((a, i) => {
        const [x, y] = ponto(i, n, 1.2)
        return (
          <text key={a.id} x={x} y={y} className="radar-rotulo" textAnchor="middle" dominantBaseline="middle">
            {ABREVIACAO[a.id]}
          </text>
        )
      })}
    </svg>
  )
}
