import { Link } from '../../../shared/i18n/links'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../../shared/api/backend'
import { useAuth } from '../model/auth'
import Icone from '../../../shared/ui/Icone'
import TelaAuth, { CampoSenha, ErroCampo } from '../components/TelaAuth'

/** Tela de login e de cadastro (modo definido pela rota). */
export default function Entrar({ modo, demonstracao = __DEMO__ }: { modo: 'entrar' | 'cadastro'; demonstracao?: boolean }) {
  const { usuario, entrar, cadastrar } = useAuth()
  const navigate = useNavigate()
  const local = useLocation()
  const plano = new URLSearchParams(local.search).get('plano')
  const destino = (local.state as { de?: string } | null)?.de ?? (plano === 'mensal' || plano === 'anual' ? `/assinatura?plano=${plano}` : '/')

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState(() => (local.state as { email?: string } | null)?.email ?? '')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [recusado, setRecusado] = useState(false)
  const [campos, setCampos] = useState<Record<string, string[] | undefined>>({})
  const [cadastroRecebido, setCadastroRecebido] = useState<string | null>(null)

  if (usuario) return <Navigate to={destino} replace />

  const cadastro = modo === 'cadastro'

  if (cadastro && cadastroRecebido) {
    return (
      <TelaAuth>
        <div className="auth-card">
          <span className="auth-sobretitulo">Falta pouco</span>
          <h1>Confira seu e-mail</h1>
          <p className="muted" role="status">{cadastroRecebido}</p>
          <p className="muted auth-troca">
            Já tem conta? <Link to="/entrar" state={local.state} className="link">Entrar</Link>
          </p>
        </div>
      </TelaAuth>
    )
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setRecusado(false)
    setCampos({})
    if (cadastro && senha.length < 8) {
      setCampos({ password: ['A senha precisa ter pelo menos 8 caracteres.'] })
      return
    }
    if (cadastro) return criarConta()
    return acessar(() => entrar(email.trim(), senha))
  }

  async function criarConta() {
    setEnviando(true)
    try {
      setCadastroRecebido(await cadastrar(nome.trim(), email.trim(), senha))
      setSenha('')
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  async function acessar(acao: () => Promise<void>) {
    setEnviando(true)
    try {
      await acao()
      navigate(destino, { replace: true })
    } catch (e) {
      mostrarErro(e)
      setEnviando(false)
    }
  }

  function mostrarErro(e: unknown) {
    setErro((e as Error).message)
    setRecusado(e instanceof ApiError && e.status === 401)
    if (e instanceof ApiError && e.details) setCampos(e.details)
  }

  return (
    <TelaAuth>
      <form className="auth-card" onSubmit={enviar} noValidate>
        <h1>{cadastro ? 'Criar conta' : 'Entrar'}</h1>

        {cadastro && (
          <label className="campo">
            <input autoComplete="name" required minLength={2} placeholder=" " value={nome} onChange={(e) => setNome(e.target.value)} />
            <span className="campo-rotulo">Nome</span>
            <ErroCampo msgs={campos.name} />
          </label>
        )}
        <label className="campo">
          <input type="email" autoComplete="email" required placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
          <span className="campo-rotulo">E-mail</span>
          <ErroCampo msgs={campos.email} />
        </label>
        <CampoSenha
          valor={senha}
          aoMudar={setSenha}
          autoComplete={cadastro ? 'new-password' : 'current-password'}
          dica={cadastro ? 'Mínimo de 8 caracteres.' : undefined}
          erros={campos.password}
        />
        {!cadastro && !demonstracao && <div className="auth-recuperar"><Link to="/recuperar-senha" className="link">Esqueci minha senha</Link></div>}

        {erro && Object.keys(campos).length === 0 && <p className="erro" role="alert">{erro}</p>}
        {recusado && (
          <p className="muted">Criou a conta agora? Antes de entrar, ative pelo link que enviamos para o seu e-mail.</p>
        )}

        {cadastro && (
          <p className="muted auth-termos">
            Ao criar a conta, você declara ter lido os <Link to="/termos" className="link">Termos de Uso</Link> e a{' '}
            <Link to="/privacidade" className="link">Política de Privacidade</Link> e ter 18 anos ou mais.
          </p>
        )}

        <button className="btn btn-primario btn-grande" type="submit" disabled={enviando || !email || !senha || (cadastro && !nome)}>
          {enviando ? 'Aguarde' : cadastro ? 'Criar conta' : 'Entrar'}
          <Icone nome="seta" />
        </button>

        {demonstracao ? (
          <>
            <button type="button" className="btn btn-grande auth-sem-conta" disabled={enviando} onClick={() => acessar(() => entrar('visitante@demo.local', '-'))}>
              Entrar sem conta
            </button>
          </>
        ) : (
          <p className="muted auth-troca">
            {cadastro ? (
              <>Já tem conta? <Link to="/entrar" state={local.state} className="link">Entrar</Link></>
            ) : (
              <>
                Ainda não tem conta? <Link to={(local.state as { compraPaga?: boolean } | null)?.compraPaga ? '/cadastro' : '/assinatura'} state={local.state} className="link">{(local.state as { compraPaga?: boolean } | null)?.compraPaga ? 'Criar conta' : 'Escolher um plano'}</Link>
              </>
            )}
          </p>
        )}
      </form>
    </TelaAuth>
  )
}
