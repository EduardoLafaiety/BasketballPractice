import { useEffect, useState } from 'react'
import { apiPrancheta, type Jogada, type Peca, type Seta, type TipoQuadra } from '../prancheta/api'
import QuadraTatica, { type Ferramenta } from '../prancheta/QuadraTatica'

const FERRAMENTAS: { id: Ferramenta; rotulo: string; dica: string }[] = [
  { id: 'ataque', rotulo: 'Ataque', dica: 'Toque na quadra para pôr um atacante (até 5).' },
  { id: 'defesa', rotulo: 'Defesa', dica: 'Toque na quadra para pôr um defensor (até 5).' },
  { id: 'bola', rotulo: 'Bola', dica: 'Toque onde a bola começa.' },
  { id: 'movimento', rotulo: 'Movimento', dica: 'Arraste para desenhar o corte de um jogador.' },
  { id: 'passe', rotulo: 'Passe', dica: 'Arraste do passador até quem recebe.' },
  { id: 'drible', rotulo: 'Drible', dica: 'Arraste para desenhar o caminho com a bola.' },
  { id: 'bloqueio', rotulo: 'Bloqueio', dica: 'Arraste até onde o jogador para e faz o corta-luz.' },
  { id: 'mover', rotulo: 'Mover', dica: 'Arraste um jogador ou a bola para outro lugar.' },
  { id: 'apagar', rotulo: 'Apagar', dica: 'Toque num jogador ou numa seta para tirar.' },
]

const VAZIA = (quadra: TipoQuadra = 'meia'): Jogada => ({ nome: '', quadra, pecas: [], setas: [], notas: '' })

