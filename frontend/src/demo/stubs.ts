// Módulos do backend que só existem no servidor. Na demonstração (alias no vite.config.ts) nada os chama:
// não há conexão com Postgres nem login com token.

class PoolIndisponivel {
  constructor() {
    throw new Error('A demonstração usa o PGlite no navegador, não um Postgres de verdade')
  }
}

export default { Pool: PoolIndisponivel }

export const signToken = () => 'demo'
export const verifyToken = () => null
