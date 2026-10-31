import { expect, test } from '@playwright/test'
import { emailUnico, SENHA } from './ajuda'

// A tela mostra o texto que a API real manda; os testes do site usam uma API falsa e não veem essa ligação.
test('o erro do cadastro chega da API real à tela, em português', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel(/nome/i).fill('M')
  await page.getByLabel(/e-mail/i).fill(emailUnico('curto'))
  await page.getByLabel(/senha/i).fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page.getByText('O nome precisa ter pelo menos 2 letras.')).toBeVisible()
  await expect(page).toHaveURL(/cadastro/)
})
