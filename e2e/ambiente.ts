// Portas e banco dos testes de ponta a ponta (fora das portas de desenvolvimento: 3333 e 5173).
export const PORTA_API = 3410
export const PORTA_SITE = 4410
export const BANCO_E2E =
  process.env.E2E_DATABASE_URL ?? 'postgres://basketball:basketball@localhost:5433/basketball_e2e'
