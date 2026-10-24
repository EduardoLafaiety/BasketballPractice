import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'

/** Tela de login e de cadastro (modo definido pela rota). */
export default function Entrar({ modo }: { modo: 'entrar' | 'cadastro' }) {
  const { usuario, entrar, cadastrar } = useAuth()
  const navigate = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de ?? '/'

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [campos, setCampos] = useState<Record<string, string[] | undefined>>({})

  if (usuario) return <Navigate to={destino} replace />

  const cadastro = modo === 'cadastro'

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCampos({})
    if (cadastro && senha.length < 8) {
      setCampos({ password: ['A senha precisa ter pelo menos 8 caracteres.'] })
      return
    }
    setEnviando(true)
    try {
      if (cadastro) await cadastrar(nome.trim(), email.trim(), senha)
      else await entrar(email.trim(), senha)
      navigate(destino, { replace: true })
    } catch (e) {
      setErro((e as Error).message)
      if (e instanceof ApiError && e.details) setCampos(e.details)
      setEnviando(false)
    }
  }

  return (
    <div className="auth">
      <Link to="/entrar" className="marca auth-marca">
        <span className="marca-bola" aria-hidden>🏀</span>
        Basketball Practice
      </Link>
      <form className="card form auth-card" onSubmit={enviar} noValidate>
        <h1>{cadastro ? 'Criar conta' : 'Entrar'}</h1>
        <p className="muted">
          {cadastro ? 'Monte sua rotina e acompanhe sua evolução.' : 'Bom te ver de volta. Bora pra quadra.'}
        </p>

        {cadastro && (
          <label>
            Nome
            <input className="input" autoComplete="name" required minLength={2} value={nome} onChange={(e) => setNome(e.target.value)} />
            <ErroCampo msgs={campos.name} />
          </label>
        )}
        <label>
          E-mail
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErroCampo msgs={campos.email} />
        </label>
        <label>
          Senha
          <input
            className="input"
            type="password"
            autoComplete={cadastro ? 'new-password' : 'current-password'}
            required
            minLength={cadastro ? 8 : undefined}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {cadastro && !campos.password && <span className="meta">Mínimo de 8 caracteres.</span>}
          <ErroCampo msgs={campos.password} />
        </label>

        {erro && Object.keys(campos).length === 0 && <p className="erro" role="alert">{erro}</p>}

        <button className="btn btn-primario" type="submit" disabled={enviando || !email || !senha || (cadastro && !nome)}>
          {enviando ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}
        </button>

        <p className="muted auth-troca">
          {cadastro ? (
            <>Já tem conta? <Link to="/entrar" state={local.state} className="link">Entrar</Link></>
          ) : (
            <>Ainda não tem conta? <Link to="/cadastro" state={local.state} className="link">Criar conta</Link></>
          )}
        </p>
      </form>
    </div>
  )
}

function ErroCampo({ msgs }: { msgs?: string[] }) {
  return msgs?.length ? <span className="erro">{traduzir(msgs[0])}</span> : null
}

// Mensagens padrão do Zod chegam em inglês.
function traduzir(msg: string) {
  if (/email/i.test(msg)) return 'E-mail inválido.'
  if (/at least 8/i.test(msg)) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (/at least 2/i.test(msg)) return 'O nome precisa ter pelo menos 2 letras.'
  if (/at least/i.test(msg)) return 'Campo obrigatório.'
  return msg
}
