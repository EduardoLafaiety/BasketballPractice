import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, dataLocal } from '../api'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import GraficoLinha from '../components/GraficoLinha'
import Quadra, { type DadosZonas } from '../components/Quadra'
import { baixarArquivo, sessoesParaCsv } from '../lib/arquivo'
import { aproveitamento, diasAtras, formatarData, useResumo, useSessoes, useZonas } from '../store'
import type { Resumo, Sessao } from '../types'

/** Segunda-feira da semana atual, `semanas` atrás. */
function inicioSemana(semanas = 0) {
  const d = diasAtras(0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - semanas * 7)
  return d
}

function inicioMes(meses = 0) {
  const d = diasAtras(0)
  return new Date(d.getFullYear(), d.getMonth() - meses, 1)
}

export default function Desempenho() {
  const { sessoes, carregado, erro, recarregar, remover } = useSessoes()
  const resumo = useResumo()
  const [erroRemover, setErroRemover] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  const titulo = <h1>Desempenho</h1>

  if (!carregado) {
    return (
      <>
        {titulo}
        {erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando suas sessões…" />}
      </>
    )
  }

  if (sessoes.length === 0) {
    return (
      <>
        {titulo}
        <AvisoDesatualizado erro={erro} tentarDeNovo={recarregar} />
        <div className="vazio">
          Você ainda não registrou nenhuma sessão.{' '}
          <Link to="/treinos" className="link">Escolha um treino para começar</Link>
        </div>
      </>
    )
  }

  // Totais vêm de /stats/summary; enquanto carregam, usa as sessões já na tela.
  const r = resumo.resumo ?? {
    sessoes: sessoes.length,
    minutos: sessoes.reduce((t, s) => t + s.duracaoMin, 0),
    acertos: sessoes.reduce((t, s) => t + (s.acertos ?? 0), 0),
    tentativas: sessoes.reduce((t, s) => t + (s.tentativas ?? 0), 0),
    semanas: [],
  }
  const pct = aproveitamento(r.acertos, r.tentativas)

  // Minutos por dia nos últimos 7 dias (hoje por último)
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = diasAtras(6 - i)
    const chave = d.toDateString()
    const minutos = sessoes
      .filter((s) => new Date(s.data).toDateString() === chave)
      .reduce((t, s) => t + s.duracaoMin, 0)
    return { rotulo: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), minutos }
  })
  const maxMin = Math.max(30, ...dias.map((d) => d.minutos))

  async function excluir(s: Sessao) {
    // A exclusão é definitiva: um clique errado no × não pode apagar o registro sem aviso.
    if (!window.confirm(`Excluir a sessão "${s.drillNome ?? 'Treino livre'}" de ${formatarData(s.data)}?`)) return
    setErroRemover(null)
    try {
      await remover(s.id)
      resumo.recarregar()
    } catch (e) {
      setErroRemover(`Não foi possível excluir a sessão: ${(e as Error).message}`)
    }
  }

  async function exportarCsv() {
    setExportando(true)
    try {
      baixarArquivo(sessoesParaCsv(await api.todasSessoes()), `sessoes-${dataLocal(new Date())}.csv`, 'text/csv;charset=utf-8')
    } catch (e) {
      window.alert(`Não foi possível exportar: ${(e as Error).message}`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      {titulo}
      <AvisoDesatualizado erro={erro} tentarDeNovo={recarregar} />

      {resumo.erro && <p className="erro" role="alert">Totais desatualizados: {resumo.erro.message}</p>}
      <section className="stats">
        <div className="card stat"><strong>{r.sessoes}</strong><span className="muted">sessões no total</span></div>
        <div className="card stat"><strong>{r.minutos}</strong><span className="muted">minutos treinados</span></div>
        <div className="card stat">
          <strong>{pct === null ? '—' : `${pct}%`}</strong>
          <span className="muted">aproveitamento ({r.acertos}/{r.tentativas})</span>
        </div>
        {r.cansacoMedio !== undefined && (
          <div className="card stat">
            <strong>{r.cansacoMedio.toLocaleString('pt-BR')}</strong>
            <span className="muted">cansaço médio (1–5){r.esforcoMedio !== undefined && ` · esforço ${r.esforcoMedio.toLocaleString('pt-BR')}`}</span>
          </div>
        )}
      </section>

      <Comparacoes />

      <section className="card">
        <h2 className="sem-margem">Últimos 7 dias</h2>
        <div className="grafico" role="img" aria-label="Minutos treinados por dia nos últimos 7 dias">
          {dias.map((d, i) => (
            <div key={i} className="barra-col">
              <span className="barra-valor">{d.minutos || ''}</span>
              <div className="barra" style={{ height: `${(d.minutos / maxMin) * 100}%` }} />
              <span className="barra-rotulo">{d.rotulo}</span>
            </div>
          ))}
        </div>
      </section>

      <Evolucao />
      <MapaZonas />

      <section>
        <div className="secao-topo">
          <h2>Histórico</h2>
          <button className="btn" onClick={exportarCsv} disabled={exportando}>
            {exportando ? 'Gerando…' : 'Exportar CSV'}
          </button>
        </div>
        {erroRemover && <p className="erro" role="alert">{erroRemover}</p>}
        <ul className="historico">
          {sessoes.map((s) => {
            const p = aproveitamento(s.acertos, s.tentativas)
            return (
              <li key={s.id} className="card sessao">
                <div>
                  <strong>{s.drillNome ?? 'Treino livre'}</strong>
                  <span className="meta">
                    {formatarData(s.data)}
                    {s.duracaoMin > 0 && ` · ${s.duracaoMin} min`}
                    {s.esforco !== undefined && ` · esforço ${s.esforco}/5`}
                    {s.cansaco !== undefined && ` · cansaço ${s.cansaco}/5`}
                    {p !== null && ` · ${s.acertos}/${s.tentativas} (${p}%)`}
                    {s.repeticoes !== undefined && ` · ${s.repeticoes} repetições`}
                    {s.sequencia !== undefined && ` · ${s.sequencia} seguidos`}
                    {s.zonas.length > 0 && ` · ${s.zonas.length} ${s.zonas.length === 1 ? 'zona' : 'zonas'}`}
                  </span>
                  {s.entradas.length > 1 && (
                    <span className="meta">{s.entradas.map((e) => e.drillNome).filter(Boolean).join(' · ')}</span>
                  )}
                  {s.notas && <p className="muted">{s.notas}</p>}
                </div>
                <button className="remover" aria-label="Excluir sessão" onClick={() => excluir(s)}>×</button>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}

function Comparacoes() {
  // Período atual vai até agora; o anterior, até o início do atual.
  const semana = useResumo(inicioSemana(0))
  const semanaPassada = useResumo(inicioSemana(1), inicioSemana(0))
  const mes = useResumo(inicioMes(0))
  const mesPassado = useResumo(inicioMes(1), inicioMes(0))

  return (
    <section className="comparacoes">
      <Comparacao titulo="Esta semana × semana passada" atual={semana.resumo} anterior={semanaPassada.resumo} />
      <Comparacao titulo="Este mês × mês passado" atual={mes.resumo} anterior={mesPassado.resumo} />
    </section>
  )
}

function Comparacao({ titulo, atual, anterior }: { titulo: string; atual?: Resumo; anterior?: Resumo }) {
  if (!atual || !anterior)
    return (
      <div className="card comparacao-card">
        <h3>{titulo}</h3>
        <p className="meta">Carregando…</p>
      </div>
    )
  const pA = aproveitamento(atual.acertos, atual.tentativas)
  const pB = aproveitamento(anterior.acertos, anterior.tentativas)
  const linhas: { rotulo: string; a: number | null; b: number | null; sufixo?: string }[] = [
    { rotulo: 'Sessões', a: atual.sessoes, b: anterior.sessoes },
    { rotulo: 'Minutos', a: atual.minutos, b: anterior.minutos },
    { rotulo: 'Aproveitamento', a: pA, b: pB, sufixo: '%' },
  ]
  return (
    <div className="card comparacao-card">
      <h3>{titulo}</h3>
      <table className="tabela-comparacao">
        <tbody>
          {linhas.map((l) => {
            const delta = l.a !== null && l.b !== null ? l.a - l.b : null
            return (
              <tr key={l.rotulo}>
                <th scope="row">{l.rotulo}</th>
                <td>
                  <strong>{l.a ?? '—'}{l.a !== null && l.sufixo}</strong>
                </td>
                <td className="meta">antes {l.b ?? '—'}{l.b !== null && l.sufixo}</td>
                <td className={delta === null || delta === 0 ? 'meta' : delta > 0 ? 'positivo' : 'negativo'}>
                  {delta === null ? '' : delta === 0 ? '=' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}${l.sufixo ?? ''}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Evolucao() {
  const desde = inicioSemana(11)
  const { resumo } = useResumo(desde)
  if (!resumo) return null

  // 12 semanas, inclusive as sem treino; o backend agrupa por semana (segunda a domingo) no fuso do navegador.
  const porInicio = new Map(resumo.semanas.map((s) => [s.inicio, s]))
  const semanas = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(desde)
    d.setDate(d.getDate() + i * 7)
    const s = porInicio.get(dataLocal(d))
    return { rotulo: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), s }
  })
  if (resumo.semanas.length < 2) return null

  return (
    <section className="card">
      <h2 className="sem-margem">Evolução nas últimas 12 semanas</h2>
      <div className="evolucao">
        <div>
          <h3>Aproveitamento nos arremessos</h3>
          <GraficoLinha
            rotulo="Aproveitamento por semana"
            sufixo="%"
            maximo={100}
            pontos={semanas.map(({ rotulo, s }) => ({ rotulo, valor: s && s.tentativas ? aproveitamento(s.acertos, s.tentativas) : null }))}
          />
        </div>
        <div>
          <h3>Minutos por semana</h3>
          <GraficoLinha rotulo="Minutos por semana" pontos={semanas.map(({ rotulo, s }) => ({ rotulo, valor: s?.minutos ?? 0 }))} />
        </div>
      </div>
    </section>
  )
}

function MapaZonas() {
  const [periodo, setPeriodo] = useState<'30' | 'tudo'>('tudo')
  const { zonas, erro } = useZonas(periodo === '30' ? diasAtras(29) : undefined)
  const dados: DadosZonas = Object.fromEntries((zonas ?? []).map((z) => [z.zona, z]))
  const total = (zonas ?? []).reduce((t, z) => t + z.tentativas, 0)

  return (
    <section className="card">
      <div className="secao-topo">
        <h2 className="sem-margem">Mapa de arremessos</h2>
        <div className="chips">
          <button className={`chip ${periodo === '30' ? 'ativo' : ''}`} onClick={() => setPeriodo('30')}>30 dias</button>
          <button className={`chip ${periodo === 'tudo' ? 'ativo' : ''}`} onClick={() => setPeriodo('tudo')}>Tudo</button>
        </div>
      </div>
      {erro && <p className="erro" role="alert">{erro.message}</p>}
      {zonas && total === 0 ? (
        <p className="muted">
          Nenhum arremesso marcado por zona ainda. No contador ao vivo de um treino de arremesso, toque em
          “Marcar a zona de cada arremesso”.
        </p>
      ) : (
        <div className="mapa">
          <Quadra modo="mapa" dados={dados} />
          <div className="legenda meta">
            <span className="legenda-escala" aria-hidden />
            <span>até 25%</span>
            <span>65% ou mais</span>
          </div>
        </div>
      )}
    </section>
  )
}
