import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Contador, { useContador, zonasParaLista } from '../components/Contador'
import { Carregando, ErroCarga } from '../components/Estado'
import { coreografiaDe } from '../demonstracoes/coreografias'
import Demonstracao from '../demonstracoes/Demonstracao'
import FormExercicio from '../components/FormExercicio'
import { ROTULO_NIVEL } from '../lib/niveis'
import { useTelaLigada } from '../lib/telaLigada'
import { ROTULO_METRICA, useDrills, useSessoes } from '../store'

const COMO_REGISTRAR = {
  acertos: 'Use o contador ao vivo (ou digite no fim) para anotar quantos arremessos caíram.',
  repeticoes: 'Anote quantas repetições completou no total.',
  tempo: 'Use o cronômetro: o tempo dele é salvo com a sessão.',
}

export default function TreinoDetalhe() {
  const { id = '' } = useParams()
  const drills = useDrills()
  const { drillPorId, carregado, erro, recarregar } = drills
  const drill = drillPorId(id)
  const navigate = useNavigate()
  const { adicionar } = useSessoes()
  const contador = useContador()

  const [segundos, setSegundos] = useState(0)
  const [rodando, setRodando] = useState(false)
  const [duracao, setDuracao] = useState('')
  // Campos manuais: se ficarem vazios, valem os números do contador ao vivo.
  const [acertos, setAcertos] = useState('')
  const [tentativas, setTentativas] = useState('')
  const [repeticoes, setRepeticoes] = useState('')
  const [esforco, setEsforco] = useState(3)
  const [cansaco, setCansaco] = useState(3)
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  useTelaLigada(rodando)

  useEffect(() => {
    if (!rodando) return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [rodando])

  if (!drill) {
    if (!carregado) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando treino…" />
    return (
      <div className="vazio">
        Treino não encontrado. <Link to="/treinos" className="link">Voltar aos treinos</Link>
      </div>
    )
  }

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0')
  const ss = String(segundos % 60).padStart(2, '0')
  const contaArremessos = drill.metrica === 'acertos'
  const coreografia = coreografiaDe(drill.nome, drill.personalizado)
  const a = acertos === '' ? contador.acertos : Number(acertos)
  const t = tentativas === '' ? contador.tentativas : Number(tentativas)
  const arremessoInvalido = contaArremessos && a > t
  const minutosCronometro = segundos > 0 ? Math.max(1, Math.round(segundos / 60)) : 0
  const duracaoMin = Number(duracao) || minutosCronometro
  const semDuracao = duracaoMin < 1
  // A sequência só vale se os números vieram do contador (digitados à mão, não dá para saber).
  const sequencia = acertos === '' && contador.melhorSequencia > 0 ? Math.min(contador.melhorSequencia, a) : undefined

  async function registrar(e: FormEvent) {
    e.preventDefault()
    if (!drill || arremessoInvalido || semDuracao || salvando) return
    setSalvando(true)
    setErroSalvar(null)
    setRodando(false)
    try {
      await adicionar({
        data: new Date().toISOString(),
        duracaoMin,
        esforco,
        cansaco,
        notas: notas.trim() || undefined,
        entradas: [
          {
            drillId: drill.id,
            ...(contaArremessos && t > 0 ? { acertos: a, tentativas: t, sequencia } : {}),
            ...(drill.metrica === 'repeticoes' && repeticoes !== '' ? { repeticoes: Number(repeticoes) } : {}),
            ...(drill.metrica === 'tempo' ? { segundos: segundos || duracaoMin * 60 } : {}),
          },
        ],
        zonas: contaArremessos ? zonasParaLista(contador.zonas) : [],
      })
      navigate('/desempenho')
    } catch (e) {
      setErroSalvar((e as Error).message)
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!drill || !window.confirm(`Excluir o exercício "${drill.nome}"?`)) return
    try {
      await drills.remover(drill.id)
      navigate('/treinos')
    } catch (e) {
      window.alert((e as Error).message)
    }
  }

  return (
    <>
      <Link to="/treinos" className="link voltar">← Treinos</Link>
      <div className="detalhe">
        <div>
          <div className="drill-card-topo">
            <span className={`tag tag-${drill.categoria}`}>{drill.categoria}</span>
            <span className="meta">{ROTULO_METRICA[drill.metrica]}</span>
            {drill.nivel && <span className="meta">{ROTULO_NIVEL[drill.nivel]}{drill.aquecimento ? ' · Aquecimento' : ''}</span>}
          </div>
          <h1>{drill.nome}</h1>
          <p className="muted">{drill.descricao}</p>

          {drill.personalizado && !editando && (
            <div className="acoes">
              <button className="chip" onClick={() => setEditando(true)}>Editar exercício</button>
              <button className="chip" onClick={excluir}>Excluir</button>
            </div>
          )}
          {editando && (
            <FormExercicio
              inicial={drill}
              aoCancelar={() => setEditando(false)}
              aoSalvar={async (dados) => {
                await drills.salvar(dados, drill.id)
                setEditando(false)
              }}
            />
          )}

          {coreografia && (
            <>
              <h2>Como fazer</h2>
              <Demonstracao coreografia={coreografia} nome={drill.nome} />
            </>
          )}

          <h2>Como registrar</h2>
          <p className="muted">{COMO_REGISTRAR[drill.metrica]}</p>

          {contaArremessos && (
            <section className="card">
              <h3>Contador ao vivo</h3>
              <Contador contador={contador} />
            </section>
          )}
        </div>

        <aside className="card painel">
          <div className="cronometro" aria-live="polite">{mm}:{ss}</div>
          <div className="acoes">
            <button className="btn btn-primario" onClick={() => setRodando((r) => !r)}>
              {rodando ? 'Pausar' : segundos ? 'Continuar' : 'Iniciar'}
            </button>
            <button className="btn" onClick={() => { setRodando(false); setSegundos(0) }}>
              Zerar
            </button>
          </div>
          {rodando && <p className="meta centro">A tela fica acesa enquanto o cronômetro corre.</p>}

          <form onSubmit={registrar} className="form">
            <h3>Registrar sessão</h3>
            <label>
              Duração (min)
              <input
                className="input"
                type="number"
                min={1}
                value={duracao}
                placeholder={minutosCronometro ? `${minutosCronometro} (cronômetro)` : 'Use o cronômetro ou digite'}
                onChange={(e) => setDuracao(e.target.value)}
              />
            </label>
            {contaArremessos && (
              <div className="linha">
                <label>
                  Acertos
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={acertos}
                    placeholder={String(contador.acertos)}
                    onChange={(e) => setAcertos(e.target.value)}
                  />
                </label>
                <label>
                  Tentativas
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={tentativas}
                    placeholder={String(contador.tentativas)}
                    onChange={(e) => setTentativas(e.target.value)}
                  />
                </label>
              </div>
            )}
            {drill.metrica === 'repeticoes' && (
              <label>
                Repetições
                <input className="input" type="number" min={0} value={repeticoes} onChange={(e) => setRepeticoes(e.target.value)} />
              </label>
            )}
            {arremessoInvalido && <p className="erro">Acertos não podem passar das tentativas.</p>}
            <label>
              Esforço: {esforco}/5
              <input type="range" min={1} max={5} value={esforco} onChange={(e) => setEsforco(Number(e.target.value))} />
            </label>
            <label>
              Cansaço ao terminar: {cansaco}/5 <span className="meta">(1 = inteiro, 5 = exausto)</span>
              <input type="range" min={1} max={5} value={cansaco} onChange={(e) => setCansaco(Number(e.target.value))} />
            </label>
            <label>
              Notas
              <textarea className="input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Como foi o treino? Alguma dor?" />
            </label>
            {erroSalvar && <p className="erro" role="alert">{erroSalvar}</p>}
            <button className="btn btn-primario" type="submit" disabled={!!arremessoInvalido || semDuracao || salvando}>
              {salvando ? 'Salvando…' : 'Salvar sessão'}
            </button>
          </form>
        </aside>
      </div>
    </>
  )
}
