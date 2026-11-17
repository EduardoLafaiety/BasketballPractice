import { expect, test } from '@playwright/test'
import { autorizacao, entrarCom, novaConta, irPara } from './ajuda'

// A jornada principal: montar o treino de hoje, fazer a sessão guiada e salvar o resultado.
test('monta a rotina de hoje, faz a sessão guiada e salva a sessão', async ({
  page,
  request,
}) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  // Rotina: o cartão de hoje vem destacado; o exercício aparece na hora e é salvo na API em segundo plano.
  await page.goto('/rotina')
  const hoje = page.locator('.dia.hoje')
  const salvou = page.waitForResponse(
    (r) => r.url().endsWith('/api/workouts') && r.request().method() === 'POST' && r.status() === 201,
  )
  await hoje.getByRole('combobox').selectOption({ label: 'Lance livre' })
  await expect(hoje.getByRole('button', { name: 'Remover Lance livre' })).toBeVisible()
  await salvou
  await page.reload()
  await expect(page.locator('.dia.hoje').getByRole('button', { name: 'Remover Lance livre' })).toBeVisible()

  // Início mostra o treino do dia e leva à sessão guiada.
  await irPara(page, 'Início')
  await expect(page.locator('.lista-treino').getByRole('link', { name: /Lance livre/ })).toBeVisible()
  await page.getByRole('link', { name: 'Começar treino de hoje' }).click()
  await page.getByRole('button', { name: 'Começar', exact: true }).click()

  // Contador ao vivo: 3 acertos e 1 erro.
  const acertou = page.getByRole('button', { name: /Acertou/ })
  await acertou.click()
  await acertou.click()
  await acertou.click()
  await page.getByRole('button', { name: /Errou/ }).click()
  await expect(page.locator('.contador-placar')).toContainText('3/4')

  await page.getByRole('button', { name: 'Concluir treino' }).click()
  await expect(page.getByRole('heading', { name: /Treino concluído/ })).toBeVisible()
  await expect(page.getByText('aproveitamento (3/4)')).toBeVisible()
  await page.getByRole('button', { name: 'Salvar sessão' }).click()

  // A sessão saiu para o banco.
  await expect.poll(async () => ((await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()) as unknown[]).length).toBe(1)
})
