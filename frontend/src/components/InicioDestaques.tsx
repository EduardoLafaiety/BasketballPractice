import { Link } from 'react-router-dom'
import { dataLocal } from '../api'
import { aproveitamento, useResumo } from '../store'
import type { Semana } from '../types'

/** Segunda-feira da semana de `d`, à meia-noite local. */
export function segundaDe(d: Date) {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}

const VAZIA = { sessoes: 0, minutos: 0, acertos: 0, tentativas: 0 }

function Variacao({ atual, anterior, unidade = '' }: { atual: number | null; anterior: number | null; unidade?: string }) {
  if (atual === null || anterior === null) return <span className="variacao">sem comparação</span>
  const diff = Math.round(atual - anterior)
  if (diff === 0) return <span className="variacao">igual à semana anterior</span>
  return (
    <span className={`variacao ${diff > 0 ? 'sobe' : 'desce'}`}>
      {diff > 0 ? '+' : '−'}{Math.abs(diff)}{unidade} em relação à semana anterior
    </span>
  )
}

/**
 * Resumo da semana: na segunda-feira fecha a semana que passou (e aparece em destaque, no alto do Início);
 * nos outros dias mostra a semana até agora. Sempre comparado com a semana antes dela.
 */
export function ResumoSemana({ agora = new Date() }: { agora?: Date }) {
  const segunda = segundaDe(agora)
  const ehSegunda = agora.getDay() === 1
  const inicio = ehSegunda ? new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() - 7) : segunda
  const anterior = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() - 7)
  const { resumo, erro } = useResumo(anterior)

  const semana = (d: Date): Omit<Semana, 'inicio'> => resumo?.semanas.find((s) => s.inicio === dataLocal(d)) ?? VAZIA
  const esta = semana(inicio)
  const antes = semana(anterior)
  const pct = aproveitamento(esta.acertos, esta.tentativas)
  const pctAntes = aproveitamento(antes.acertos, antes.tentativas)

  return (
    <section className={`faixa-clara banda-curta resumo-semana ${ehSegunda ? 'destaque' : ''}`} aria-labelledby="resumo-semana-titulo" aria-busy={!resumo}>
      <div className="secao-topo">
        <div>
          <span className="rotulo-forte">{ehSegunda ? 'Segunda é dia de balanço' : 'Semana até agora'}</span>
          <h2 id="resumo-semana-titulo">{ehSegunda ? 'Resumo da semana passada' : 'Resumo da semana'}</h2>
        </div>
        <Link to="/desempenho" className="link-forte">Ver desempenho</Link>
      </div>
      {erro && !resumo ? (
        <p className="erro" role="alert">Não foi possível carregar o resumo: {erro.message}</p>
      ) : (
        <div className="resumo-semana-grade">
          <div>
            <strong>{resumo ? esta.sessoes : '—'}</strong>
            <span>treinos</span>
            {resumo && <Variacao atual={esta.sessoes} anterior={antes.sessoes} />}
          </div>
          <div>
            <strong>{resumo ? esta.minutos : '—'}</strong>
            <span>minutos</span>
            {resumo && <Variacao atual={esta.minutos} anterior={antes.minutos} unidade=" min" />}
          </div>
          <div>
            <strong>{resumo ? (pct === null ? '—' : `${pct}%`) : '—'}</strong>
            <span>aproveitamento no arremesso</span>
            {resumo && <Variacao atual={pct} anterior={pctAntes} unidade=" pontos" />}
          </div>
        </div>
      )}
    </section>
  )
}
