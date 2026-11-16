import { expect, test } from '@playwright/test'
import { aceitarDialogos, autorizacao, entrarCom, novaConta, registrarSessao } from './ajuda'

test('o tema escolhido fica salvo na conta, não só neste navegador', async ({ page, request }) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  await page.goto('/configuracoes')
  await page.getByRole('radio', { name: 'Escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect
    .poll(async () => ((await (await request.get('/api/settings', { headers: autorizacao(token) })).json()) as { theme: string }).theme)
    .toBe('escuro')

  // Sem o tema guardado no navegador, o da conta volta depois do login.
  await page.evaluate(() => localStorage.removeItem('bp.tema'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('backup: baixa o JSON e importar o mesmo arquivo não duplica nada', async ({ page, request }) => {
  aceitarDialogos(page)
  const { token } = await novaConta(request)
  await registrarSessao(request, token, 8, 10)
  await entrarCom(page, token)

  await page.goto('/configuracoes')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar backup (JSON)' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^basketball-practice-\d{4}-\d{2}-\d{2}\.json$/)
  const arquivo = await download.path()

  await page.locator('input[type=file]').setInputFiles(arquivo)
  await expect(page.getByRole('status')).toContainText('Importado: 0 sessões')
  await expect(page.getByRole('status')).toContainText('1 sessões já existiam')

  const sessoes = (await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()) as unknown[]
  expect(sessoes).toHaveLength(1)
})
