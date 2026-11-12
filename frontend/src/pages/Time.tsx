import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { Carregando, ErroCarga } from '../components/Estado'
import Icone from '../components/Icone'
import SoComServidor from '../components/SoComServidor'
import { useProgramas } from '../programas/api'
import { useDrills } from '../store'
import { apiTime, linkDoTime, useTime, useTimes, type ProgressoAtleta, type Tarefa, type Time } from '../time/api'
import type { PlanoGuiado } from './SessaoGuiada'

// Atrás do aviso da demonstração, dois times de exemplo apagados mostram o que o modo técnico organiza.
const TIMES_EXEMPLO = (
  <div className="grade times-grade">
    {[['Sub-15 da escolinha', '12 atletas · 3 tarefas abertas'], ['Pelada de quinta', '8 atletas · 1 tarefa aberta']].map(([nome, resumo]) => (
      <div key={nome} className="card time-cartao">
        <span className="rotulo-forte">Técnico</span>
        <h2 className="sem-margem">{nome}</h2>
        <span className="meta">{resumo}</span>
      </div>
    ))}
  </div>
)
const AVISO_DEMO = <SoComServidor recurso="O modo técnico" porque="Um time liga a conta do técnico às contas dos atletas." exemplo={TIMES_EXEMPLO} />

