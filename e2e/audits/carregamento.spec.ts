import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { entrarCom, idDoExercicio, novaConta } from '../testes/ajuda'

// A sonda mede a rede da página; o service worker poderia atender o módulo antes da interceptação.
test.use({ serviceWorkers: 'block' })

test('mede abertura de uma demonstração sem preferência prévia', async ({ page, request }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const { token } = await novaConta(request)
  const id = await idDoExercicio(request, token, 'Lance livre')
  await entrarCom(page, token)
  const consultas: string[] = []
  page.on('request', (r) => { if (r.method() === 'GET' && new URL(r.url()).pathname === '/api/sessions') consultas.push(new URL(r.url()).pathname) })
  await page.goto(`/treinos/${id}`)
  await expect(page.getByRole('region', { name: /Demonstração.*Lance livre/ })).toBeVisible()
  const recursos = await page.evaluate(() => (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map((r) => ({ url: new URL(r.name).pathname, bytes: r.encodedBodySize })))
  const resultado = { consultasHistorico: consultas.length, recursos3d: recursos.filter((r) => /Demonstracao3D/.test(r.url)), jsBytes: recursos.filter((r) => r.url.endsWith('.js')).reduce((n, r) => n + r.bytes, 0) }
  expect(resultado.consultasHistorico).toBe(0)
  expect(resultado.recursos3d).toHaveLength(0)
  await writeFile(info.outputPath('carregamento.json'), JSON.stringify(resultado, null, 2))
  await info.attach('carregamento.json', { body: JSON.stringify(resultado), contentType: 'application/json' })
})

test('falha no download 3D preserva o contador e a demonstração 2D', async ({ page, request }) => {
  const { token } = await novaConta(request)
  const id = await idDoExercicio(request, token, 'Lance livre')
  await entrarCom(page, token)
  await page.route('**/Demonstracao3D-*.js', (route) => route.abort())
  await page.goto(`/treinos/${id}`)
  await page.getByRole('button', { name: /acertou/i }).click()
  await expect(page.locator('.contador-placar')).toContainText('1/1')
  await page.getByRole('button', { name: 'Ver em 3D' }).click()
  await expect(page.getByRole('status').filter({ hasText: /indisponível/ })).toBeVisible()
  await expect(page.getByRole('region', { name: /Demonstração.*Lance livre/ })).toBeVisible()
  await expect(page.locator('.contador-placar')).toContainText('1/1')
})
