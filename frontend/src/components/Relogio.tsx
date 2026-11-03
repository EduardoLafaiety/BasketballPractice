import { useEffect, useState } from 'react'

// Data e hora no topo do Início, no estilo de placar de ginásio: dígitos de LED de sete segmentos
// (desenhados aqui, sem fonte externa), hora em âmbar como o relógio de jogo e segundos em vermelho
// como o cronômetro de posse. Os segmentos apagados aparecem de leve, como num placar de verdade.

const DIA = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const DATA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const limpa = (s: string) => s.replace(/\./g, '').replace(/ de /g, ' ')

// Segmentos a–g de um dígito 12×20.
const SEGMENTOS: Record<string, string> = {
  a: '2.4,0.6 9.6,0.6 10.8,1.7 9.6,2.8 2.4,2.8 1.2,1.7',
  b: '10.9,2.2 12,3.4 12,8.6 10.9,9.7 9.8,8.6 9.8,3.4',
  c: '10.9,10.3 12,11.4 12,16.6 10.9,17.8 9.8,16.6 9.8,11.4',
  d: '2.4,17.2 9.6,17.2 10.8,18.3 9.6,19.4 2.4,19.4 1.2,18.3',
  e: '1.1,10.3 2.2,11.4 2.2,16.6 1.1,17.8 0,16.6 0,11.4',
  f: '1.1,2.2 2.2,3.4 2.2,8.6 1.1,9.7 0,8.6 0,3.4',
  g: '2.4,8.9 9.6,8.9 10.8,10 9.6,11.1 2.4,11.1 1.2,10',
}
const ACESOS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg']

function Digito({ valor }: { valor: number }) {
  return (
    <svg className="led-digito" viewBox="-1 -0.5 14 21" aria-hidden>
      <g transform="skewX(-7)">
        {Object.entries(SEGMENTOS).map(([s, pontos]) => (
          <polygon key={s} points={pontos} className={ACESOS[valor].includes(s) ? 'aceso' : undefined} />
        ))}
      </g>
    </svg>
  )
}

const Par = ({ n }: { n: number }) => (
  <>
    <Digito valor={Math.floor(n / 10)} />
    <Digito valor={n % 10} />
  </>
)

export default function Relogio() {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    let timer: number
    const proximo = () => {
      timer = window.setTimeout(() => {
        setAgora(new Date())
        proximo()
      }, 1000 - (Date.now() % 1000) + 20)
    }
    proximo()
    return () => window.clearTimeout(timer)
  }, [])

  const h = agora.getHours()
  const m = agora.getMinutes()
  const s = agora.getSeconds()
  const dia = limpa(DIA.format(agora))
  const data = limpa(DATA.format(agora))

  return (
    <time
      className="placar-relogio"
      dateTime={agora.toISOString()}
      aria-label={`Hoje, ${dia} ${data}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`}
    >
      <span className="placar-legenda" aria-hidden>
        <strong>{dia}</strong>
        <span>{data}</span>
      </span>
      <span className="placar-hora" aria-hidden>
        <Par n={h} />
        <span className={`placar-dois-pontos ${s % 2 ? 'apagado' : ''}`}>
          <i />
          <i />
        </span>
        <Par n={m} />
      </span>
      <span className="placar-segundos" aria-hidden>
        <Par n={s} />
      </span>
    </time>
  )
}
