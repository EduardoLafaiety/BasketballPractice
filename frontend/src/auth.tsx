import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError, aoTokenExpirar, api, definirToken, tokenAtual, type Usuario } from './api'
import { AuthContext, type AuthValor } from './auth-context'
import { limparCache } from './store'
import { Carregando } from './components/Estado'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [verificando, setVerificando] = useState(() => tokenAtual() !== null)

  const sair = useCallback(() => {
    definirToken(null)
    limparCache()
    setUsuario(null)
  }, [])

  useEffect(() => {
    aoTokenExpirar(sair)
    return () => aoTokenExpirar(null)
  }, [sair])

  useEffect(() => {
    if (!tokenAtual()) return
    api
      .eu()
      .then(setUsuario)
      .catch((e) => {
        // Só descarta o token se ele for inválido; falha de rede mantém a sessão.
        if (e instanceof ApiError && e.status === 401) sair()
      })
      .finally(() => setVerificando(false))
  }, [sair])

  const valor = useMemo<AuthValor>(
    () => ({
      usuario,
      verificando,
      sair,
      async entrar(email, senha) {
        const r = await api.entrar(email, senha)
        definirToken(r.token)
        setUsuario(r.user)
      },
      async cadastrar(nome, email, senha) {
        const r = await api.cadastrar(nome, email, senha)
        definirToken(r.token)
        setUsuario(r.user)
      },
    }),
    [usuario, verificando, sair],
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
  const { usuario, verificando } = useAuth()
  const local = useLocation()
  if (verificando) return <Carregando texto="Conferindo sua sessão…" />
  if (!usuario && !tokenAtual()) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  return <>{children}</>
}

/** Só admins entram; os demais veem a página de "não encontrada" (a API também bloqueia). */
export function RequerAdmin({ children, senao }: { children: ReactNode; senao: ReactNode }) {
  const { usuario } = useAuth()
  if (!usuario) return <Carregando texto="Conferindo sua sessão…" />
  return <>{usuario.isAdmin ? children : senao}</>
}
