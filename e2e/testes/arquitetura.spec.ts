import { expect, test } from '@playwright/test'
import { autorizacao, entrarCom, idDoExercicio, novaConta } from './ajuda'

test('a rotina preserva a duração planejada na sessão guiada', async ({ page, request }) => {
  const { token } = await novaConta(request)
  const exerciseId = await idDoExercicio(request, token, 'Lance livre')
  const day = new Date().getDay()
  const response = await request.put('/api/routine', { headers: autorizacao(token), data: {
    days: Array.from({ length: 7 }, (_, i) => ({ day: i, exercises: i === day ? [{ exerciseId, minutes: 4 }] : [] })),
  } })
  expect(response.ok()).toBeTruthy()
  await entrarCom(page, token)
  await page.goto('/sessao?hoje')
  await expect(page.getByText(/1 exercícios · 4 min/)).toBeVisible()
  await page.getByRole('button', { name: 'Começar', exact: true }).click()
  await expect(page.locator('.guiada-relogio')).toHaveText('04:00')
})

test('abrir Evolução não baixa o histórico completo nem antecipa outras páginas pesadas', async ({ page, request }) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)
  const pedidos: string[] = []
  page.on('request', (r) => pedidos.push(r.url()))
  await page.goto('/evolucao')
  await expect(page.getByRole('table')).toBeVisible()
  // A versão anterior iniciava a antecipação global depois de 1,5 s de ociosidade.
  await page.waitForTimeout(2200)
  expect(pedidos.some((p) => /\/api\/sessions\?/.test(p))).toBeFalsy()
  expect(pedidos.some((p) => /\/(Artigos|Demonstracao3D|Inicio)-.*\.js/.test(p))).toBeFalsy()
  expect(pedidos.some((p) => /\/api\/sessions\/comparison/.test(p))).toBeTruthy()
})
