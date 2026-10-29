/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // API_PROXY muda o destino do proxy em dev (padrão: backend local na 3333).
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': env.API_PROXY || 'http://localhost:3333',
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      // Fixo para as contas de data e hora darem o mesmo resultado em qualquer máquina.
      env: { TZ: 'America/Sao_Paulo' },
    },
  }
})
