import { expect, test } from '@playwright/test'
import { SENHA, emailUnico, esperarEmail, linkDoEmail, novaConta, irPara, abrirMenu } from './ajuda'

test('cadastro pelo formulário, ativação pelo e-mail, sair e entrar de novo voltando à página pedida', async ({ page }) => {
  const email = emailUnico('cadastro')

  // Sem login, uma página protegida manda para o login.
  await page.goto('/alimentacao')
  await expect(page).toHaveURL(/\/entrar$/)

  await page.getByRole('link', { name: 'Criar conta' }).click()
  await page.getByLabel('Nome').fill('Marina E2E')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('curta')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeVisible()

  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()

  // Antes de ativar, a conta não entra; depois do link e da senha do cadastro, sim.
  const recusa = await page.request.post('/api/auth/login', { data: { email, password: SENHA } })
  expect(recusa.status()).toBe(401)

  await page.goto(linkDoEmail(await esperarEmail(email, /Ative sua conta/)))
  await page.getByLabel('Senha').fill('senha-de-outra-pessoa')
  await page.getByRole('button', { name: 'Ativar e entrar' }).click()
  await expect(page.getByText('Esta não é a senha escolhida no cadastro.')).toBeVisible()
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Ativar e entrar' }).click()

  // Início com o nome no menu.
  await expect(page.getByRole('heading', { name: /Bora pra quadra/ })).toBeVisible()
  await expect(page.locator('.conta-nome')).toContainText('Marina')

  await abrirMenu(page)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Seu jogo. Próximo nível.', level: 1 })).toBeVisible()

  await page.goto('/alimentacao')
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-errada-123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos')

  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  // Depois do login, volta para a página que foi pedida.
  await expect(page).toHaveURL(/alimentacao$/)
  await expect(page.getByRole('heading', { name: 'Alimentação', level: 1 })).toBeVisible()
})

test('cadastrar um e-mail que já tem conta não revela isso na tela: o aviso vai para o dono', async ({ page, request }) => {
  const { email } = await novaConta(request)

  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Outra pessoa')
  await page.getByLabel('E-mail').fill(email.toUpperCase())
  await page.getByLabel('Senha').fill('Outra-senha-qualquer')
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page.getByRole('status')).toContainText('Se este e-mail puder ser cadastrado')
  await esperarEmail(email, /já tem conta/)

  // A senha da conta continua a mesma.
  const login = await request.post('/api/auth/login', { data: { email, password: SENHA } })
  expect(login.status()).toBe(200)
})

test('Equipamentos e Artigos exigem conta e continuam disponíveis para usuários autorizados', async ({ page, request }) => {
  for (const rota of ['/equipamentos', '/artigos']) {
    await page.goto(rota)
    await expect(page).toHaveURL(/\/entrar$/)
  }
  const { token } = await novaConta(request)
  await page.addInitScript(t => localStorage.setItem('bp.token', t), token)
  await page.goto('/equipamentos')
  await expect(page.getByRole('heading', { name: 'Equipamentos', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ver na Amazon/ }).first()).toHaveAttribute('href', /amazon\.com\.br/)

  await irPara(page, 'Artigos')
  await expect(page.getByRole('heading', { name: 'Artigos', level: 1 })).toBeVisible()
})
