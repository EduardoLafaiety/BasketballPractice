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
  }
})
