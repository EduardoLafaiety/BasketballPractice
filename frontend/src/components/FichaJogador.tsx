import type { CartaoMes, Habilidade, Tiro } from '../cartao/api'
import { nomeMes } from '../cartao/api'

/** Boneco em pixel art, de frente: cabelo (K), pele (S), olhos (E), camisa (J), calção (P), meia (W) e tênis (O). */
const BONECO = [
  '....KKKKKK....',
  '...KKKKKKKK...',
  '...SSSSSSSS...',
  '...SESSSSES...',
  '...SSSSSSSS...',
  '....SSSSSS....',
  '....SSSSSS....',
  '..JJJJJJJJJJ..',
  '.SJJJJJJJJJJS.',
  '.SJJJJJJJJJJS.',
  '.SJJJJJJJJJJS.',
  '.SJJJJJJJJJJS.',
  '..JJJJJJJJJJ..',
  '..JJJJJJJJJJ..',
  '..PPPPPPPPPP..',
  '..PPPPPPPPPP..',
  '..PPPPPPPPPP..',
  '..PPPP..PPPP..',
  '..SSSS..SSSS..',
  '..SSSS..SSSS..',
  '..SSSS..SSSS..',
  '..SSSS..SSSS..',
  '..WWWW..WWWW..',
  '.OOOOO..OOOOO.',
  '.OOOOO..OOOOO.',
]

const CORES: Record<string, string> = {
  K: '#2b1d14',
  S: '#c98f63',
  E: '#101010',
  J: 'var(--laranja)',
  P: '#f4f2ea',
  W: '#f4f2ea',
  O: '#101010',
}

/** Faixa da nota geral, como as cores das cartas de jogo: bronze, prata, ouro e ametista. */
export function faixaDaNota(nota: number | null) {
  if (nota === null) return { id: 'sem', nome: 'Sem nota' }
  if (nota >= 90) return { id: 'ametista', nome: 'Ametista' }
  if (nota >= 75) return { id: 'ouro', nome: 'Ouro' }
  if (nota >= 60) return { id: 'prata', nome: 'Prata' }
  return { id: 'bronze', nome: 'Bronze' }
}

function Boneco() {
  return (
    <svg className="boneco" viewBox="0 0 14 25" role="img" aria-label="Boneco do jogador" shapeRendering="crispEdges">
      {BONECO.flatMap((linha, y) =>
        [...linha].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" style={{ fill: CORES[c] }} />)),
      )}
    </svg>
  )
}

function Linha({ nome, nota, detalhe }: { nome: string; nota?: number; detalhe?: string }) {
  return (
    <li className={`faixa-${faixaDaNota(nota ?? null).id}`}>
      <span>{nome}{detalhe && <small>{detalhe}</small>}</span>
      <span className="cartao-barra" aria-hidden><i style={{ width: `${((nota ?? 0) / 99) * 100}%` }} /></span>
      <strong>{nota ?? '—'}</strong>
    </li>
  )
}

/**
 * Ficha do jogador, no estilo dos jogos de basquete: boneco, nota geral e as notas de cada atributo.
 * A nota geral é a média das notas da ficha: as taxas de arremesso do mês (de 3, de quadra e lance livre) e os testes da bateria.
 */
export default function FichaJogador({
  mes,
  habilidades,
  tiros,
  nome,
  atual,
}: {
  mes: CartaoMes
  habilidades: Habilidade[]
  tiros: Tiro[]
  nome: string
  atual: boolean
}) {
  const faltam = habilidades.filter((h) => !mes.notas[h.id]).length
  const faixa = faixaDaNota(mes.geral)
  return (
    <section className={`cartao-ficha ficha-2k faixa-${faixa.id}`} aria-label={`Nota geral ${mes.geral ?? 'sem nota'}`}>
      <div className="ficha-2k-topo">
        <Boneco />
        <div className="ficha-2k-id">
          <span className="cartao-geral">{mes.geral ?? '—'}</span>
          <span className="ficha-2k-faixa">{faixa.nome}</span>
          <span className="cartao-nome">{nome}</span>
          <span className="cartao-mes">{atual ? 'Este mês' : 'Último cartão'} · {nomeMes(mes.mes, 'long')}</span>
          <span className="cartao-status">{faltam ? `Falta${faltam > 1 ? 'm' : ''} ${faltam} teste${faltam > 1 ? 's' : ''} da bateria` : 'Bateria completa'}</span>
        </div>
      </div>

      <h3 className="ficha-2k-grupo">Arremesso</h3>
      <ul className="cartao-notas">
        {tiros.map((t) => {
          const a = mes.arremessos[t.id]
          return (
            <Linha
              key={t.id}
              nome={t.nome}
              nota={a?.nota}
              detalhe={a ? `${a.pct.toLocaleString('pt-BR')}% · ${a.tentativas} arremessos` : 'precisa de 10 arremessos no mês'}
            />
          )
        })}
      </ul>

      <h3 className="ficha-2k-grupo">Bateria de testes</h3>
      <ul className="cartao-notas">
        {habilidades.map((h) => (
          <Linha key={h.id} nome={h.nome} nota={mes.notas[h.id]?.nota} />
        ))}
      </ul>
    </section>
  )
}
