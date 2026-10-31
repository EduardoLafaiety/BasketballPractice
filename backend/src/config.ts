try {
  process.loadEnvFile()
} catch {
  // Sem .env: usa variáveis do ambiente e os padrões abaixo.
}

const MIN_SECRET_LENGTH = 32
// O valor de .env.example é público: quem o usa em produção deixa qualquer um forjar tokens.
const PUBLIC_SECRETS = ['troque-este-segredo-por-um-valor-longo-e-aleatorio']

/** Em produção, a API não sobe com um segredo que dê para adivinhar. */
export function assertProductionSecret(secret: string) {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET precisa ter pelo menos ${MIN_SECRET_LENGTH} caracteres em produção`)
  }
  if (PUBLIC_SECRETS.includes(secret)) {
    throw new Error('JWT_SECRET não pode ser o valor de exemplo em produção')
  }
}

const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) assertProductionSecret(process.env.JWT_SECRET ?? '')
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'

export const config = {
  port: Number(process.env.PORT ?? 3333),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://basketball:basketball@localhost:5433/basketball',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Atrás de um proxy (Nginx, Render, Railway…), defina TRUST_PROXY=1 para o req.ip ser o do atleta, não o do proxy.
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  /** Tentativas erradas de login e cadastro por IP a cada 15 minutos. */
  authAttempts: Number(process.env.AUTH_ATTEMPTS ?? 10),
  /** Senhas erradas por conta a cada 15 minutos, venham de quantos IPs vierem. Fica acima do limite por IP, para o atleta que erra a própria senha parar nele. */
  accountAttempts: Number(process.env.ACCOUNT_ATTEMPTS ?? 20),
  /** Contas criadas com sucesso por IP a cada hora. Folgado para uma equipe se cadastrar na mesma rede. */
  registrationsPerHour: Number(process.env.REGISTRATIONS_PER_HOUR ?? 30),
  /** Importações de backup ao mesmo tempo nesta instância. */
  maxImports: Number(process.env.MAX_IMPORTS ?? 2),
  /** Chave do GNews; vazia, a barra de notícias mostra só as manchetes do admin. */
  gnewsApiKey: process.env.GNEWS_API_KEY ?? '',
  /** A cada 20 minutos são 72 das 100 consultas diárias do plano grátis; o resto fica para a demonstração. */
  newsIntervalMinutes: Number(process.env.NEWS_INTERVAL_MINUTES ?? 20),
}
