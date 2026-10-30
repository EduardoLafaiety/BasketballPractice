import { useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import Icone from '../components/Icone'
import { COREOGRAFIAS } from '../demonstracoes/coreografias'
import Manequim from '../demonstracoes/Manequim'

const FAIXA = ['Arremesso', 'Drible', 'Passe', 'Finalização', 'Defesa', 'Condicionamento']
const TITULO = ['Treine', 'Registre', 'Evolua']

/** A luz do palco segue o ponteiro (só posição, em variáveis CSS: nada de re-render). */
function moverLuz(e: PointerEvent<HTMLElement>) {
  const caixa = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - caixa.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - caixa.top}px`)
}

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
  const [verSenha, setVerSenha] = useState(false)

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
      <section className="auth-palco" aria-hidden="true" onPointerMove={moverLuz}>
        <div className="auth-luz" />
        <svg className="auth-quadra" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
          <path d="M60 600 V430 A240 240 0 0 1 540 430 V600" />
          <path d="M220 600 V380 H380 V600" />
          <circle cx="300" cy="380" r="60" />
          <path d="M0 40 H600" />
        </svg>
        <h2 className="auth-titulo">
          {TITULO.map((palavra, i) => (
            <span key={palavra} className="auth-linha">
              <span className={`auth-palavra auth-palavra-${i}`} style={{ '--i': i } as CSSProperties}>{palavra}</span>
            </span>
          ))}
        </h2>
        <div className="auth-manequim">
          <Manequim coreografia={COREOGRAFIAS['Step-back de três']} viewBox="95 110 320 200" />
        </div>
        <div className="auth-faixa">
          <div className="auth-faixa-trilho">
            {[0, 1].map((copia) => (
              <span key={copia}>
                {FAIXA.map((f) => <span key={f}>{f}<i>✦</i></span>)}
              </span>
            ))}
          </div>
        </div>
        <ul className="auth-numeros">
          <li><strong>23</strong> exercícios com demonstração</li>
          <li><strong>20</strong> estilos de jogadores da NBA</li>
          <li><strong>100%</strong> do seu treino em números</li>
        </ul>
        <div className="auth-grao" />
      </section>

      <section className="auth-lado">
        <Link to="/entrar" className="marca auth-marca">
          <span className="marca-bola"><Icone nome="bola" tamanho={28} /></span>
          Basketball Practice
        </Link>
        <form className="auth-card" onSubmit={enviar} noValidate>
          <span className="auth-sobretitulo">{cadastro ? 'Nova conta' : 'De volta à quadra'}</span>
          <h1>{cadastro ? 'Criar conta' : 'Entrar'}</h1>
          <p className="muted">
            {cadastro ? 'Monte sua rotina e acompanhe sua evolução.' : 'Bom te ver de volta. Bora pra quadra.'}
          </p>

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
          <div className="campo-grupo">
          <label className="campo campo-senha">
            <input
              type={verSenha ? 'text' : 'password'}
              autoComplete={cadastro ? 'new-password' : 'current-password'}
              required
              minLength={cadastro ? 8 : undefined}
              placeholder=" "
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <span className="campo-rotulo">Senha</span>
            {cadastro && !campos.password && <span className="meta">Mínimo de 8 caracteres.</span>}
            <ErroCampo msgs={campos.password} />
          </label>
          <button
            type="button"
            className="campo-ver"
            aria-pressed={verSenha}
            aria-label={verSenha ? 'Ocultar o que foi digitado' : 'Mostrar o que foi digitado'}
            onClick={() => setVerSenha((v) => !v)}
          >
            {verSenha ? 'Ocultar' : 'Mostrar'}
          </button>
          </div>

          {erro && Object.keys(campos).length === 0 && <p className="erro" role="alert">{erro}</p>}

          <button className="auth-botao" type="submit" disabled={enviando || !email || !senha || (cadastro && !nome)}>
            <span>{enviando ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}</span>
            <span className="auth-botao-seta" aria-hidden="true">→</span>
          </button>

          <p className="muted auth-troca">
            {cadastro ? (
              <>Já tem conta? <Link to="/entrar" state={local.state} className="link">Entrar</Link></>
            ) : (
              <>Ainda não tem conta? <Link to="/cadastro" state={local.state} className="link">Criar conta</Link></>
            )}
          </p>
        </form>
      </section>
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
