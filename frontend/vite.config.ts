/// <reference types="vitest" />
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const local = (caminho: string) => fileURLToPath(new URL(caminho, import.meta.url))

export default defineConfig(({ mode }) => {
  // API_PROXY muda o destino do proxy em dev (padrão: backend local na 3333).
  const env = loadEnv(mode, process.cwd(), '')
  const demo = env.VITE_DEMO === 'true'
  return {
    // VITE_BASE publica o site numa subpasta (ex.: /BasketballPractice/ no GitHub Pages).
    base: env.VITE_BASE || '/',
    plugins: [react()],
    // Constante de compilação: no site normal vira false e o bundler descarta todo o código da demonstração.
    define: { __DEMO__: JSON.stringify(demo) },
    resolve: {
      // Versão de demonstração (src/demo): as rotas do backend rodam no navegador. Só o que é exclusivo
      // de servidor é trocado; o site normal nunca importa esses módulos.
      alias: [
        // Fora da demonstração, o servidor do navegador vira um módulo vazio: nada de PGlite no site normal.
        { find: /^@demo\/servidor$/, replacement: local(demo ? './src/demo/servidor.ts' : './src/demo/sem-demo.ts') },
        { find: /^express$/, replacement: local('./src/demo/express.ts') },
        { find: /^pg$/, replacement: local('./src/demo/stubs.ts') },
        { find: /^\.\.\/lib\/token\.js$/, replacement: local('./src/demo/stubs.ts') },
      ],
    },
    // O PGlite carrega o próprio WebAssembly; o pré-empacotamento do Vite em dev quebraria isso.
    optimizeDeps: { exclude: ['@electric-sql/pglite'] },
    server: {
      proxy: {
        '/api': env.API_PROXY || 'http://localhost:3333',
      },
      // A demonstração importa as rotas de ../backend.
      fs: { allow: ['..'] },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      // Fixo para as contas de data e hora darem o mesmo resultado em qualquer máquina.
      env: { TZ: 'America/Sao_Paulo' },
    },
  }
})
