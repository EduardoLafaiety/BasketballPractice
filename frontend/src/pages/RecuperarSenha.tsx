import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import Icone from '../components/Icone'
import TelaAuth, { ErroCampo } from '../components/TelaAuth'

/** Pede o link de senha nova. A resposta é a mesma com ou sem conta, então a tela não afirma que o e-mail existe. */
export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [campos, setCampos] = useState<Record<string, string[] | undefined>>({})
  const [recebido, setRecebido] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCampos({})
    setEnviando(true)
    try {
      setRecebido((await api.esqueciSenha(email.trim())).message)
    } catch (falha) {
      setErro((falha as Error).message)
      if (falha instanceof ApiError && falha.details) setCampos(falha.details)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <TelaAuth>
      {recebido ? (
        <div className="auth-card">
          <span className="auth-sobretitulo">Falta pouco</span>
          <h1>Confira seu e-mail</h1>
          <p className="muted" role="status">{recebido}</p>
          <p className="muted auth-troca"><Link to="/entrar" className="link">Voltar para entrar</Link></p>
        </div>
      ) : (
        <form className="auth-card" onSubmit={enviar} noValidate>
          <span className="auth-sobretitulo">Sem problema</span>
          <h1>Esqueci a senha</h1>
          <p className="muted">Informe o e-mail da conta. Vale também para quem foi bloqueado por muitas tentativas.</p>
          <label className="campo">
            <input type="email" autoComplete="email" required placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
            <span className="campo-rotulo">E-mail</span>
            <ErroCampo msgs={campos.email} />
          </label>
          {erro && Object.keys(campos).length === 0 && <p className="erro" role="alert">{erro}</p>}
          <button className="btn btn-primario btn-grande" type="submit" disabled={enviando || !email}>
            {enviando ? 'Aguarde…' : 'Enviar link'}
            <Icone nome="seta" />
          </button>
          <p className="muted auth-troca"><Link to="/entrar" className="link">Voltar para entrar</Link></p>
        </form>
      )}
    </TelaAuth>
  )
}