/** Executa uma ação da tela guardando o erro para mostrar. */
function useAcao() {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const rodar = async (fazer: () => Promise<unknown>) => {
    setOcupado(true)
    setErro(null)
    try {
      return await fazer()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, erro, rodar }
}

export default function Times() {
  return (
    <>
      <h1>Time</h1>
      <p className="muted">Para técnicos e para quem treina com um. O técnico cria o time, chama os atletas pelo código ou pelo link, passa treinos e programas e acompanha quem está treinando.</p>
      {__DEMO__ ? AVISO_DEMO : <ListaDeTimes />}
    </>
  )
}

function ListaDeTimes() {
  const { times, erro, recarregar } = useTimes()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const criar = useAcao()
  const entrar = useAcao()

  if (!times) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando times" />

  return (
    <>
      {(times.comoTecnico.length > 0 || times.comoAtleta.length > 0) && (
        <div className="grade times-grade">
          {times.comoTecnico.map((t) => (
            <Link key={`t${t.id}`} to={`/time/${t.id}`} className="card time-cartao">
              <span className="rotulo-forte">Você é o técnico</span>
              <h2 className="sem-margem">{t.nome}</h2>
              <span className="meta">{t.atletas} {t.atletas === 1 ? 'atleta' : 'atletas'}</span>
              <span className="link-forte">Abrir <Icone nome="seta" /></span>
            </Link>
          ))}
          {times.comoAtleta.map((t) => (
            <Link key={`a${t.id}`} to={`/time/${t.id}`} className="card time-cartao">
              <span className="rotulo-forte">Técnico: <span className="texto-literal">{t.tecnico}</span></span>
              <h2 className="sem-margem">{t.nome}</h2>
              <span className="link-forte">Ver tarefas <Icone nome="seta" /></span>
            </Link>
          ))}
        </div>
      )}

      <div className="grade times-acoes">
        <form className="card form" onSubmit={(e) => { e.preventDefault(); void criar.rodar(async () => navigate(`/time/${await apiTime.criar(nome.trim())}`)) }}>
          <h3>Sou técnico: criar um time</h3>
          <label>
            Nome do time
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Ex.: Sub-17 da escola" required />
          </label>
          {criar.erro && <p className="erro" role="alert">{criar.erro}</p>}
          <button className="btn btn-primario" type="submit" disabled={criar.ocupado}>Criar time</button>
        </form>
        <form className="card form" onSubmit={(e) => { e.preventDefault(); void entrar.rodar(async () => navigate(`/time/${await apiTime.entrar(codigo.trim())}`)) }}>
          <h3>Sou atleta: entrar num time</h3>
          <label>
            Código que o técnico passou
            <input className="input texto-literal" value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={20} required />
          </label>
          <span className="meta">Ao entrar, o técnico passa a ver os seus treinos da semana, a sequência, a nota do cartão e as tarefas que ele passou.</span>
          {entrar.erro && <p className="erro" role="alert">{entrar.erro}</p>}
          <button className="btn" type="submit" disabled={entrar.ocupado}>Entrar no time</button>
        </form>
      </div>
    </>
  )
}

/** /time/entrar/:codigo — o link que o técnico manda. */
export function EntrarNoTime() {
  const { codigo = '' } = useParams()
  const navigate = useNavigate()
  const [convite, setConvite] = useState<Awaited<ReturnType<typeof apiTime.convite>> | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const acao = useAcao()

  useEffect(() => {
    if (!__DEMO__) apiTime.convite(codigo).then(setConvite, setErro)
  }, [codigo])

  if (__DEMO__) return <><h1>Time</h1>{AVISO_DEMO}</>
  if (erro) return <><h1>Time</h1><ErroCarga erro={erro.message.includes('não encontrado') ? new Error('Este código de time não existe mais. Peça um novo ao técnico.') : erro} /></>
  if (!convite) return <Carregando texto="Abrindo o convite" />
  return (
    <>
      <h1>Time</h1>
      <section className="card convite">
        <span className="rotulo-forte">Técnico: <span className="texto-literal">{convite.tecnico}</span></span>
        <h2 className="sem-margem">{convite.nome}</h2>
        {convite.souTecnico || convite.jaAtleta ? (
          <Link to={`/time/${convite.id}`} className="btn btn-primario">Abrir o time</Link>
        ) : (
          <>
            <p className="muted">Ao entrar, o técnico passa a ver os seus treinos da semana, a sequência de dias, a nota do cartão e as tarefas que ele passar. Você pode sair quando quiser.</p>
            {acao.erro && <p className="erro" role="alert">{acao.erro}</p>}
            <button className="btn btn-primario" disabled={acao.ocupado} onClick={() => acao.rodar(async () => navigate(`/time/${await apiTime.entrar(codigo)}`))}>Entrar no time</button>
          </>
        )}
      </section>
    </>
  )
}

export function TimeDetalhe() {
  const id = Number(useParams().id)
  if (__DEMO__) return <><h1>Time</h1>{AVISO_DEMO}</>
  return <TimeComServidor id={id} />
}

function TimeComServidor({ id }: { id: number }) {
  const { time, erro, recarregar } = useTime(id)
  if (!time) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando o time" />
  return (
    <>
      <Link to="/time" className="link">← Times</Link>
      <h1>{time.nome}</h1>
      {time.papel === 'tecnico' ? <PainelTecnico time={time} /> : <PainelAtleta time={time} />}
    </>
  )
}

const dataCurta = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

function DescricaoTarefa({ tarefa: t }: { tarefa: Tarefa }) {
  return (
    <>
      <span className="rotulo-forte">{t.tipo === 'programa' ? `Programa · ${t.programaNome}` : `Treino · ${t.blocos.reduce((s, b) => s + b.minutos, 0)} min`}{t.prazo && ` · até ${dataCurta(t.prazo)}`}</span>
      <h3>{t.titulo}</h3>
      {t.tipo === 'treino' && <p className="muted">{t.blocos.map((b) => `${b.nome} (${b.minutos} min)`).join(' · ')}</p>}
      {t.notas && <p className="muted texto-literal">{t.notas}</p>}
    </>
  )
}

function PainelAtleta({ time }: { time: Time }) {
  const navigate = useNavigate()
  const acao = useAcao()
  const progresso = (tarefaId: number) => time.progresso?.tarefas.find((t) => t.tarefaId === tarefaId)

  const treinar = (t: Tarefa) => {
    const plano: PlanoGuiado = { titulo: `${time.nome}: ${t.titulo}`, blocos: t.blocos, tarefa: { timeId: time.id, tarefaId: t.id } }
    navigate('/sessao', { state: plano })
  }

  return (
    <>
      <p className="muted">Técnico: <span className="texto-literal">{time.tecnico}</span>. Os treinos que você registra contam para o acompanhamento dele.</p>
      <h2>Tarefas</h2>
      {time.tarefas.length === 0 ? (
        <div className="vazio">O técnico ainda não passou nenhuma tarefa.</div>
      ) : (
        <ul className="lista-simples tarefas">
          {time.tarefas.map((t) => {
            const p = progresso(t.id)
            return (
              <li key={t.id} className={`tarefa ${p?.cumprida ? 'cumprida' : ''}`}>
                <DescricaoTarefa tarefa={t} />
                {t.tipo === 'programa' ? (
                  <div className="acoes">
                    <span className="meta">{p?.comecou ? `${p.feitos} de ${p.total} dias` : 'Ainda não começou'}</span>
                    <Link to={`/programas/${t.programaId}`} className="btn btn-primario">{p?.comecou ? 'Continuar o programa' : 'Abrir o programa'}</Link>
                  </div>
                ) : p?.cumprida ? (
                  <span className="tarefa-feita"><Icone nome="check" /> Feito</span>
                ) : (
                  <div className="acoes">
                    <button className="btn btn-primario" onClick={() => treinar(t)}>Treinar agora</button>
                    <button className="btn" disabled={acao.ocupado} onClick={() => acao.rodar(() => apiTime.concluirTarefa(time.id, t.id))}>Já treinei, marcar como feito</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {acao.erro && <p className="erro" role="alert">{acao.erro}</p>}
      <SairDoTime time={time} />
    </>
  )
}

function SairDoTime({ time }: { time: Time }) {
  const navigate = useNavigate()
  const acao = useAcao()
  const { usuario } = useAuth()
  return (
    <section>
      <button
        className="btn btn-erro"
        disabled={acao.ocupado}
        onClick={() =>
          window.confirm(`Sair do time ${time.nome}? O técnico deixa de ver os seus treinos.`) &&
          acao.rodar(async () => {
            await apiTime.tirar(time.id, usuario!.id)
            navigate('/time')
          })
        }
      >
        Sair do time
      </button>
      {acao.erro && <p className="erro" role="alert">{acao.erro}</p>}
    </section>
  )
}

function ResumoAtleta({ p, tarefas }: { p: ProgressoAtleta; tarefas: Tarefa[] }) {
  return (
    <div className="atleta-numeros">
      <span><strong>{p.sessoesSemana}</strong> {p.sessoesSemana === 1 ? 'treino' : 'treinos'} em 7 dias</span>
      <span><strong>{p.minutosSemana}</strong> min</span>
      <span><strong>{p.sequencia}</strong> dias seguidos</span>
      <span><strong>{p.cartao?.geral ?? '—'}</strong> nota do cartão</span>
      <span className="meta">{p.ultimoTreino ? `Último treino em ${dataCurta(p.ultimoTreino)}` : 'Ainda sem treinos'}</span>
      {tarefas.length > 0 && (
        <span className="meta">
          {tarefas.map((t) => {
            const x = p.tarefas.find((y) => y.tarefaId === t.id)
            return `${t.titulo}: ${x?.cumprida ? 'feito' : t.tipo === 'programa' ? (x?.comecou ? `${x.feitos}/${x.total} dias` : 'não começou') : 'pendente'}`
          }).join(' · ')}
        </span>
      )}
    </div>
  )
}

function PainelTecnico({ time }: { time: Time }) {
  const navigate = useNavigate()
  const acao = useAcao()
  const [aviso, setAviso] = useState<string | null>(null)
  const link = linkDoTime(time.convite!)
  const atletas = time.atletas ?? []
  const ordenados = [...atletas].sort((a, b) => b.progresso.sessoesSemana - a.progresso.sessoesSemana)

  async function convidar() {
    try {
      if (navigator.share) await navigator.share({ text: `Entre no time ${time.nome} no Basketball Practice: ${link}` })
      else {
        await navigator.clipboard.writeText(link)
        setAviso('Link copiado.')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setAviso('Copie o link acima.')
    }
  }

  return (
    <>
      <section className="card time-convite">
        <h2 className="sem-margem">Chamar atletas</h2>
        <p className="muted">Passe o código ou o link. Cada atleta precisa ter conta no Basketball Practice.</p>
        <div className="time-codigo">
          <span className="meta">Código</span>
          <strong className="texto-literal">{time.convite}</strong>
        </div>
        <code className="convite-link texto-literal">{link}</code>
        <div className="acoes">
          <button className="btn btn-primario" onClick={convidar}>Convidar atletas</button>
          <button className="btn" disabled={acao.ocupado} onClick={() => window.confirm('Gerar um código novo? O antigo para de funcionar.') && acao.rodar(() => apiTime.novoConvite(time.id))}>Gerar código novo</button>
        </div>
        {aviso && <p className="meta" role="status">{aviso}</p>}
      </section>

      <section>
        <h2>Atletas</h2>
        {atletas.length === 0 ? (
          <div className="vazio">Nenhum atleta ainda. Mande o código ou o link acima.</div>
        ) : (
          <ul className="lista-simples atletas-lista">
            {ordenados.map((a) => (
              <li key={a.id} className="atleta-linha">
                <div className="atleta-topo">
                  <h3 className="texto-literal">{a.nome}</h3>
                  <button className="remover" aria-label={`Tirar ${a.nome} do time`} onClick={() => window.confirm(`Tirar ${a.nome} do time?`) && acao.rodar(() => apiTime.tirar(time.id, a.id))}>×</button>
                </div>
                <ResumoAtleta p={a.progresso} tarefas={time.tarefas} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Tarefas</h2>
        <NovaTarefa timeId={time.id} />
        {time.tarefas.length > 0 && (
          <ul className="lista-simples tarefas">
            {time.tarefas.map((t) => {
              const cumpriram = atletas.filter((a) => a.progresso.tarefas.find((x) => x.tarefaId === t.id)?.cumprida).length
              return (
                <li key={t.id} className="tarefa">
                  <DescricaoTarefa tarefa={t} />
                  <div className="acoes">
                    <span className="meta">{cumpriram} de {atletas.length} cumpriram</span>
                    <button className="chip" onClick={() => window.confirm(`Apagar a tarefa "${t.titulo}"?`) && acao.rodar(() => apiTime.removerTarefa(time.id, t.id))}>Apagar</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {acao.erro && <p className="erro" role="alert">{acao.erro}</p>}
      <section>
        <button className="btn btn-erro" onClick={() => window.confirm(`Apagar o time ${time.nome}? Os atletas saem dele, mas os treinos de cada um continuam.`) && acao.rodar(async () => { await apiTime.apagar(time.id); navigate('/time') })}>
          Apagar time
        </button>
      </section>
    </>
  )
}

function NovaTarefa({ timeId }: { timeId: number }) {
  const { programas } = useProgramas()
  const { drills } = useDrills()
  const catalogo = drills.filter((d) => !d.personalizado)
  const [tipo, setTipo] = useState<'programa' | 'treino'>('treino')
  const [programaId, setProgramaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [blocos, setBlocos] = useState<{ drillId: string; nome: string; minutos: number }[]>([])
  const [exercicio, setExercicio] = useState('')
  const [minutos, setMinutos] = useState('10')
  const minutosValidos = Math.max(1, Math.min(120, Math.floor(Number(minutos)) || 0))
  const [prazo, setPrazo] = useState('')
  const [notas, setNotas] = useState('')
  const acao = useAcao()

  useEffect(() => {
    if (!programaId && programas?.length) setProgramaId(programas[0].id)
  }, [programas, programaId])
  useEffect(() => {
    if (!exercicio && catalogo.length) setExercicio(catalogo[0].id)
  }, [catalogo, exercicio])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const nomePrograma = programas?.find((p) => p.id === programaId)?.nome ?? ''
    const ok = await acao.rodar(() => apiTime.atribuir(timeId, { tipo, programaId, titulo: titulo.trim() || nomePrograma, blocos, prazo, notas }).then(() => true))
    if (ok) {
      setTitulo('')
      setBlocos([])
      setNotas('')
      setPrazo('')
    }
  }

  return (
    <form className="card form nova-tarefa" onSubmit={enviar}>
      <h3>Nova tarefa</h3>
      <div className="chips" role="group" aria-label="Tipo de tarefa">
        <button type="button" className={`chip ${tipo === 'treino' ? 'ativo' : ''}`} aria-pressed={tipo === 'treino'} onClick={() => setTipo('treino')}>Treino</button>
        <button type="button" className={`chip ${tipo === 'programa' ? 'ativo' : ''}`} aria-pressed={tipo === 'programa'} onClick={() => setTipo('programa')}>Programa</button>
      </div>
      {tipo === 'programa' ? (
        <div className="campo">
          <label htmlFor="tarefa-programa">Programa</label>
          <select id="tarefa-programa" className="input select" value={programaId} onChange={(e) => setProgramaId(e.target.value)}>
            {programas?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      ) : (
        <>
          <div className="linha">
            <div className="campo">
              <label htmlFor="tarefa-exercicio">Exercício</label>
              <select id="tarefa-exercicio" className="input select" value={exercicio} onChange={(e) => setExercicio(e.target.value)}>
                {catalogo.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="tarefa-minutos">Minutos</label>
              <input id="tarefa-minutos" className="input" type="number" min={1} max={120} value={minutos} onChange={(e) => setMinutos(e.target.value)} />
            </div>
          </div>
          <button
            type="button"
            className="chip"
            disabled={!exercicio || blocos.length >= 20 || !Number(minutos)}
            onClick={() => setBlocos((b) => [...b, { drillId: exercicio, nome: catalogo.find((d) => d.id === exercicio)?.nome ?? '', minutos: minutosValidos }])}
          >
            + Adicionar exercício
          </button>
          {blocos.length > 0 && (
            <ol className="tarefa-blocos">
              {blocos.map((b, i) => (
                <li key={i}>
                  {b.nome} · {b.minutos} min
                  <button type="button" className="remover" aria-label={`Tirar ${b.nome}`} onClick={() => setBlocos((x) => x.filter((_, k) => k !== i))}>×</button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      <label>
        Título {tipo === 'programa' && '(opcional)'}
        <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} required={tipo === 'treino'} />
      </label>
      <div className="linha">
        <label>
          Prazo (opcional)
          <input className="input" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>
      </div>
      <label>
        Recado para os atletas (opcional)
        <textarea className="input" rows={2} maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </label>
      {acao.erro && <p className="erro" role="alert">{acao.erro}</p>}
      <button className="btn btn-primario" type="submit" disabled={acao.ocupado || (tipo === 'treino' && blocos.length === 0)}>Passar para o time</button>
    </form>
  )
}
