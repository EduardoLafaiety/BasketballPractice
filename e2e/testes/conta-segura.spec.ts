import { expect, test } from '@playwright/test'
import { abrirMenu, autorizacao, emailUnico, entrarCom, esperarEmail, linkDoEmail, novaConta, registrarSessao, SENHA } from './ajuda'

const NOVA = 'Outra-senha-dos-testes'

test('esqueci a senha: o link do e-mail troca a senha, entra e derruba a sessão antiga', async ({ page, request }) => {
  const { email, token } = await novaConta(request)

  await page.goto('/entrar')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByRole('status')).toContainText('Se houver uma conta com este e-mail')

  const link = linkDoEmail(await esperarEmail(email, /senha nova/))
  await page.goto(link)
  await page.getByLabel('Senha nova').fill('12345678')
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page.getByText('Essa senha é fácil demais de adivinhar. Escolha outra.')).toBeVisible()

  await page.getByLabel('Senha nova').fill(NOVA)
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page.getByRole('heading', { name: /Bora pra quadra/ })).toBeVisible()

  expect((await request.get('/api/auth/me', { headers: autorizacao(token) })).status()).toBe(401)
  expect((await request.post('/api/auth/login', { data: { email, password: SENHA } })).status()).toBe(401)
  expect((await request.post('/api/auth/login', { data: { email, password: NOVA } })).status()).toBe(200)

  // O mesmo link não funciona uma segunda vez.
  await page.goto('/entrar')
  await page.evaluate(() => localStorage.clear())
  await page.goto(link)
  await page.getByLabel('Senha nova').fill('Mais-uma-senha-boa')
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('inválido ou já venceu')
})

test('e-mail sem conta tem a mesma resposta na tela', async ({ page }) => {
  await page.goto('/recuperar-senha')
  await page.getByLabel('E-mail').fill(emailUnico('ninguem'))
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByRole('status')).toContainText('Se houver uma conta com este e-mail')
})

test('trocar a senha em Configurações mantém este aparelho e derruba os outros', async ({ page, request }) => {
  const { email, token } = await novaConta(request)
  const outroAparelho = ((await (await request.post('/api/auth/login', { data: { email, password: SENHA } })).json()) as { token: string }).token
  await entrarCom(page, token)
  await page.goto('/configuracoes')

  await page.getByLabel('Senha atual').fill('nao-e-a-senha')
  await page.getByLabel('Senha nova').fill(NOVA)
  await page.getByRole('button', { name: 'Trocar a senha' }).click()
  await expect(page.getByText('Senha incorreta.')).toBeVisible()

  await page.getByLabel('Senha atual').fill(SENHA)
  await page.getByRole('button', { name: 'Trocar a senha' }).click()
  await expect(page.getByText(/Senha trocada/)).toBeVisible()

  expect((await request.get('/api/auth/me', { headers: autorizacao(outroAparelho) })).status()).toBe(401)
  // Este aparelho guardou o token novo e segue navegando com ele.
  expect(await page.evaluate(() => localStorage.getItem('bp.token'))).not.toBe(token)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Metas' }).click()
  await expect(page.getByRole('heading', { name: 'Metas e conquistas' })).toBeVisible()
})

test('sair revoga o token de verdade', async ({ page, request }) => {
  const { token } = await novaConta(request)
  await page.goto('/entrar')
  await page.evaluate((t) => localStorage.setItem('bp.token', t), token)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Bora pra quadra/ })).toBeVisible()

  await abrirMenu(page)
  const revogado = page.waitForResponse((r) => r.url().endsWith('/api/auth/logout'))
  await page.getByRole('button', { name: 'Sair' }).click()
  expect((await revogado).status()).toBe(204)
  await expect(page).toHaveURL(/\/entrar$/)

  expect((await request.get('/api/auth/me', { headers: autorizacao(token) })).status()).toBe(401)
})

test('excluir a conta em Configurações apaga os dados, sai e libera o e-mail', async ({ page, request }) => {
  const { email, token } = await novaConta(request)
  await registrarSessao(request, token, 8, 10)
  await entrarCom(page, token)
  await page.goto('/configuracoes')

  await page.getByRole('button', { name: 'Excluir minha conta' }).click()
  await page.getByLabel('Confirme com sua senha').fill('nao-e-a-senha')
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click()
  await expect(page.getByText('Senha incorreta.')).toBeVisible()
  expect((await request.get('/api/auth/me', { headers: autorizacao(token) })).status()).toBe(200)

  await page.getByLabel('Confirme com sua senha').fill(SENHA)
  const excluida = page.waitForResponse((r) => r.url().endsWith('/api/auth/me') && r.request().method() === 'DELETE')
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click()
  expect((await excluida).status()).toBe(204)
  await expect(page).toHaveURL(/\/entrar$/)

  expect((await request.get('/api/auth/me', { headers: autorizacao(token) })).status()).toBe(401)
  expect((await request.post('/api/auth/login', { data: { email, password: SENHA } })).status()).toBe(401)
  expect((await request.post('/api/auth/register', { data: { name: 'De novo', email, password: SENHA } })).status()).toBe(202)
  await esperarEmail(email, /Ative sua conta/, 2)
})

test('os documentos abrem do cadastro e do rodapé, marcados como rascunho, com o rodapé fora da barra de notícias', async ({ page, request }) => {
  await page.goto('/cadastro')
  await page.getByRole('link', { name: 'Termos de Uso' }).first().click()
  await expect(page.getByRole('heading', { name: 'Termos de Uso', level: 1 })).toBeVisible()
  await expect(page.getByRole('note')).toContainText('revisado por um advogado')

  // Com uma manchete, a barra de notícias aparece fixa no fim da tela, por cima do que não tiver folga.
  await page.route('**/api/news', (rota) =>
    rota.fulfill({ json: [{ id: 1, origin: 'admin', title: 'Manchete do teste', sourceName: null, url: null, publishedAt: new Date().toISOString(), expiresAt: null }] }),
  )
  const { token } = await novaConta(request)
  await entrarCom(page, token)
  await page.goto('/configuracoes')
  await expect(page.getByText('Manchete do teste').first()).toBeVisible()
  const link = page.getByRole('contentinfo').getByRole('link', { name: 'Política de Privacidade' })
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(link).toBeInViewport({ ratio: 1 })
  // Clica de verdade: se a barra fixa estivesse por cima, o clique não chegaria ao link.
  await link.click({ timeout: 5_000 })
  await expect(page.getByRole('heading', { name: 'Política de Privacidade', level: 1 })).toBeVisible()
  await expect(page.getByRole('note')).toContainText('Rascunho')
})
