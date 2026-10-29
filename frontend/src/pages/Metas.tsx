import { useMemo, useState, type FormEvent } from 'react'
import BarraProgresso from '../components/BarraProgresso'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import GraficoLinha from '../components/GraficoLinha'
import Icone, { type NomeIcone } from '../components/Icone'
import { dataLocal } from '../api'
import { formatarData, useDrills, useMetas, useProgresso, useTestes, useTiposTeste } from '../store'
import type { Meta, TipoMeta, TipoTeste } from '../types'

const TIPOS: Record<TipoMeta, { rotulo: string; unidade: string; exemplo: string; comExercicio?: boolean }> = {
  aproveitamento: { rotulo: 'Aproveitamento nos últimos 30 dias', unidade: '%', exemplo: '40% nos arremessos de três', comExercicio: true },
  sessoes_semana: { rotulo: 'Sessões por semana', unidade: 'sessões', exemplo: 'Treinar 4x por semana' },
  minutos_semana: { rotulo: 'Minutos por semana', unidade: 'min', exemplo: '180 minutos por semana' },
  sessoes_total: { rotulo: 'Sessões a partir de hoje', unidade: 'sessões', exemplo: '30 sessões até dezembro' },
  minutos_total: { rotulo: 'Minutos a partir de hoje', unidade: 'min', exemplo: '20 horas de quadra' },
  cestas_total: { rotulo: 'Cestas a partir de hoje', unidade: 'cestas', exemplo: '1.000 lances livres convertidos', comExercicio: true },
  dias_seguidos: { rotulo: 'Dias seguidos treinando', unidade: 'dias', exemplo: '10 dias sem falhar' },
}

/** Ícone de cada conquista desbloqueada, pelo que ela mede; as que não estão aqui usam a medalha. */
const ICONE_CONQUISTA: Record<string, NomeIcone> = {
  '3-dias': 'fogo',
  '7-dias': 'fogo',
  '30-dias': 'fogo',
  '10-horas': 'relogio',
  '100-num-dia': 'bola',
  '1000-cestas': 'bola',
  'sequencia-10': 'metas',
  'sequencia-25': 'metas',
  'teste-fisico': 'raio',
}

