import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth'
import Icone from '../components/Icone'
import TelaAuth, { CampoSenha } from '../components/TelaAuth'

// O token vem depois do "#": essa parte do endereço não vai para o servidor, para logs nem para outros sites.
const tokenDoLink = (hash: string) => new URLSearchParams(hash.replace(/^#/, '')).get('token')

/** As duas telas abertas por um link de e-mail: pedem uma senha, usam o token e já entram no app. */
function TelaDoLink({
  sobretitulo,
  titulo,
  texto,
  rotulo,
  autoComplete,
  dica,
  botao,
  campoDaSenha,
  pedirOutro,
  usar,
}: {
  sobretitulo: string
  titulo: string
  texto: string
  rotulo: string
  autoComplete: 'new-password' | 'current-password'
  dica?: string
  botao: string
  campoDaSenha: string
  pedirOutro: { para: string; texto: string }
  usar: (token: string, senha: string) => ReturnType<typeof api.redefinirSenha>
}) {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const { abrirSessao } = useAuth()
  const [token] = useState(() => tokenDoLink(hash))
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(token ? null : 'Este link está incompleto. Peça outro.')
  const [linkRuim, setLinkRuim] = useState(!token)
  const [erros, setErros] = useState<string[] | undefined>()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setErro(null)
    setErros(undefined)
    setEnviando(true)
    try {
      abrirSessao(await usar(token, senha))
      navigate('/', { replace: true })
    } catch (falha) {
      const doCampo = falha instanceof ApiError ? falha.details?.[campoDaSenha] : undefined
      if (doCampo) setErros(doCampo)
      else setErro((falha as Error).message)
      // Sem detalhe por campo, um 400 só pode ser o próprio link.
      if (falha instanceof ApiError && falha.status === 400 && !falha.details) setLinkRuim(true)
      setEnviando(false)
    }
  }

  return (
    <TelaAuth>
      <form className="auth-card" onSubmit={enviar} noValidate>
        <span className="auth-sobretitulo">{sobretitulo}</span>
        <h1>{titulo}</h1>
        {linkRuim ? (
          <>
            {erro && <p className="erro" role="alert">{erro}</p>}
            <p className="muted auth-troca"><Link to={pedirOutro.para} className="link">{pedirOutro.texto}</Link></p>
          </>
        ) : (
          <>
            <p className="muted">{texto}</p>
            <CampoSenha rotulo={rotulo} valor={senha} aoMudar={setSenha} autoComplete={autoComplete} dica={dica} erros={erros} />
            {erro && <p className="erro" role="alert">{erro}</p>}
            <button className="btn btn-primario btn-grande" type="submit" disabled={enviando || !senha}>
              {enviando ? 'Aguarde…' : botao}
              <Icone nome="seta" />
            </button>
          </>
        )}
      </form>
    </TelaAuth>
  )
}

export function RedefinirSenha() {
  return (
    <TelaDoLink
      sobretitulo="Quase lá"
      titulo="Senha nova"
      texto="Escolha a senha nova. Ao salvar, as sessões abertas em outros aparelhos são encerradas."
      rotulo="Senha nova"
      autoComplete="new-password"
      dica="Mínimo de 8 caracteres."
      botao="Salvar e entrar"
      campoDaSenha="password"
      pedirOutro={{ para: '/recuperar-senha', texto: 'Pedir outro link' }}
      usar={api.redefinirSenha}
    />
  )
}

export function ConfirmarConta() {
  return (
    <TelaDoLink
      sobretitulo="Último passo"
      titulo="Ativar conta"
      texto="Digite a senha que você escolheu no cadastro. Se você não pediu esta conta, feche esta página."
      rotulo="Senha"
      autoComplete="current-password"
      botao="Ativar e entrar"
      campoDaSenha="password"
      pedirOutro={{ para: '/cadastro', texto: 'Fazer o cadastro de novo' }}
      usar={api.confirmarConta}
    />
  )
}
