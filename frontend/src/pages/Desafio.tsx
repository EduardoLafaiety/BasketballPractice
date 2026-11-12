import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataLocal } from '../api'
import Contador, { useContador } from '../components/Contador'
import { Figura } from '../components/rolagem'
import { COREOGRAFIAS } from '../demonstracoes/coreografias'
import { Carregando, ErroCarga } from '../components/Estado'
import Icone from '../components/Icone'
import { apiDesafio, useDesafioDoDia, type Desafio, type ResultadoDesafio } from '../desafio/api'
import { bipe, vibrar } from '../lib/audio'
import { useTelaLigada } from '../lib/telaLigada'

type Fase = 'pronto' | 'rodando' | 'fim'

const relogio = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** "20 arremessos" ou "2 min"; usado no Início também. */
export const formatoDesafio = (d: Desafio) =>
  d.modo === 'tentativas' ? `${d.tentativas} arremessos` : d.segundos! % 60 ? `${d.segundos} s` : `${d.segundos! / 60} min`

/** Horas e minutos até a meia-noite local, quando entra o próximo desafio. */
function ateAmanha(agora = new Date()) {
  const amanha = new Date(agora)
  amanha.setHours(24, 0, 0, 0)
  const min = Math.ceil((amanha.getTime() - agora.getTime()) / 60000)
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`
}

export default function DesafioDoDia() {
  const { hoje, erro, recarregar, enviar } = useDesafioDoDia()
  const historico = useHistorico(hoje?.resultado?.dia)

  if (!hoje) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Sorteando o desafio de hoje" />

  return (
    <>
      <h1>Desafio do dia</h1>
      <p className="muted">O mesmo desafio para todo mundo, trocado à meia-noite. Vale a primeira tentativa, e o resultado conta como treino na sua sequência de dias.</p>
      {/* No computador: o desafio à esquerda; à direita, o exercício animado e a última semana. */}
      <div className="desafio-corpo">
        <section className="card desafio">
          <span className="rotulo-forte">{formatoDesafio(hoje.desafio)} · meta: {hoje.desafio.meta} cestas</span>
          <h2 className="sem-margem">{hoje.desafio.titulo}</h2>
          <p>{hoje.desafio.descricao}</p>
          <p className="meta">Exercício: {hoje.desafio.exercicio}</p>
          {hoje.resultado ? <Resultado resultado={hoje.resultado} /> : <Execucao desafio={hoje.desafio} enviar={enviar} />}
        </section>
        <aside className="desafio-lado">
          {COREOGRAFIAS[hoje.desafio.exercicio] && (
            <div className="card desafio-demo">
              <span className="rotulo-forte">Como fazer</span>
              <Figura nome={hoje.desafio.exercicio} />
            </div>
          )}
          <UltimaSemana lista={historico} />
        </aside>
      </div>
      <Historico lista={historico} />
    </>
  )
}

/** Resultados dos últimos desafios; recarrega quando o de hoje é salvo. */
function useHistorico(atualizado?: string) {
  const [lista, setLista] = useState<ResultadoDesafio[] | null>(null)
  useEffect(() => {
    apiDesafio.historico().then(setLista, () => setLista([]))
  }, [atualizado])
  return lista
}

/** Os últimos 7 dias, de hoje para trás: medalha no cumprido, ponto no feito e vazio no dia sem desafio. */
function UltimaSemana({ lista }: { lista: ResultadoDesafio[] | null }) {
  if (!lista) return null
  const porDia = new Map(lista.map((r) => [r.dia, r]))
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  return (
    <div className="card desafio-semana">
      <span className="rotulo-forte">Últimos 7 dias</span>
      <ol>
        {dias.map((d) => {
          const r = porDia.get(dataLocal(d))
          return (
            <li key={d.toISOString()} className={r ? (r.cumprido ? 'cumprido' : 'feito') : undefined}>
              <span>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
              <i aria-hidden>{r?.cumprido ? <Icone nome="medalha" tamanho={16} /> : null}</i>
              <span className="escondido">{r ? (r.cumprido ? 'cumprido' : 'feito') : 'sem desafio'}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Resultado({ resultado }: { resultado: ResultadoDesafio }) {
  const pct = resultado.tentativas ? Math.round((resultado.acertos / resultado.tentativas) * 100) : 0
  return (
    <div className={`desafio-resultado ${resultado.cumprido ? 'cumprido' : ''}`} role="status">
      <Icone nome={resultado.cumprido ? 'medalha' : 'check'} tamanho={28} />
      <div>
        <strong>{resultado.acertos}/{resultado.tentativas}</strong>
        <span>{resultado.cumprido ? 'Desafio cumprido' : 'Desafio feito'} · {pct}% de aproveitamento</span>
      </div>
      <p className="meta">Próximo desafio em {ateAmanha()}. <Link to="/metas" className="link">Ver sequência de dias</Link></p>
    </div>
  )
}

function Execucao({ desafio, enviar }: { desafio: Desafio; enviar: ReturnType<typeof useDesafioDoDia>['enviar'] }) {
  const contador = useContador()
  const [fase, setFase] = useState<Fase>('pronto')
  const [restante, setRestante] = useState(desafio.segundos ?? 0)
  const [inicio, setInicio] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const porTempo = desafio.modo === 'tempo'

  useTelaLigada(fase === 'rodando')

  // Relógio do modo tempo: bipes nos três últimos segundos e um longo no fim.
  useEffect(() => {
    if (fase !== 'rodando' || !porTempo) return
    const t = setInterval(() => setRestante((r) => r - 1), 1000)
    return () => clearInterval(t)
  }, [fase, porTempo])
  useEffect(() => {
    if (fase !== 'rodando' || !porTempo) return
    if (restante > 0 && restante <= 3) bipe(660, 100)
    if (restante <= 0) {
      bipe(990, 500)
      vibrar([200, 100, 200])
      setFase('fim')
    }
  }, [restante, fase, porTempo])

  // Modo tentativas: acaba sozinho no último arremesso.
  useEffect(() => {
    if (fase === 'rodando' && !porTempo && contador.tentativas >= desafio.tentativas!) setFase('fim')
  }, [contador.tentativas, fase, porTempo, desafio.tentativas])

  function comecar() {
    contador.zerar()
    setRestante(desafio.segundos ?? 0)
    setInicio(Date.now())
    setErro(null)
    setFase('rodando')
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      await enviar({
        acertos: contador.acertos,
        tentativas: contador.tentativas,
        sequencia: contador.melhorSequencia,
        segundos: Math.max(1, Math.round((Date.now() - inicio) / 1000)),
      })
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  if (fase === 'pronto') {
    return (
      <button className="btn btn-primario btn-grande" onClick={comecar}>
        Começar desafio <Icone nome="play" />
      </button>
    )
  }

  if (fase === 'fim') {
    return (
      <div className="desafio-fim">
        <p className="desafio-placar" role="status">
          <strong>{contador.acertos}</strong> de {contador.tentativas} {contador.acertos >= desafio.meta ? '· meta batida' : `· meta: ${desafio.meta}`}
        </p>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <div className="acoes">
          <button className="btn btn-primario" onClick={salvar} disabled={salvando || contador.tentativas === 0}>
            {salvando ? 'Salvando' : 'Salvar resultado'}
          </button>
          <button className="btn" onClick={comecar} disabled={salvando}>Recomeçar</button>
        </div>
        {contador.tentativas === 0 && <p className="meta">Nenhum arremesso registrado. Recomece quando estiver na quadra.</p>}
      </div>
    )
  }

  return (
    <div className="desafio-execucao">
      <p className="desafio-relogio" aria-live="off">
        {porTempo ? relogio(Math.max(0, restante)) : `${contador.tentativas}/${desafio.tentativas}`}
      </p>
      <Contador contador={contador} comQuadra={false} />
      <button className="btn" onClick={() => setFase('fim')}>Encerrar agora</button>
    </div>
  )
}

function Historico({ lista }: { lista: ResultadoDesafio[] | null }) {
  if (!lista?.length) return null
  const cumpridos = lista.filter((r) => r.cumprido).length
  return (
    <section>
      <h2>Seus desafios</h2>
      <p className="muted">{cumpridos} de {lista.length} cumpridos nos últimos desafios.</p>
      <ul className="lista-simples">
        {lista.map((r) => (
          <li key={r.dia} className="desafio-historico">
            <span>{new Date(`${r.dia}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            <span>{r.titulo}</span>
            <strong>{r.acertos}/{r.tentativas}</strong>
            {r.cumprido && <Icone nome="medalha" />}
          </li>
        ))}
      </ul>
    </section>
  )
}
