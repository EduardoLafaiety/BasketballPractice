import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { dataLocal } from '../api'
import { Carregando, ErroCarga } from '../components/Estado'
import { apiJogos, pontosDosArremessos, useComparacao, useJogos, type Comparacao, type Jogo } from '../jogos/api'

type Campo = Exclude<keyof Jogo, 'id' | 'data' | 'adversario' | 'notas'>

const NOVO = (): Jogo => ({
  data: dataLocal(new Date()),
  pontos: 0,
  rebotes: 0,
  assistencias: 0,
  roubos: 0,
  tocos: 0,
  erros: 0,
  cestas: 0,
  tentativas: 0,
  cestasTres: 0,
  tentativasTres: 0,
  lancesCertos: 0,
  lancesTentados: 0,
})

const fracao = (feitos: number, tentados: number) => (tentados ? `${feitos}/${tentados} (${Math.round((feitos / tentados) * 100)}%)` : '—')
const dataCurta = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function Jogos() {
  const { jogos, erro, recarregar } = useJogos()
  const [editando, setEditando] = useState<Jogo | null>(null)

  return (
    <>
      <h1>Diário de jogos</h1>
      <p className="muted">Anote as partidas de verdade e veja se o que você acerta no treino aparece no jogo.</p>

      <Comparativo />

      {editando ? (
        <FormJogo inicial={editando} aoTerminar={() => setEditando(null)} />
      ) : (
        <button className="btn btn-primario" onClick={() => setEditando(NOVO())}>+ Registrar jogo</button>
      )}

      <section>
        <h2>Jogos</h2>
        {!jogos ? (
          erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando jogos…" />
        ) : jogos.length === 0 ? (
          <div className="vazio">Nenhum jogo anotado ainda. Depois da próxima partida, registre os seus números.</div>
        ) : (
          <ul className="jogos-lista">
            {jogos.map((j) => (
              <LinhaJogo key={j.id} jogo={j} aoEditar={() => setEditando(j)} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function LinhaJogo({ jogo: j, aoEditar }: { jogo: Jogo; aoEditar: () => void }) {
  const [erro, setErro] = useState<string | null>(null)
  const temPlacar = j.placarTime !== undefined && j.placarAdversario !== undefined
  const resultado = !temPlacar ? null : j.placarTime! > j.placarAdversario! ? 'Vitória' : j.placarTime! < j.placarAdversario! ? 'Derrota' : 'Empate'

  async function remover() {
    if (!window.confirm(`Apagar o jogo de ${dataCurta(j.data)}?`)) return
    try {
      await apiJogos.remover(j.id!)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <li className="jogo-linha">
      <div className="jogo-topo">
        <span className="rotulo-forte">{dataCurta(j.data)}{j.adversario && ` · contra ${j.adversario}`}</span>
        {resultado && <span className={`jogo-resultado ${resultado.toLowerCase()}`}>{resultado} {j.placarTime} a {j.placarAdversario}</span>}
      </div>
      <div className="jogo-numeros">
        <span><strong>{j.pontos}</strong> pts</span>
        <span><strong>{j.rebotes}</strong> reb</span>
        <span><strong>{j.assistencias}</strong> ast</span>
        {j.minutos !== undefined && <span><strong>{j.minutos}</strong> min</span>}
      </div>
      <p className="meta">
        Arremessos {fracao(j.cestas, j.tentativas)} · de três {fracao(j.cestasTres, j.tentativasTres)} · lances livres {fracao(j.lancesCertos, j.lancesTentados)}
        {(j.roubos || j.tocos || j.erros) ? ` · ${j.roubos} roubos, ${j.tocos} tocos, ${j.erros} erros` : ''}
      </p>
      {j.notas && <p className="muted texto-literal">{j.notas}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button className="chip" onClick={aoEditar}>Editar</button>
        <button className="chip" onClick={remover}>Apagar</button>
      </div>
    </li>
  )
}

function Numero({ rotulo, valor, aoMudar, max }: { rotulo: string; valor: number | undefined; aoMudar: (n: number | undefined) => void; max: number }) {
  return (
    <label>
      {rotulo}
      <input
        className="input"
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={valor ?? ''}
        onChange={(e) => aoMudar(e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value))))}
      />
    </label>
  )
}

function FormJogo({ inicial, aoTerminar }: { inicial: Jogo; aoTerminar: () => void }) {
  const [j, setJ] = useState<Jogo>(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const mudar = (campo: Campo) => (n: number | undefined) => setJ((atual) => ({ ...atual, [campo]: n ?? (['placarTime', 'placarAdversario', 'minutos'].includes(campo) ? undefined : 0) }))
  const comArremessos = j.tentativas + j.lancesTentados > 0
  const pontos = comArremessos ? pontosDosArremessos(j) : j.pontos

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await apiJogos.salvar({ ...j, pontos })
      aoTerminar()
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <form className="card form jogo-form" onSubmit={enviar}>
      <h2 className="sem-margem">{j.id ? 'Editar jogo' : 'Novo jogo'}</h2>
      <div className="jogo-grade">
        <label>
          Data
          <input className="input" type="date" max={dataLocal(new Date())} value={j.data} onChange={(e) => setJ({ ...j, data: e.target.value })} required />
        </label>
        <label>
          Adversário
          <input className="input" maxLength={80} value={j.adversario ?? ''} onChange={(e) => setJ({ ...j, adversario: e.target.value })} />
        </label>
        <Numero rotulo="Placar do seu time" valor={j.placarTime} aoMudar={mudar('placarTime')} max={300} />
        <Numero rotulo="Placar do adversário" valor={j.placarAdversario} aoMudar={mudar('placarAdversario')} max={300} />
        <Numero rotulo="Minutos em quadra" valor={j.minutos} aoMudar={mudar('minutos')} max={70} />
      </div>
      <h3>Arremessos</h3>
      <div className="jogo-grade">
        <Numero rotulo="Cestas de quadra" valor={j.cestas} aoMudar={mudar('cestas')} max={100} />
        <Numero rotulo="Tentativas de quadra" valor={j.tentativas} aoMudar={mudar('tentativas')} max={100} />
        <Numero rotulo="Cestas de três" valor={j.cestasTres} aoMudar={mudar('cestasTres')} max={100} />
        <Numero rotulo="Tentativas de três" valor={j.tentativasTres} aoMudar={mudar('tentativasTres')} max={100} />
        <Numero rotulo="Lances livres certos" valor={j.lancesCertos} aoMudar={mudar('lancesCertos')} max={60} />
        <Numero rotulo="Lances livres tentados" valor={j.lancesTentados} aoMudar={mudar('lancesTentados')} max={60} />
      </div>
      <p className="meta">As bolas de três também contam nas cestas e tentativas de quadra.</p>
      <h3>Números</h3>
      <div className="jogo-grade">
        {comArremessos ? (
          <p className="jogo-pontos">Pontos: <strong>{pontos}</strong> <span className="meta">(somados dos arremessos)</span></p>
        ) : (
          <Numero rotulo="Pontos" valor={j.pontos} aoMudar={mudar('pontos')} max={150} />
        )}
        <Numero rotulo="Rebotes" valor={j.rebotes} aoMudar={mudar('rebotes')} max={60} />
        <Numero rotulo="Assistências" valor={j.assistencias} aoMudar={mudar('assistencias')} max={50} />
        <Numero rotulo="Roubos" valor={j.roubos} aoMudar={mudar('roubos')} max={30} />
        <Numero rotulo="Tocos" valor={j.tocos} aoMudar={mudar('tocos')} max={30} />
        <Numero rotulo="Erros (perdas de bola)" valor={j.erros} aoMudar={mudar('erros')} max={30} />
      </div>
      <label>
        Anotações
        <textarea className="input" rows={2} maxLength={1000} value={j.notas ?? ''} onChange={(e) => setJ({ ...j, notas: e.target.value })} />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar jogo'}</button>
        <button className="btn" type="button" onClick={aoTerminar} disabled={salvando}>Cancelar</button>
      </div>
    </form>
  )
}

const LINHAS: { id: keyof Comparacao['arremessos']; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Arremessos de quadra' },
  { id: 'tres', rotulo: 'De três' },
  { id: 'lances', rotulo: 'Lances livres' },
]

function Comparativo() {
  const { comparacao } = useComparacao()
  if (!comparacao) return null
  if (comparacao.jogos === 0) return null
  const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('pt-BR'))
  const fmt = (n: number | null) => (n === null ? '—' : `${num(n)}%`)
  return (
    <section className="card jogos-comparacao" aria-labelledby="comparacao-titulo">
      <h2 id="comparacao-titulo" className="sem-margem">Treino × jogo</h2>
      <p className="meta">Últimos 90 dias: {comparacao.jogos} {comparacao.jogos === 1 ? 'jogo' : 'jogos'}, com média de {num(comparacao.medias.pontos)} pontos, {num(comparacao.medias.rebotes)} rebotes e {num(comparacao.medias.assistencias)} assistências.</p>
      <table className="cartao-tabela">
        <thead>
          <tr>
            <th scope="col">Aproveitamento</th>
            <th scope="col">No treino</th>
            <th scope="col">No jogo</th>
            <th scope="col">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {LINHAS.map(({ id, rotulo }) => {
            const a = comparacao.arremessos[id]
            // Arredonda pela distância (−18,5 vira −19), igual para cima e para baixo.
            const diff = a.jogo !== null && a.treino !== null ? Math.sign(a.jogo - a.treino) * Math.round(Math.abs(a.jogo - a.treino)) : null
            return (
              <tr key={id}>
                <th scope="row">{rotulo}</th>
                <td>{fmt(a.treino)}</td>
                <td>{fmt(a.jogo)}</td>
                <td className={diff === null ? '' : diff >= 0 ? 'variacao sobe' : 'variacao desce'}>{diff === null ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)} pontos`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="meta">
        No treino, valem os exercícios com acertos dos últimos 90 dias; "de três" são os exercícios com "três" no nome. Caiu muito no jogo? Treine também
        cansado e com pressão: veja os <Link to="/programas" className="link">programas</Link>.
      </p>
    </section>
  )
}
