import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { CATEGORIAS } from '../components/FormExercicio'
import { NIVEIS } from '../lib/niveis'
import { DIAS, ROTULO_METRICA, useRotina } from '../store'
import type { BlocoPlano, Categoria, DiaSemana, Nivel } from '../types'
import type { PlanoGuiado } from './SessaoGuiada'

const ORDEM_DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]

export default function Gerador() {
  const navigate = useNavigate()
  const rotina = useRotina()
  const [minutos, setMinutos] = useState(45)
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

  const titulo = nome.trim() || `Treino de ${minutos} min${foco.length ? ` — ${foco.join(', ').toLowerCase()}` : ''}`

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

      <form className="card form form-solto" onSubmit={gerar}>
        <label>
          Tempo disponível: <strong>{minutos} min</strong>
          <input type="range" min={10} max={120} step={5} value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} />
        </label>
        <fieldset className="fieldset">
          <legend>Nível</legend>
          <div className="chips">
            {NIVEIS.map((n) => (
              <button key={n.id} type="button" className={`chip ${nivel === n.id ? 'ativo' : ''}`} aria-pressed={nivel === n.id} onClick={() => setNivel(n.id)}>
                {n.rotulo}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="fieldset">
          <legend>Foco (vazio = treino completo)</legend>
          <div className="chips">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${foco.includes(c) ? 'ativo' : ''}`}
                aria-pressed={foco.includes(c)}
                onClick={() => alternar(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={aquecimento} onChange={(e) => setAquecimento(e.target.checked)} />
          Começar com aquecimento do nível
        </label>
        <button className="btn btn-primario" type="submit" disabled={gerando}>
          {gerando ? 'Montando…' : blocos ? 'Gerar outro' : 'Gerar treino'}
        </button>
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
              aria-label="Usar na rotina"
              disabled={!rotina.carregado}
              onChange={(e) => e.target.value && usarNaRotina(Number(e.target.value) as DiaSemana)}
            >
              <option value="">Usar na rotina de…</option>
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
