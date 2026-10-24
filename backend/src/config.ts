try {
  process.loadEnvFile()
} catch {
  // Sem .env: usa variáveis do ambiente e os padrões abaixo.
}

const isProduction = process.env.NODE_ENV === 'production'
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me'

if (isProduction && jwtSecret === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET precisa ser definido em produção')
}

export const config = {
  port: Number(process.env.PORT ?? 3333),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://basketball:basketball@localhost:5433/basketball',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}
