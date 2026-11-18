import Final from './ResumoSessao'
import Botao from '../../../shared/ui/Botao'
import { contaLocal } from '../../../shared/api/backend'
import { useAuth } from '../../autenticacao/model/auth'
import { lerLocal, registrosComProblema, removerLocal } from '../model/treino-local'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Contador from '../components/Contador'
import { Carregando, ErroCarga, EstadoVazio } from '../../../shared/ui/Estado'
import ComoFazer from '../../demonstracoes/ComoFazer'
import { DIAS, ROTULO_METRICA } from '../../../shared/lib/formatacao'
import { useDrills } from '../../treinos/model/usarExercicios'
import { useRotina } from '../../rotina/model/usarRotina'
import { useSessoes } from '../model/usarSessoes'
import type { BlocoPlano, DiaSemana, Drill } from '../../../shared/types'

import type { PlanoGuiado, Rascunho } from '../model/sessao'
import { rascunhoValido } from '../model/sessao'
import { useExecucao } from '../model/usarExecucao'
import { useTreinoOffline } from '../model/usarTreinoOffline'
import { planoValido } from '../model/treino-offline'
export type { PlanoGuiado } from '../model/sessao'
const MINUTOS_PADRAO = 10
const relogio = (s: number) => `${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`

export default function SessaoGuiada() {
  const { usuario } = useAuth()
  // O sub identifica a conta mesmo quando /auth/me está indisponível durante a reabertura offline.
  const conta = String(usuario?.id ?? contaLocal() ?? 'visitante')
  return <SessaoDaConta key={conta} conta={conta} />
}

function SessaoDaConta({ conta }: { conta: string }) {
  const [rascunho, setRascunho] = useState<Rascunho | null>(() => {
    const salvo = lerLocal<Rascunho>(conta, 'rascunho')
    return rascunhoValido(salvo) ? salvo : null
  })
  const [retomar, setRetomar] = useState(false)
  const [avisoRascunho, setAvisoRascunho] = useState('')
  const [rascunhoInvalido, setRascunhoInvalido] = useState(() => registrosComProblema(conta).some((k) => k.endsWith('.rascunho')))
  useEffect(() => {
    const atualizar = () => setRascunhoInvalido(registrosComProblema(conta).some((k) => k.endsWith('.rascunho')))
    window.addEventListener('treino-local', atualizar)
    window.addEventListener('storage', atualizar)
    return () => { window.removeEventListener('treino-local', atualizar); window.removeEventListener('storage', atualizar) }
  }, [conta])
  const local = useLocation()
  const [params] = useSearchParams()
  const recebido = local.state as PlanoGuiado | null
  const rotina = useRotina()
  const drills = useDrills()
  const offline = useTreinoOffline(conta)
  const [usarPreparado, setUsarPreparado] = useState(false)
  const disponibilidade = { ...offline, online: offline.online && !usarPreparado }
  const hoje = new Date().getDay() as DiaSemana

  // Sem plano recebido, usa o treino de hoje da rotina (10 min por exercício).
  const planoOnline = useMemo<PlanoGuiado | null>(() => {
    if (planoValido(recebido)) return recebido
    if (params.get('hoje') === null || !rotina.carregado || !drills.carregado) return null
    const blocos = rotina.rotina[hoje].flatMap((id, i): BlocoPlano[] => {
      const d = drills.drillPorId(id)
      return d ? [{ drillId: d.id, nome: d.nome, categoria: d.categoria, metrica: d.metrica, minutos: rotina.duracoes?.[hoje]?.[i] ?? MINUTOS_PADRAO }] : []
    })
    return { titulo: `Treino de ${DIAS[hoje].toLowerCase()}`, blocos }
  }, [recebido, params, rotina.carregado, rotina.rotina, drills.carregado, drills, hoje])
  // O plano aceito não muda sob os pés do atleta durante reconexão/revalidação.
  const selecionado = useRef<PlanoGuiado | null>(null)
  const candidato = (usarPreparado ? offline.pacote?.plano : planoOnline) ?? (!offline.online ? offline.pacote?.plano ?? null : null)
  if (!selecionado.current && candidato) selecionado.current = candidato
  const plano = selecionado.current

  if (rascunhoInvalido) return <section className="card"><h1>Rascunho precisa de revisão</h1><p>Exporte os dados pelo aviso de treinos neste aparelho antes de descartar o registro inválido e iniciar outro treino.</p></section>
  if (rascunho && !retomar) return <section className="card">
    <h1>Treino em andamento</h1>
    <p>{rascunho.plano.titulo}. Retome de onde parou; o relógio volta pausado.</p>
    {avisoRascunho && <p role="alert">{avisoRascunho}</p>}
    <Botao className="btn btn-primario" onClick={() => setRetomar(true)}>Retomar treino</Botao>
    <Botao className="btn" onClick={() => {
      const atual = lerLocal<Rascunho>(conta, 'rascunho')
      if (JSON.stringify(atual) !== JSON.stringify(rascunho)) { setAvisoRascunho('O rascunho mudou em outra aba. Reabra a página para conferir antes de descartar.'); return }
      try { removerLocal(conta, 'rascunho'); setRascunho(null) } catch { setAvisoRascunho('Não foi possível descartar o rascunho neste aparelho.') }
    }}>Descartar rascunho</Botao>
  </section>
  if (rascunho && retomar) return <Execucao key={conta} plano={rascunho.plano} conta={conta} rascunho={rascunho} offline={disponibilidade} catalogo={drills.drills} />
  if (!plano) {
    if (!offline.online) return <section className="card"><h1>Nenhum treino preparado neste aparelho</h1><p>Com conexão, abra o treino e escolha “Preparar este treino offline”. Rascunhos e sessões pendentes continuam preservados nesta conta.</p></section>
    if (params.get('hoje') !== null) {
      const erro = rotina.erro ?? drills.erro
      if (!rotina.carregado || !drills.carregado)
        return erro ? <><ErroCarga erro={erro} tentarDeNovo={() => { rotina.recarregar(); drills.recarregar() }} />{offline.pacote && <Botao onClick={() => setUsarPreparado(true)}>Abrir treino preparado neste aparelho</Botao>}</> : <Carregando texto="Montando o treino de hoje" />
    }
    return <SemPlano />
  }
  if (plano.blocos.length === 0) return <SemPlano hoje />
  return <Execucao key={conta} plano={plano} conta={conta} offline={disponibilidade} catalogo={drills.drills} />
}

