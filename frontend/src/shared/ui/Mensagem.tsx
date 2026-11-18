import type { ReactNode } from 'react'

export default function Mensagem({ tipo = 'erro', children }: { tipo?: 'erro' | 'sucesso' | 'informacao'; children: ReactNode }) {
  return <p className={tipo === 'informacao' ? 'meta' : tipo} role={tipo === 'erro' ? 'alert' : 'status'}>{children}</p>
}