export default function Metas() {
  const { progresso, erro: erroProgresso, recarregar: recarregarProgresso } = useProgresso()

  return (
    <>
      <h1>Metas e conquistas</h1>

      {progresso ? (
        <section className="sequencia card">
          <div>
            <span className="sequencia-fogo"><Icone nome="fogo" tamanho={32} /></span>
            <strong>{progresso.sequenciaAtual}</strong>
            <span className="muted">{progresso.sequenciaAtual === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          </div>
          <p className="muted">
            Melhor sequência: <strong>{progresso.melhorSequencia}</strong> {progresso.melhorSequencia === 1 ? 'dia' : 'dias'}.{' '}
            {progresso.sequenciaAtual === 0 ? 'Treine hoje para começar uma nova!' : 'Treine hoje para não perder.'}
          </p>
        </section>
      ) : erroProgresso ? (
        <ErroCarga erro={erroProgresso} tentarDeNovo={recarregarProgresso} />
      ) : (
        <Carregando texto="Calculando sua sequência…" />
      )}

      <SecaoMetas />

      <section>
        <h2>Conquistas</h2>
        {progresso && (
          <ul className="conquistas">
            {progresso.conquistas.map((c) => (
              <li key={c.id} className={`card conquista ${c.desbloqueada ? 'desbloqueada' : ''}`}>
                <span className="conquista-icone">
                  <Icone nome={c.desbloqueada ? (ICONE_CONQUISTA[c.id] ?? 'medalha') : 'cadeado'} tamanho={22} />
                </span>
                <div>
                  <strong>{c.titulo}</strong>
                  <span className="meta">{c.descricao}</span>
                  {!c.desbloqueada && (
                    <>
                      <BarraProgresso valor={c.progresso} alvo={c.alvo} rotulo={`Progresso: ${c.titulo}`} />
                      <span className="meta">
                        {c.progresso}/{c.alvo}
                      </span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SecaoTestes />
    </>
  )
}

function SecaoMetas() {
  const { metas, carregado, erro, recarregar, adicionar, remover } = useMetas()
  const { drills } = useDrills()
  const [criando, setCriando] = useState(false)
  const [tipo, setTipo] = useState<TipoMeta>('sessoes_semana')
  const [alvo, setAlvo] = useState('3')
  const [titulo, setTitulo] = useState('')
  const [drillId, setDrillId] = useState('')
  const [prazo, setPrazo] = useState('')
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const info = TIPOS[tipo]
  const arremessos = drills.filter((d) => d.metrica === 'acertos')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const n = Number(alvo)
    if (!Number.isInteger(n) || n < 1) return setErroForm('O alvo precisa ser um número inteiro maior que zero.')
    if (tipo === 'aproveitamento' && n > 100) return setErroForm('Aproveitamento vai até 100%.')
    setSalvando(true)
    setErroForm(null)
    // O exercício escolhido só vale para os tipos que aceitam exercício (o select some ao trocar de tipo).
    const idDrill = info.comExercicio && drillId ? drillId : undefined
    const nomeDrill = drills.find((d) => d.id === idDrill)?.nome
    try {
      await adicionar({
        titulo:
          titulo.trim() ||
          `${info.rotulo}: ${info.unidade === '%' ? `${n}%` : `${n.toLocaleString('pt-BR')} ${info.unidade}`}${nomeDrill ? ` (${nomeDrill})` : ''}`,
        tipo,
        alvo: n,
        drillId: idDrill,
        prazo: prazo || undefined,
      })
      setCriando(false)
      setTitulo('')
      setDrillId('')
      setPrazo('')
    } catch (e) {
      setErroForm((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(m: Meta) {
    if (!window.confirm(`Excluir a meta "${m.titulo}"?`)) return
    try {
      await remover(m.id)
    } catch (e) {
      window.alert((e as Error).message)
    }
  }

  return (
    <section>
      <div className="secao-topo">
        <h2>Metas</h2>
        {!criando && <button className="btn" onClick={() => setCriando(true)}>+ Nova meta</button>}
      </div>

      {criando && (
        <form className="card form form-solto" onSubmit={enviar}>
          <div className="linha">
            <label>
              Tipo
              <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMeta)}>
                {(Object.keys(TIPOS) as TipoMeta[]).map((t) => (
                  <option key={t} value={t}>{TIPOS[t].rotulo}</option>
                ))}
              </select>
            </label>
            <label>
              Alvo ({info.unidade})
              <input className="input" type="number" min={1} max={tipo === 'aproveitamento' ? 100 : undefined} value={alvo} onChange={(e) => setAlvo(e.target.value)} />
            </label>
          </div>
          {info.comExercicio && (
            <label>
              Exercício (opcional)
              <select className="input" value={drillId} onChange={(e) => setDrillId(e.target.value)}>
                <option value="">Todos os arremessos</option>
                {arremessos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </label>
          )}
          <div className="linha">
            <label>
              Título (opcional)
              <input className="input" value={titulo} maxLength={100} placeholder={info.exemplo} onChange={(e) => setTitulo(e.target.value)} />
            </label>
            <label>
              Prazo (opcional)
              <input className="input" type="date" min={dataLocal(new Date())} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </label>
          </div>
          {erroForm && <p className="erro" role="alert">{erroForm}</p>}
          <div className="acoes">
            <button className="btn btn-primario" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Criar meta'}</button>
            <button className="btn" type="button" onClick={() => setCriando(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {carregado && <AvisoDesatualizado erro={erro} tentarDeNovo={recarregar} />}
      {!carregado ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando metas…" />
      ) : metas.length === 0 ? (
        !criando && <div className="vazio">Nenhuma meta ainda. Que tal “treinar 3x por semana”?</div>
      ) : (
        <ul className="metas">
          {metas.map((m) => {
            const unidade = TIPOS[m.tipo]?.unidade ?? ''
            const vencida = m.prazo && !m.concluida && m.prazo < dataLocal(new Date())
            return (
              <li key={m.id} className={`card meta-item ${m.concluida ? 'concluida' : ''}`}>
                <div className="meta-topo">
                  <strong>{m.concluida ? '✅ ' : ''}{m.titulo}</strong>
                  <button className="remover" aria-label={`Excluir meta ${m.titulo}`} onClick={() => excluir(m)}>×</button>
                </div>
                <BarraProgresso valor={m.atual} alvo={m.alvo} rotulo={m.titulo} />
                <span className="meta">
                  {m.atual}/{m.alvo} {unidade} · {TIPOS[m.tipo]?.rotulo}
                  {m.drillNome && ` · ${m.drillNome}`}
                  {m.prazo && ` · prazo ${formatarData(`${m.prazo}T12:00:00`)}`}
                  {vencida && ' · prazo vencido'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function SecaoTestes() {
  const { tipos } = useTiposTeste()
  const { testes, carregado, erro, recarregar, adicionar, remover } = useTestes()
  const [tipo, setTipo] = useState<TipoTeste>('impulsao')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(dataLocal(new Date()))
  const [erroForm, setErroForm] = useState<string | null>(null)

  const info = tipos.find((t) => t.tipo === tipo)
  const doTipo = useMemo(() => testes.filter((t) => t.tipo === tipo), [testes, tipo])
  const melhor = doTipo.length
    ? (info?.melhor === 'lower' ? Math.min : Math.max)(...doTipo.map((t) => t.valor))
    : null

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const n = Number(valor.replace(',', '.'))
    if (!(n > 0)) return setErroForm('Digite um valor maior que zero.')
    setErroForm(null)
    try {
      // Meio-dia local: a data não muda de dia ao converter para UTC.
      await adicionar({ tipo, valor: n, data: new Date(`${data}T12:00:00`).toISOString() })
      setValor('')
    } catch (e) {
      setErroForm((e as Error).message)
    }
  }

  return (
    <section>
      <h2>Testes físicos</h2>
      <p className="muted">Repita os testes a cada 4–6 semanas para ver a evolução física.</p>

      <div className="chips">
        {tipos.map((t) => (
          <button key={t.tipo} className={`chip ${tipo === t.tipo ? 'ativo' : ''}`} onClick={() => setTipo(t.tipo)}>
            {t.nome}
          </button>
        ))}
      </div>

      <div className="testes">
        <form className="card form form-solto" onSubmit={enviar}>
          <h3>Novo resultado</h3>
          <div className="linha">
            <label>
              {info?.nome ?? 'Resultado'} ({info?.unidade})
              <input className="input" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            </label>
            <label>
              Data
              <input className="input" type="date" max={dataLocal(new Date())} value={data} onChange={(e) => setData(e.target.value)} />
            </label>
          </div>
          {info && <span className="meta">{info.melhor === 'lower' ? 'Quanto menor, melhor.' : 'Quanto maior, melhor.'}</span>}
          {erroForm && <p className="erro" role="alert">{erroForm}</p>}
          <button className="btn btn-primario" type="submit">Registrar</button>
        </form>

        <div className="card">
          {!carregado ? (
            erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando testes…" />
          ) : doTipo.length === 0 ? (
            <p className="muted">Nenhum resultado de {info?.nome.toLowerCase() ?? 'teste'} ainda.</p>
          ) : (
            <>
              <p>
                Melhor marca: <strong>{melhor?.toLocaleString('pt-BR')} {info?.unidade}</strong>
              </p>
              {doTipo.length > 1 && (
                <GraficoLinha
                  rotulo={`Evolução: ${info?.nome}`}
                  pontos={[...doTipo].reverse().map((t) => ({ rotulo: formatarData(t.data), valor: t.valor }))}
                  sufixo={info?.unidade === 'cm' ? 'cm' : info?.unidade === 's' ? 's' : ''}
                />
              )}
              <ul className="historico compacto">
                {doTipo.map((t) => (
                  <li key={t.id}>
                    <span>{formatarData(t.data)}</span>
                    <strong>{t.valor.toLocaleString('pt-BR')} {info?.unidade}</strong>
                    {t.valor === melhor && <span className="tag">recorde</span>}
                    <button
                      className="remover"
                      aria-label="Excluir resultado"
                      onClick={() => window.confirm('Excluir este resultado?') && remover(t.id).catch((e) => window.alert(e.message))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
