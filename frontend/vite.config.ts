import { fileURLToPath } from 'node:url'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const local = (caminho: string) => fileURLToPath(new URL(caminho, import.meta.url))

// O runtime local assina o mesmo store de idioma do app. Pré-empacotá-lo criaria
// uma segunda cópia do store em dev, isolando os controles dos textos da página.
function localizacao(): Plugin {
  return {
    name: 'localizacao-runtime-unico',
    configResolved(config) {
      config.optimizeDeps.include = config.optimizeDeps.include?.filter(id => !id.startsWith('@localizacao/'))
    },
  }
}

export default defineConfig(({ mode, command }) => {
  // API_PROXY muda o destino do proxy em dev (padrão: backend local na 3333).
  const env = loadEnv(mode, process.cwd(), '')
  const demo = env.VITE_DEMO === 'true'
  // A demonstração não possui cobrança nem servidor: não pode virar publicação comercial.
  if (command === 'build' && demo && (process.env.CI || process.env.CF_PAGES || process.env.RENDER)) {
    throw new Error('A demonstração sem cobrança é exclusiva de desenvolvimento local. Publique o build normal conectado à API.')
  }
  return {
    // VITE_BASE publica o site numa subpasta (ex.: /BasketballPractice/ no GitHub Pages).
    base: env.VITE_BASE || '/',
    plugins: [react({ jsxImportSource: '@localizacao' }), localizacao()],
    // Constante de compilação: no site normal vira false e o bundler descarta todo o código da demonstração.
    define: { __DEMO__: JSON.stringify(demo) },
    resolve: {
      // Versão de demonstração (src/demo): as rotas do backend rodam no navegador. Só o que é exclusivo
      // de servidor é trocado; o site normal nunca importa esses módulos.
      alias: [
        { find: '@localizacao', replacement: local('./src/shared/i18n') },
        // Fora da demonstração, o servidor do navegador vira um módulo vazio: nada de PGlite no site normal.
        { find: /^@demo\/servidor$/, replacement: local(demo ? './src/demo/servidor.ts' : './src/demo/sem-demo.ts') },
        { find: /^express$/, replacement: local('./src/demo/express.ts') },
        { find: /^pg$/, replacement: local('./src/demo/stubs.ts') },
        { find: /^(?:\.\.\/)+lib\/token\.js$/, replacement: local('./src/demo/stubs.ts') },
      ],
    },
    // O 3D das demonstrações (three.js) é um arquivo à parte, baixado por escolha explícita ou preferência salva.
    build: { manifest: true, target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'], chunkSizeWarningLimit: 700 },
    // O PGlite carrega o próprio WebAssembly; o pré-empacotamento do Vite em dev quebraria isso.
    optimizeDeps: { exclude: ['@electric-sql/pglite', '@localizacao/jsx-runtime', '@localizacao/jsx-dev-runtime'] },
    server: {
      proxy: {
        '/api': env.API_PROXY || 'http://localhost:3333',
      },
      // A demonstração importa as rotas de ../backend.
      fs: { allow: ['..'] },
    },
    test: {
      // Limita os bancos WASM e ambientes jsdom simultâneos para evitar disputa de memória no CI.
      maxWorkers: 2,
      minWorkers: 1,
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      // Fixo para as contas de data e hora darem o mesmo resultado em qualquer máquina.
      env: { TZ: 'America/Sao_Paulo' },
    },
  }
})
