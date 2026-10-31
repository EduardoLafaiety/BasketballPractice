import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError, aoTokenExpirar, api, definirToken, tokenAtual, type Usuario } from './api'
import { AuthContext, type AuthValor } from './auth-context'
import { limparCache } from './store'
import { Carregando, ErroCarga } from './components/Estado'

/** Espera até conferir de novo a sessão depois de uma falha passageira. */
export const REVERIFICAR_MS = 15_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [verificando, setVerificando] = useState(() => tokenAtual() !== null)
  const [erroSessao, setErroSessao] = useState<Error | null>(null)
  // Espelha o token no estado: sem isso, sair com usuario ainda null não redesenharia as rotas protegidas.
  const [temToken, setTemToken] = useState(() => tokenAtual() !== null)

  const encerrarLocal = useCallback(() => {
    definirToken(null)
    limparCache()
    setUsuario(null)
    setErroSessao(null)
    setTemToken(false)
  }, [])

  // A tela sai na hora, sem esperar a rede. O pedido já partiu com o token: o fetch monta os cabeçalhos ao ser chamado.
  // Sem conexão, o token não é revogado no servidor e vale até expirar, mas some deste navegador.
  const sair = useCallback(() => {
    if (tokenAtual()) void api.sair().catch(() => {})
    encerrarLocal()
  }, [encerrarLocal])

  useEffect(() => {
    aoTokenExpirar(encerrarLocal)
    return () => aoTokenExpirar(null)
  }, [encerrarLocal])

  const conferirSessao = useCallback(() => {
    const conferido = tokenAtual()
    return api
      .eu()
      .then((u) => {
        // Saiu ou trocou de conta enquanto esperava: esta resposta já não vale.
        if (tokenAtual() !== conferido) return
        setUsuario(u)
        setErroSessao(null)
      })
      .catch((e) => {
        // Só descarta o token se ele for inválido; falha de rede mantém a sessão.
        if (e instanceof ApiError && e.status === 401) encerrarLocal()
        else if (tokenAtual() === conferido) setErroSessao(e)
      })
  }, [encerrarLocal])

  useEffect(() => {
    if (!tokenAtual()) return
    conferirSessao().finally(() => setVerificando(false))
  }, [conferirSessao])

  // Cada falha traz um erro novo e rearma a espera, até a API voltar ou a pessoa sair.
  useEffect(() => {
    if (!erroSessao) return
    const timer = window.setTimeout(conferirSessao, REVERIFICAR_MS)
    return () => window.clearTimeout(timer)
  }, [erroSessao, conferirSessao])

  const abrirSessao = useCallback((r: { token: string; user: Usuario }) => {
    definirToken(r.token)
    setUsuario(r.user)
    setErroSessao(null)
    setTemToken(true)
  }, [])

  const valor = useMemo<AuthValor>(
    () => ({
      usuario,
      verificando,
      temToken,
      erroSessao,
      reconferirSessao() {
        setErroSessao(null)
        void conferirSessao()
      },
      sair,
      encerrarLocal,
      abrirSessao,
      async entrar(email, senha) {
        abrirSessao(await api.entrar(email, senha))
      },
      async cadastrar(nome, email, senha) {
        return (await api.cadastrar(nome, email, senha)).message
      },
    }),
    [usuario, verificando, temToken, erroSessao, conferirSessao, abrirSessao, sair, encerrarLocal],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return valor
}

/** Protege rotas: sem login, manda para /entrar e volta depois. */
export function RequerLogin({ children }: { children: ReactNode }) {
  const { usuario, verificando, temToken } = useAuth()
  const local = useLocation()
  if (verificando) return <Carregando texto={__DEMO__ ? 'Preparando o app…' : 'Conferindo sua sessão…'} />
  if (!usuario && !temToken) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  return <>{children}</>
}

/** Só admins entram; os demais veem a página de "não encontrada" (a API também bloqueia). */
export function RequerAdmin({ children, senao }: { children: ReactNode; senao: ReactNode }) {
  const { usuario, erroSessao, reconferirSessao } = useAuth()
  if (!usuario && erroSessao) return <ErroCarga erro={erroSessao} tentarDeNovo={reconferirSessao} />
  if (!usuario) return <Carregando texto="Conferindo sua sessão…" />
  return <>{usuario.isAdmin ? children : senao}</>
}