function SemPlano({ hoje = false }: { hoje?: boolean }) {
  return (
    <>
      <h1>Sessão guiada</h1>
      <EstadoVazio acao={<Link to="/rotina" className="btn btn-primario">Gerar a rotina da semana</Link>}>
        {hoje ? 'Nenhum treino na rotina de hoje. ' : 'Escolha o que treinar primeiro. '}
      </EstadoVazio>
    </>
  )
}

function Execucao({ plano, conta, rascunho, offline, catalogo }: { plano: PlanoGuiado; conta: string; rascunho?: Rascunho; offline: ReturnType<typeof useTreinoOffline>; catalogo: Drill[] }) {
  const navigate = useNavigate()
  const { adicionar } = useSessoes()
  const { blocos } = plano
  const { indice, restante, rodando, reps, setReps, setRestante, entradas, zonas, total, inicio, clientId, diario, setDiario, erroLocal,
    contador, bloco, comecar, concluir, alternarRelogio, aoGuardar } = useExecucao(plano, conta, rascunho)

  if (indice === -1) {
    const minutos = blocos.reduce((t, b) => t + b.minutos, 0)
    return (
      <>
        <h1>{plano.titulo}</h1>
        <p className="muted">
          {blocos.length} exercícios · {minutos} min. O cronômetro avisa com bipes no fim de cada bloco e a tela fica acesa.
        </p>
        <ol className="plano">
          {blocos.map((b, i) => (
            <li key={`${b.drillId}-${i}`} className="card plano-item">
              <span className={`tag tag-${b.categoria}`}>{b.categoria}</span>
              <strong>{b.nome}</strong>
              <span className="meta">{b.minutos} min</span>
            </li>
          ))}
        </ol>
        <Botao className="btn btn-primario btn-grande" onClick={() => comecar(0)}>
          Começar
        </Botao>
        <section className="card" aria-label="Disponibilidade offline">
          {!offline.online ? <p role="status">Sem conexão. Usando o treino preparado em {offline.pacote ? new Date(offline.pacote.preparadoEm).toLocaleString('pt-BR') : 'outro momento'}. Os resultados serão guardados neste aparelho ao salvar.</p> : <>
            <Botao disabled={offline.preparando || !catalogo.length} onClick={() => void offline.preparar(plano, catalogo)}>{offline.preparando ? 'Preparando treino' : 'Preparar este treino offline'}</Botao>
            {offline.pacote && <p role="status">Treino “{offline.pacote.plano.titulo}” preparado neste aparelho em {new Date(offline.pacote.preparadoEm).toLocaleString('pt-BR')}. Preparar novamente substitui essa cópia.</p>}
          </>}
          <p className="meta">Inclui exercícios, instruções e contadores deste plano. Demonstrações animadas precisam de conexão. Dias de programa são confirmados pelo servidor ao sincronizar.</p>
          {offline.erro && <p className="erro" role="alert">{offline.erro}</p>}
        </section>
      </>
    )
  }

  if (!bloco) return <Final aoGuardar={aoGuardar} conta={conta} clientId={clientId} diario={diario} setDiario={setDiario} erroLocal={erroLocal} plano={plano} entradas={entradas} zonas={zonas} segundos={total} inicio={inicio} salvar={adicionar} aoSalvar={() => { aoGuardar(); navigate(plano.programa ? `/programas/${plano.programa.id}` : '/') }} />

  const acabou = restante <= 0
  return (
    <div className="guiada">
      {!offline.online && <p className="meta">Sem conexão · salve ao terminar para guardar os resultados neste aparelho.</p>}
      {erroLocal && <p className="erro" role="alert">{erroLocal}</p>}
      <div className="guiada-topo">
        <span className="meta">
          Exercício {indice + 1} de {blocos.length}
        </span>
        <div className="guiada-passos" aria-hidden>
          {blocos.map((_, i) => (
            <span key={i} className={i < indice ? 'feito' : i === indice ? 'atual' : ''} />
          ))}
        </div>
      </div>

      <span className={`tag tag-${bloco.categoria}`}>{bloco.categoria}</span>
      <h1 className="guiada-nome">{bloco.nome}</h1>
      <p className="meta">{ROTULO_METRICA[bloco.metrica]}</p>

      <div className="guiada-treino">
        <ComoFazer key={indice} drillId={bloco.drillId} nome={bloco.nome} somenteTexto={!offline.online} descricaoOffline={offline.pacote?.exercicios.find((d) => d.id === bloco.drillId)?.descricao} />

        <div className="guiada-painel">
          <div className={`guiada-relogio ${acabou ? 'esgotado' : ''}`} aria-live="off">
            {acabou ? `+${relogio(-restante)}` : relogio(restante)}
          </div>
          {acabou && <p className="guiada-aviso" role="status">Tempo! Siga para o próximo quando terminar.</p>}

          <div className="acoes centro-flex">
            <Botao className="btn" onClick={alternarRelogio}>
              {rodando ? 'Pausar' : 'Continuar'}
            </Botao>
            <Botao className="btn" onClick={() => setRestante((r) => r + 60)}>+1 min</Botao>
          </div>

          {bloco.metrica === 'acertos' && (
            <div className="card guiada-registro">
              <Contador contador={contador} />
            </div>
          )}
          {bloco.metrica === 'repeticoes' && (
            <div className="card guiada-registro">
              <div className="contador-placar">
                <div>
                  <strong>{reps}</strong>
                  <span className="meta">repetições</span>
                </div>
              </div>
              <div className="contador-botoes">
                <Botao className="btn contador-toque contador-toque-acerto" onClick={() => setReps((r) => r + 1)}><strong>+1</strong></Botao>
                <Botao className="btn contador-toque contador-toque-acerto" onClick={() => setReps((r) => r + 5)}><strong>+5</strong></Botao>
                <Botao className="btn contador-toque contador-toque-erro" onClick={() => setReps((r) => Math.max(0, r - 1))}><strong>−1</strong></Botao>
              </div>
            </div>
          )}

          <div className="acoes centro-flex guiada-acoes">
            <Botao className="btn btn-primario btn-grande" onClick={() => concluir(true)}>
              {indice + 1 === blocos.length ? 'Concluir treino' : 'Próximo exercício →'}
            </Botao>
            <Botao className="btn" onClick={() => concluir(false)}>Pular</Botao>
          </div>
        </div>
      </div>
    </div>
  )
}
