import { useRef, useState, type FormEvent } from 'react'
import Campo from '../../../shared/ui/Campo'
import Botao from '../../../shared/ui/Botao'
import Mensagem from '../../../shared/ui/Mensagem'
import { ApiError } from '../../../shared/api/http'
import { ROTULO_METRICA } from '../../../shared/lib/formatacao'
import type { Categoria, Drill, Metrica } from '../../../shared/types'

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
  const [campos, setCampos] = useState<Record<string, string | undefined>>({})
  const campoNome = useRef<HTMLInputElement>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (nome.trim().length < 2) {
      setCampos({ name: 'O nome precisa ter pelo menos 2 letras.' })
      campoNome.current?.focus()
      return
    }
    setSalvando(true)
    setErro(null)
    setCampos({})
    try {
      await aoSalvar({ nome: nome.trim(), categoria, metrica, descricao: descricao.trim() })
    } catch (e) {
      setErro((e as Error).message)
      if (e instanceof ApiError && e.details) setCampos(Object.fromEntries(Object.entries(e.details).map(([k, v]) => [k, v?.[0]])))
      setSalvando(false)
    }
  }

  return (
    <form className="card form form-solto" onSubmit={enviar}>
      <h3>{inicial ? 'Editar exercício' : 'Novo exercício'}</h3>
      <Campo rotulo="Nome" erro={campos.name}>
        <input ref={campoNome} className="input" value={nome} maxLength={100} onChange={(e) => { setNome(e.target.value); setCampos((c) => ({ ...c, name: undefined })) }} autoFocus />
      </Campo>
      <div className="linha">
        <Campo rotulo="Categoria" erro={campos.category}>
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Como medir" erro={campos.metric}>
          <select className="input" value={metrica} onChange={(e) => setMetrica(e.target.value as Metrica)}>
            {(Object.keys(ROTULO_METRICA) as Metrica[]).map((m) => (
              <option key={m} value={m}>
                {ROTULO_METRICA[m]}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Descrição" erro={campos.description}>
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Como fazer o exercício"
        />
      </Campo>
      {erro && <Mensagem>{erro}</Mensagem>}
      <div className="acoes">
        <Botao className="btn btn-primario" type="submit" ocupado={salvando}>
          {salvando ? 'Salvando' : 'Salvar'}
        </Botao>
        <Botao className="btn" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}
