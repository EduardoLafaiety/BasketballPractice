import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import Icone from '../components/Icone'
import { BolaCouro, BolaVazada, Figura, LinhasQuadra, ListraBola, useFuroBola } from '../components/rolagem'

/** Tela de login e de cadastro (modo definido pela rota). */
export default function Entrar({ modo, demonstracao = __DEMO__ }: { modo: 'entrar' | 'cadastro'; demonstracao?: boolean }) {
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
  const camada = useRef<HTMLDivElement>(null)
  useFuroBola(camada)

  if (usuario) return <Navigate to={destino} replace />

  const cadastro = modo === 'cadastro'

  function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCampos({})
    if (cadastro && senha.length < 8) {
      setCampos({ password: ['A senha precisa ter pelo menos 8 caracteres.'] })
      return
    }
    return acessar(() => (cadastro ? cadastrar(nome.trim(), email.trim(), senha) : entrar(email.trim(), senha)))
  }

  async function acessar(acao: () => Promise<void>) {
    setEnviando(true)
    try {
      await acao()
      navigate(destino, { replace: true })
    } catch (e) {
      setErro((e as Error).message)
      if (e instanceof ApiError && e.details) setCampos(e.details)
      setEnviando(false)
    }
  }

  return (
    <div className="auth">
      <Link to="/entrar" className="auth-marca" aria-label="Basketball Practice">
        <span className="marca"><Icone nome="bola" tamanho={28} /></span>
        <span className="topo-secao">Basketball Practice</span>
      </Link>
      <section className="auth-palco" aria-hidden="true">
        <LinhasQuadra />
        <div className="abertura-palco">
          <BolaVazada />
          <div className="abertura-dentro"><Figura nome="Mikan drill" viewBox="220 10 240 300" /></div>
        </div>
        <div className="abertura-palco abertura-furada" ref={camada}>
          <BolaCouro />
        </div>
        <h2 className="auth-titulo">
          <span className="auth-titulo-a">Bora pra</span>
          <span className="auth-titulo-b">quadra.</span>
        </h2>
      </section>

      <section className="auth-lado faixa-preta com-listra">
        <ListraBola />
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

          <button className="btn btn-primario btn-grande" type="submit" disabled={enviando || !email || !senha || (cadastro && !nome)}>
            {enviando ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}
            <Icone nome="seta" />
          </button>

          {demonstracao ? (
            <>
              <button type="button" className="btn btn-grande auth-sem-conta" disabled={enviando} onClick={() => acessar(() => entrar('visitante@demo.local', '-'))}>
                Entrar sem conta
              </button>
              <p className="muted auth-troca">
                Demonstração: use qualquer e-mail e senha. Nada é enviado, e seus treinos ficam só neste navegador.
              </p>
            </>
          ) : (
          <p className="muted auth-troca">
            {cadastro ? (
              <>Já tem conta? <Link to="/entrar" state={local.state} className="link">Entrar</Link></>
            ) : (
              <>Ainda não tem conta? <Link to="/cadastro" state={local.state} className="link">Criar conta</Link></>
            )}
          </p>
          )}
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
