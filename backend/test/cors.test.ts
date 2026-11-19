import assert from 'node:assert/strict'
import { it } from 'node:test'

// CORS_ORIGIN é lido quando a configuração carrega, então precisa estar definido antes de importar a API.
process.env.CORS_ORIGIN = ' https://exemplo.com.br/ , https://www.exemplo.com.br,https://antigo.netlify.app '
const { startApi } = await import('./http.js')
const { config } = await import('../src/config.js')

const permitido = async (baseUrl: string, origem: string) => {
  const resposta = await fetch(`${baseUrl}/health`, { method: 'OPTIONS', headers: { Origin: origem, 'Access-Control-Request-Method': 'GET' } })
  return resposta.headers.get('access-control-allow-origin')
}

it('CORS_ORIGIN aceita vários endereços, ignora espaços e barra final', () => {
  assert.deepEqual(config.corsOrigins, ['https://exemplo.com.br', 'https://www.exemplo.com.br', 'https://antigo.netlify.app'])
})

it('responde só aos endereços da lista', async () => {
  const { baseUrl } = await startApi()
  for (const origem of config.corsOrigins) assert.equal(await permitido(baseUrl, origem), origem)
  assert.equal(await permitido(baseUrl, 'https://intruso.example'), null)
})
