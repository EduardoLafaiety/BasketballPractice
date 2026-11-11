import { expect, test } from '@playwright/test'
import { aceitarDialogos, entrarCom, novaConta, registrarSessao } from './ajuda'

test('modo técnico: time criado, atleta entra pelo link, cumpre o treino e o técnico acompanha', async ({ page, browser, request }) => {
  const tecnico = await novaConta(request, 'Técnica E2E')
  const atleta = await novaConta(request, 'Atleta do Time')
  await registrarSessao(request, atleta.token, 8, 10)

  // A técnica cria o time e passa um treino.
  await entrarCom(page, tecnico.token)
  await page.goto('/time')
  await page.getByLabel('Nome do time').fill('Sub-17 E2E')
  await page.getByRole('button', { name: 'Criar time' }).click()
  await expect(page.getByRole('heading', { name: 'Sub-17 E2E' })).toBeVisible()
  const link = await page.locator('.convite-link').textContent()
  expect(link).toMatch(/\/time\/entrar\/[\w-]{6,}$/)

  await page.getByLabel('Exercício').selectOption({ label: 'Mikan drill' })
  await page.getByRole('button', { name: '+ Adicionar exercício' }).click()
  await page.getByLabel(/^Título/).fill('Finalização de sexta')
  await page.getByRole('button', { name: 'Passar para o time' }).click()
  await expect(page.getByText('0 de 0 cumpriram')).toBeVisible()

  // O atleta entra pelo link e marca o treino como feito.
  const { baseURL, storageState } = test.info().project.use
  const contexto = await browser.newContext({ baseURL, storageState })
  const paginaAtleta = await contexto.newPage()
  aceitarDialogos(paginaAtleta)
  await entrarCom(paginaAtleta, atleta.token)
  await paginaAtleta.goto(new URL(link!).pathname)
  await expect(paginaAtleta.getByText(/o técnico passa a ver os seus treinos da semana/)).toBeVisible()
  await paginaAtleta.getByRole('button', { name: 'Entrar no time' }).click()
  await expect(paginaAtleta.getByRole('heading', { name: 'Finalização de sexta' })).toBeVisible()
  await paginaAtleta.getByRole('button', { name: 'Já treinei, marcar como feito' }).click()
  await expect(paginaAtleta.getByText('Feito', { exact: true })).toBeVisible()

  // A técnica vê o atleta, os treinos da semana e a tarefa cumprida.
  await page.reload()
  const linha = page.locator('.atleta-linha').filter({ hasText: 'Atleta do Time' })
  await expect(linha).toContainText('1 treino em 7 dias')
  await expect(linha).toContainText('Finalização de sexta: feito')
  await expect(page.getByText('1 de 1 cumpriram')).toBeVisible()
  await contexto.close()
})
