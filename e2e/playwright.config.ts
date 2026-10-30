import { defineConfig, devices } from '@playwright/test'
import { BANCO_E2E, PORTA_API, PORTA_SITE } from './ambiente'

// Testes de ponta a ponta: o site de produção (build + preview) falando com a API real,
// que usa um Postgres de verdade num banco só dos testes (recriado vazio a cada execução).
export default defineConfig({
  testDir: './testes',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORTA_SITE}`,
    // Chrome já instalado na máquina (e nos runners do GitHub): nada de baixar navegador.
    channel: 'chrome',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: [
    {
      // Banco limpo e a API real (a mesma de `npm run dev`, sem o modo watch).
      command: 'node preparar-banco.mjs && node ../backend/node_modules/tsx/dist/cli.mjs ../backend/src/server.ts',
      url: `http://localhost:${PORTA_API}/api/health`,
      // Chave vazia: os testes não gastam a cota do GNews mesmo que o .env do backend tenha uma.
      env: { PORT: String(PORTA_API), DATABASE_URL: BANCO_E2E, JWT_SECRET: 'segredo-dos-testes-e2e', GNEWS_API_KEY: '' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // Build de produção servido pelo preview do Vite, com /api apontando para a API acima.
      command: `npm --prefix ../frontend run build && npm --prefix ../frontend run preview -- --port ${PORTA_SITE} --strictPort`,
      url: `http://localhost:${PORTA_SITE}`,
      env: { API_PROXY: `http://localhost:${PORTA_API}` },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
})
