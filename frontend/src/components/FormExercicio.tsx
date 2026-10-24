import { useState, type FormEvent } from 'react'
import { ROTULO_METRICA } from '../store'
import type { Categoria, Drill, Metrica } from '../types'

export const CATEGORIAS: Categoria[] = ['Arremesso', 'Drible', 'Passe', 'Finalização', 'Defesa', 'Condicionamento']

type Dados = Pick<Drill, 'nome' | 'categoria' | 'metrica' | 'descricao'>

/** Criar ou editar um exercício personalizado do atleta. */
export default function FormExercicio({
  inicial,
  aoSalvar,
  aoCancelar,
}: {
  inicial?: Dados
  aoSalvar: (d: Dados) => Promise<void>
  aoCancelar: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [categoria, setCategoria] = useState<Categoria>(inicial?.categoria ?? 'Arremesso')
  const [metrica, setMetrica] = useState<Metrica>(inicial?.metrica ?? 'acertos')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (nome.trim().length < 2) {
      setErro('O nome precisa ter pelo menos 2 letras.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await aoSalvar({ nome: nome.trim(), categoria, metrica, descricao: descricao.trim() })
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <form className="card form form-solto" onSubmit={enviar}>
      <h3>{inicial ? 'Editar exercício' : 'Novo exercício'}</h3>
      <label>
        Nome
        <input className="input" value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} autoFocus />
      </label>
      <div className="linha">
        <label>
          Categoria
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Como medir
          <select className="input" value={metrica} onChange={(e) => setMetrica(e.target.value as Metrica)}>
            {(Object.keys(ROTULO_METRICA) as Metrica[]).map((m) => (
              <option key={m} value={m}>
                {ROTULO_METRICA[m]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Descrição
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Como fazer o exercício"
        />
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button className="btn" type="button" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
