import { createContext } from 'react'
import type { AuthResposta, Usuario } from './api'

export interface AuthValor {
  usuario: Usuario | null
  /** true enquanto confere um token salvo de uma visita anterior. */
  verificando: boolean
  /** true enquanto há token salvo, mesmo sem usuario confirmado. */
  temToken: boolean
  /** Última falha passageira (503, rede) ao conferir o token; ele segue salvo e a conferência é refeita sozinha. */
  erroSessao: Error | null
  reconferirSessao: () => void
  entrar: (email: string, senha: string) => Promise<void>
  /** Não entra na conta: devolve o aviso de que o link de ativação foi enviado. */
  cadastrar: (nome: string, email: string, senha: string) => Promise<string>
  /** Entra com a sessão devolvida por um link de e-mail. */
  abrirSessao: (sessao: AuthResposta) => void
  /** Revoga o token na API e limpa o navegador. */
  sair: () => void
  /** Só limpa o navegador: o token já não vale (conta excluída). */
  encerrarLocal: () => void
}

// Fica num módulo só seu (sem imports de valor) para que o HMR do Vite, ao recarregar
// auth.tsx ou api.ts, não crie um contexto novo e deixe o Layout fora do Provider.
export const AuthContext = createContext<AuthValor | null>(null)
