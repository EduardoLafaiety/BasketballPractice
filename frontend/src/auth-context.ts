import { createContext } from 'react'
import type { Usuario } from './api'

export interface AuthValor {
  usuario: Usuario | null
  /** true enquanto confere um token salvo de uma visita anterior. */
  verificando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>
  sair: () => void
}

// Fica num módulo só seu (sem imports de valor) para que o HMR do Vite, ao recarregar
// auth.tsx ou api.ts, não crie um contexto novo e deixe o Layout fora do Provider.
export const AuthContext = createContext<AuthValor | null>(null)
