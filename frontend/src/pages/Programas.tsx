import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BarraProgresso from '../components/BarraProgresso'
import { Carregando, ErroCarga } from '../components/Estado'
import Icone from '../components/Icone'
import { ROTULO_NIVEL } from '../lib/niveis'
import { apiProgramas, usePrograma, useProgramas, type DiaPrograma, type ResumoPrograma } from '../programas/api'
import type { PlanoGuiado } from './SessaoGuiada'

function Progresso({ p }: { p: ResumoPrograma }) {
  if (!p.status.comecado) return <span className="meta">{p.totalDias} dias · cerca de {p.minutosPorDia} min por dia</span>
  return (
    <div className="programa-progresso">
      <BarraProgresso valor={p.status.feitos} alvo={p.status.total} rotulo={`Progresso em ${p.nome}`} />
      <span className="meta">
        {p.status.concluido ? 'Programa concluído' : `${p.status.feitos} de ${p.status.total} dias`}
        {!p.status.concluido && (p.status.disponivelHoje ? ` · dia ${p.status.proximoDia} liberado` : ' · próximo dia amanhã')}
      </span>
    </div>
  )
}

/** As quatro semanas do programa em quadradinhos: feitos, o próximo dia e os que faltam. */
function Semanas({ p }: { p: ResumoPrograma }) {
  const proximo = p.status.comecado && !p.status.concluido ? p.status.proximoDia : 0
  return (
    <ol className="programa-semanas" aria-hidden>
      {Array.from({ length: p.totalDias }, (_, i) => (
        <li key={i} className={i < p.status.feitos ? 'feito' : i + 1 === proximo ? 'proximo' : undefined} />
      ))}
    </ol>
  )
}

const chamada = (p: ResumoPrograma) =>
  !p.status.comecado ? 'Ver o programa' : p.status.concluido ? 'Rever o programa' : p.status.proximoDia ? `Continuar: dia ${p.status.proximoDia}` : 'Continuar'

export default function Programas() {
  const { programas, erro, recarregar } = useProgramas()
  return (
    <>
      <h1>Programas</h1>
      <p className="muted">Planos de quatro semanas que liberam um treino por dia. Faça o do dia, volte amanhã para o próximo e acompanhe a barra até o fim.</p>
      {!programas ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando programas…" />
      ) : (
        <div className="grade programas-grade">
          {programas.map((p) => (
            <Link key={p.id} to={`/programas/${p.id}`} className="card programa-cartao">
              <span className="rotulo-forte">{p.foco} · {ROTULO_NIVEL[p.nivel]}</span>
              <h2 className="sem-margem">{p.nome}</h2>
              <p className="muted">{p.resumo}</p>
              <Semanas p={p} />
              <Progresso p={p} />
              <span className="link-forte">{chamada(p)} <Icone nome="seta" /></span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

const ROTULO_ESTADO: Record<DiaPrograma['estado'], string> = {
  done: 'Feito',
  available: 'Liberado hoje',
  tomorrow: 'Libera amanhã',
  locked: 'Bloqueado',
}

export function ProgramaDetalhe() {
  const { id = '' } = useParams()
  const { programa, erro, recarregar } = usePrograma(id)
  const navigate = useNavigate()
  const [ocupado, setOcupado] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)

  if (!programa) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando o programa…" />

  async function acao(fazer: () => Promise<void>) {
    setOcupado(true)
    setErroAcao(null)
    try {
      await fazer()
    } catch (e) {
      setErroAcao((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const treinar = (d: DiaPrograma) => {
    const plano: PlanoGuiado = { titulo: `${programa.nome}: dia ${d.dia}`, blocos: d.blocos, programa: { id: programa.id, dia: d.dia } }
    navigate('/sessao', { state: plano })
  }

  const { status } = programa
  const hoje = programa.dias.find((d) => d.estado === 'available' || d.estado === 'tomorrow')

  return (
    <>
      <Link to="/programas" className="link">← Programas</Link>
      <h1>{programa.nome}</h1>
      <p className="muted">{programa.resumo}</p>
      <section className="card programa-topo">
        <span className="rotulo-forte">{programa.foco} · {ROTULO_NIVEL[programa.nivel]} · {programa.totalDias} dias</span>
        <Progresso p={programa} />
        {erroAcao && <p className="erro" role="alert">{erroAcao}</p>}
        <div className="acoes">
          {!status.comecado ? (
            <button className="btn btn-primario" disabled={ocupado} onClick={() => acao(() => apiProgramas.comecar(programa.id))}>
              Começar programa <Icone nome="play" />
            </button>
          ) : (
            <>
              {hoje?.estado === 'available' && (
                <button className="btn btn-primario" onClick={() => treinar(hoje)}>
                  Treinar o dia {hoje.dia} <Icone nome="seta" />
                </button>
              )}
              <button
                className="btn"
                disabled={ocupado}
                onClick={() => window.confirm('Recomeçar do dia 1? O progresso deste programa será apagado.') && acao(() => apiProgramas.comecar(programa.id))}
              >
                Recomeçar
              </button>
              <button
                className="btn"
                disabled={ocupado}
                onClick={() => window.confirm('Sair do programa? O progresso será apagado.') && acao(() => apiProgramas.sair(programa.id))}
              >
                Sair do programa
              </button>
            </>
          )}
        </div>
      </section>

      <ol className="programa-dias">
        {programa.dias.map((d) => (
          <li key={d.dia} className={`programa-dia ${d.estado}`}>
            <span className="programa-dia-numero" aria-hidden>{String(d.dia).padStart(2, '0')}</span>
            <div className="programa-dia-corpo">
              <h3>Dia {d.dia} · {d.titulo}</h3>
              <p className="muted">{d.blocos.map((b) => `${b.nome} (${b.minutos} min)`).join(' · ')}</p>
            </div>
            <span className="programa-dia-estado">
              {d.estado === 'done' ? <Icone nome="check" /> : d.estado === 'locked' ? <Icone nome="cadeado" /> : <Icone nome="relogio" />}
              {ROTULO_ESTADO[d.estado]}
            </span>
            {d.estado === 'available' && (
              <div className="programa-dia-acoes">
                <button className="btn btn-primario" onClick={() => treinar(d)}>Treinar agora</button>
                <button className="btn" disabled={ocupado} onClick={() => acao(() => apiProgramas.concluirDia(programa.id, d.dia))}>
                  Já treinei, marcar como feito
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </>
  )
}
