import { expect, test } from '@playwright/test'
import { SENHA, emailUnico, novaConta, numero, irPara, abrirMenu } from './ajuda'

test('cadastro pelo formulário, sair e entrar de novo voltando à página pedida', async ({ page }) => {
  const email = emailUnico('cadastro')

  // Sem login, uma página protegida manda para o login.
  await page.goto('/desempenho')
  await expect(page).toHaveURL(/\/entrar$/)

  await page.getByRole('link', { name: 'Criar conta' }).click()
  await page.getByLabel('Nome').fill('Marina E2E')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('curta')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeVisible()

  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()

  // Volta à página que tinha pedido antes do login, já com a conta nova (sem nenhuma sessão).
  await expect(page).toHaveURL(/\/desempenho$/)
  await expect(page.getByText('Você ainda não registrou nenhuma sessão.')).toBeVisible()

  // Início zerado, com o nome no menu.
  await irPara(page, 'Início')
  await expect(page.getByRole('heading', { name: /Bora pra quadra/ })).toBeVisible()
  await expect(numero(page, 'sessões nos últimos 7 dias')).toHaveText('0')
  await expect(page.locator('.conta-nome')).toContainText('Marina')

  await abrirMenu(page)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/entrar$/)

  await page.goto('/metas')
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-errada-123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos')

  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/metas$/)
  await expect(page.getByRole('heading', { name: 'Metas e conquistas' })).toBeVisible()
})

test('não deixa cadastrar o mesmo e-mail duas vezes, nem com maiúsculas', async ({ page, request }) => {
  const { email } = await novaConta(request)

  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Outra pessoa')
  await page.getByLabel('E-mail').fill(email.toUpperCase())
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page.getByRole('alert')).toHaveText('E-mail já cadastrado')
  await expect(page).toHaveURL(/\/cadastro$/)
})