export default function Prancheta() {
  const [jogada, setJogada] = useState<Jogada>(VAZIA())
  const [historico, setHistorico] = useState<Jogada[]>([])
  const [ferramenta, setFerramenta] = useState<Ferramenta>('ataque')
  const [salvas, setSalvas] = useState<Jogada[] | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    apiPrancheta.lista().then(setSalvas, (e: Error) => {
      setSalvas([])
      setErro(e.message)
    })
  }, [])

  /** Toda mudança no desenho guarda o estado anterior para o "desfazer". */
  const mudar = (fazer: (j: Jogada) => Jogada) => {
    setHistorico((h) => [...h.slice(-49), jogada])
    setJogada(fazer)
    setAviso(null)
  }

  function colocar(x: number, y: number) {
    if (ferramenta === 'bola') return mudar((j) => ({ ...j, pecas: [...j.pecas.filter((p) => p.tipo !== 'bola'), { tipo: 'bola', x, y }] }))
    if (ferramenta !== 'ataque' && ferramenta !== 'defesa') return
    const usados = jogada.pecas.filter((p) => p.tipo === ferramenta).map((p) => p.rotulo)
    const rotulo = ['1', '2', '3', '4', '5'].find((n) => !usados.includes(n))
    if (!rotulo) return setAviso(`Já tem 5 jogadores de ${ferramenta}.`)
    mudar((j) => ({ ...j, pecas: [...j.pecas, { tipo: ferramenta, x, y, rotulo }] }))
  }

  const desenhar = (seta: Seta) => mudar((j) => ({ ...j, setas: [...j.setas, seta] }))
  const mover = (i: number, x: number, y: number) =>
    // Arrastar não entra no histórico a cada pixel: só a posição final importa.
    setJogada((j) => ({ ...j, pecas: j.pecas.map((p, k): Peca => (k === i ? { ...p, x, y } : p)) }))

  function desfazer() {
    const anterior = historico.at(-1)
    if (!anterior) return
    setHistorico((h) => h.slice(0, -1))
    setJogada(anterior)
  }

  function trocarQuadra(quadra: TipoQuadra) {
    if (quadra === jogada.quadra) return
    if ((jogada.pecas.length || jogada.setas.length) && !window.confirm('Trocar a quadra apaga o desenho atual. Continuar?')) return
    mudar((j) => ({ ...VAZIA(quadra), id: j.id, nome: j.nome, notas: j.notas }))
  }

  async function salvar() {
    if (!jogada.nome.trim()) return setErro('Dê um nome para a jogada.')
    setSalvando(true)
    setErro(null)
    try {
      const salva = await apiPrancheta.salvar(jogada)
      setJogada(salva)
      setSalvas((lista) => [salva, ...(lista ?? []).filter((j) => j.id !== salva.id)])
      setAviso('Jogada salva.')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function remover(j: Jogada) {
    if (!window.confirm(`Apagar a jogada "${j.nome}"?`)) return
    try {
      await apiPrancheta.remover(j.id!)
      setSalvas((lista) => (lista ?? []).filter((x) => x.id !== j.id))
      if (jogada.id === j.id) setJogada(VAZIA(jogada.quadra))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  const dica = FERRAMENTAS.find((f) => f.id === ferramenta)!.dica

  return (
    <div className="prancheta">
      <div className="prancheta-barra">
        <div className="chips" role="group" aria-label="Quadra">
          <button className={`chip ${jogada.quadra === 'meia' ? 'ativo' : ''}`} aria-pressed={jogada.quadra === 'meia'} onClick={() => trocarQuadra('meia')}>Meia quadra</button>
          <button className={`chip ${jogada.quadra === 'inteira' ? 'ativo' : ''}`} aria-pressed={jogada.quadra === 'inteira'} onClick={() => trocarQuadra('inteira')}>Quadra inteira</button>
        </div>
        <div className="chips" role="group" aria-label="Ferramenta">
          {FERRAMENTAS.map((f) => (
            <button key={f.id} className={`chip ${ferramenta === f.id ? 'ativo' : ''}`} aria-pressed={ferramenta === f.id} onClick={() => setFerramenta(f.id)}>
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>
      <p className="meta">{dica}</p>

      <div className="prancheta-corpo">
        <div className={`prancheta-quadra ${jogada.quadra}`}>
          <QuadraTatica
            quadra={jogada.quadra}
            pecas={jogada.pecas}
            setas={jogada.setas}
            ferramenta={ferramenta}
            aoColocar={colocar}
            aoDesenhar={desenhar}
            aoMover={mover}
            aoApagarPeca={(i) => mudar((j) => ({ ...j, pecas: j.pecas.filter((_, k) => k !== i) }))}
            aoApagarSeta={(i) => mudar((j) => ({ ...j, setas: j.setas.filter((_, k) => k !== i) }))}
          />
          <div className="acoes">
            <button className="chip" onClick={desfazer} disabled={!historico.length}>Desfazer</button>
            <button className="chip" disabled={!jogada.pecas.length && !jogada.setas.length} onClick={() => window.confirm('Limpar a prancheta?') && mudar((j) => ({ ...j, pecas: [], setas: [] }))}>
              Limpar
            </button>
            <button className="chip" onClick={() => { setJogada(VAZIA(jogada.quadra)); setHistorico([]) }}>Nova jogada</button>
          </div>
        </div>

        <div className="prancheta-lado">
          <div className="form">
            <label>
              Nome da jogada
              <input className="input" value={jogada.nome} maxLength={80} onChange={(e) => setJogada((j) => ({ ...j, nome: e.target.value }))} placeholder="Ex.: pick and roll central" />
            </label>
            <label>
              Anotações
              <textarea className="input" rows={3} maxLength={1000} value={jogada.notas ?? ''} onChange={(e) => setJogada((j) => ({ ...j, notas: e.target.value }))} />
            </label>
            {erro && <p className="erro" role="alert">{erro}</p>}
            {aviso && <p className="meta" role="status">{aviso}</p>}
            <button className="btn btn-primario" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando' : jogada.id ? 'Salvar alterações' : 'Salvar jogada'}
            </button>
          </div>

          <h3>Jogadas salvas</h3>
          {salvas === null ? (
            <p className="meta">Carregando</p>
          ) : salvas.length === 0 ? (
            <p className="meta">Nenhuma jogada salva ainda.</p>
          ) : (
            <ul className="prancheta-salvas">
              {salvas.map((j) => (
                <li key={j.id} className={jogada.id === j.id ? 'ativa' : ''}>
                  <button className="botao-link prancheta-abrir" onClick={() => { setJogada(j); setHistorico([]); setAviso(null) }}>
                    <strong>{j.nome}</strong>
                    <span className="meta">{j.quadra === 'meia' ? 'Meia quadra' : 'Quadra inteira'} · {j.pecas.length} peças · {j.setas.length} setas</span>
                  </button>
                  <button className="remover" aria-label={`Apagar ${j.nome}`} onClick={() => remover(j)}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
