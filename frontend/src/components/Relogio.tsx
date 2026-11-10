import { useEffect, useState } from 'react'

// Data e hora no topo do Início, como o shot clock que fica em cima da tabela: a contagem da posse
// (24 até 0) num anel vermelho que se fecha, a buzina acendendo no zero e o relógio de jogo em
// âmbar. Os dígitos de LED de sete segmentos são desenhados aqui, sem fonte externa.

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

/** Segundos que restam da posse: 24 até 0, e recomeça (um ciclo a cada 25 segundos do dia). */
export function posse(agora: Date) {
  const doDia = agora.getHours() * 3600 + agora.getMinutes() * 60 + agora.getSeconds()
  return 24 - (doDia % 25)
}

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
  const restam = posse(agora)
  const dia = limpa(DIA.format(agora))
  const data = limpa(DATA.format(agora))

  return (
    <time
      className={`shot-relogio ${restam === 0 ? 'buzina' : ''}`}
      dateTime={agora.toISOString()}
      aria-label={`Hoje, ${dia} ${data}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`}
    >
      <span className="shot-posse" aria-hidden>
        <svg className="shot-anel" viewBox="0 0 40 40">
          <circle className="shot-anel-fundo" cx="20" cy="20" r="17" />
          {/* pathLength 24: cada segundo apaga um vinte e quatro avos do anel. */}
          <circle
            className={`shot-anel-tempo ${restam === 24 ? 'reinicio' : ''}`}
            cx="20"
            cy="20"
            r="17"
            pathLength="24"
            strokeDasharray="24"
            style={{ strokeDashoffset: 24 - restam }}
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className="shot-posse-num">
          <Par n={restam} />
        </span>
      </span>
      <span className="shot-legenda" aria-hidden>
        <strong>{dia}</strong>
        <span>{data}</span>
      </span>
      <span className="shot-hora" aria-hidden>
        <Par n={h} />
        <span className={`shot-dois-pontos ${s % 2 ? 'apagado' : ''}`}>
          <i />
          <i />
        </span>
        <Par n={m} />
      </span>
    </time>
  )
}
