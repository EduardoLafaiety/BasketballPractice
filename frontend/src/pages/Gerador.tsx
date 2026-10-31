import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { CATEGORIAS } from '../components/FormExercicio'
import { NIVEIS, ROTULO_NIVEL } from '../lib/niveis'
import { DIAS, ROTULO_METRICA, useRotina } from '../store'
import type { BlocoPlano, Categoria, DiaSemana, Nivel } from '../types'
import type { PlanoGuiado } from './SessaoGuiada'

const ORDEM_DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]
const ATALHOS_MINUTOS = [15, 30, 45, 60, 90]

export default function Gerador() {
  const navigate = useNavigate()
  const rotina = useRotina()
  const [parametros] = useSearchParams()
  const [minutos, setMinutos] = useState(() => {
    // O atalho "treino rápido" da página inicial já chega com o tempo escolhido; só valem os valores do controle.
    const pedido = Number(parametros.get('minutos'))
    return pedido >= 10 && pedido <= 120 && pedido % 5 === 0 ? pedido : 45
  })
  const [nivel, setNivel] = useState<Nivel>('iniciante')
  const [foco, setFoco] = useState<Categoria[]>([])
  const [aquecimento, setAquecimento] = useState(true)
  const [blocos, setBlocos] = useState<BlocoPlano[] | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  const alternar = (c: Categoria) => setFoco((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]))

  async function gerar(e?: FormEvent) {
    e?.preventDefault()
    setGerando(true)
    setErro(null)
    setAviso(null)
    try {
      setBlocos(await api.gerarTreino(minutos, foco, aquecimento, undefined, nivel))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setGerando(false)
    }
  }

  const resumo = [
    `${minutos} min`,
    ROTULO_NIVEL[nivel],
    foco.length ? foco.join(', ') : 'Treino completo',
    aquecimento ? 'Com aquecimento' : 'Sem aquecimento',
  ].join(' · ')

  const titulo = nome.trim() ||`Treino de ${minutos} min${foco.length ? ` — ${foco.join(', ').toLowerCase()}` : ''}`

  function iniciar() {
    if (!blocos) return
    const plano: PlanoGuiado = { titulo, blocos }
    navigate('/sessao', { state: plano })
  }

  async function salvarComoTreino() {
    if (!blocos) return
    setErro(null)
    try {
      await api.salvarPlano(titulo, blocos)
      setAviso(`"${titulo}" foi salvo nos seus treinos.`)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  function usarNaRotina(dia: DiaSemana) {
    if (!blocos) return
    const substituir =
      rotina.rotina[dia].length === 0 || window.confirm(`Substituir os treinos de ${DIAS[dia].toLowerCase()} na rotina?`)
    if (!substituir) return
    rotina.alterarDia(dia, () => blocos.map((b) => b.drillId))
    setAviso(`Plano colocado na rotina de ${DIAS[dia].toLowerCase()}.`)
  }

  return (
    <>
      <h1>Gerador de treino</h1>
      <p className="muted">Diga quanto tempo você tem e o que quer treinar: o app monta a sessão com a biblioteca de exercícios.</p>

      <form className="gerador" onSubmit={gerar}>
        <div className="gerador-tempo placar-preto">
          <label>
            <span className="meta">Tempo disponível</span>
            <strong className="timer-relogio">{minutos}<small> min</small></strong>
            <input type="range" min={10} max={120} step={5} value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} />
          </label>
          <div className="gerador-escala meta" aria-hidden><span>10 min</span><span>120 min</span></div>
          <div className="chips">
            {ATALHOS_MINUTOS.map((m) => (
              <button key={m} type="button" className={`chip ${minutos === m ? 'ativo' : ''}`} aria-pressed={minutos === m} onClick={() => setMinutos(m)}>
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="gerador-passos card">
          <fieldset className="gerador-passo">
            <legend><span aria-hidden>01</span>Nível</legend>
            <div className="niveis">
              {NIVEIS.map((n) => (
                <button key={n.id} type="button" className={`nivel-opcao ${nivel === n.id ? 'ativo' : ''}`} aria-pressed={nivel === n.id} onClick={() => setNivel(n.id)}>
                  <strong>{n.rotulo}</strong>
                  <span>{n.foco}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="gerador-passo">
            <legend><span aria-hidden>02</span>Foco<small className="meta">Vazio = treino completo</small></legend>
            <div className="gerador-focos">
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`gerador-foco tag tag-${c} ${foco.includes(c) ? 'ativo' : ''}`}
                  aria-pressed={foco.includes(c)}
                  onClick={() => alternar(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="gerador-passo gerador-aquecimento">
            <span className="gerador-numero" aria-hidden>03</span>
            <span>Começar com aquecimento do nível</span>
            <input type="checkbox" checked={aquecimento} onChange={(e) => setAquecimento(e.target.checked)} />
          </label>
        </div>

        <div className="gerador-acao placar-preto">
          <p className="meta">{resumo}</p>
          <button className="btn btn-primario btn-grande" type="submit" disabled={gerando}>
            {gerando ? 'Montando…' : blocos ? 'Gerar outro' : 'Gerar treino'}
          </button>
        </div>
      </form>

      {erro && <p className="erro" role="alert">{erro}</p>}

      {blocos && (
        <section>
          <h2>Seu treino</h2>
          <ol className="plano">
            {blocos.map((b, i) => (
              <li key={`${b.drillId}-${i}`} className="card plano-item">
                <span className={`tag tag-${b.categoria}`}>{b.categoria}</span>
                <strong>{b.nome}</strong>
                <span className="meta">
                  {b.minutos} min · {ROTULO_METRICA[b.metrica]}
                </span>
              </li>
            ))}
          </ol>

          <label className="form-inline">
            Nome do treino
            <input className="input" value={nome} placeholder={titulo} maxLength={100} onChange={(e) => setNome(e.target.value)} />
          </label>

          <div className="acoes">
            <button className="btn btn-primario" onClick={iniciar}>Começar sessão guiada</button>
            <button className="btn" onClick={salvarComoTreino}>Salvar como treino</button>
            <select
              className="input select"
              value=""
              aria-label="Definir rotina"
              disabled={!rotina.carregado}
              onChange={(e) => e.target.value && usarNaRotina(Number(e.target.value) as DiaSemana)}
            >
              <option value="">Definir rotina</option>
              {ORDEM_DIAS.map((d) => (
                <option key={d} value={d}>{DIAS[d]}</option>
              ))}
            </select>
          </div>
          {aviso && <p className="sucesso" role="status">{aviso}</p>}
          {rotina.erroSalvar && <p className="erro" role="alert">Não foi possível salvar a rotina: {rotina.erroSalvar.message}</p>}
        </section>
      )}
    </>
  )
}
