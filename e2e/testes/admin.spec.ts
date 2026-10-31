import { expect, test } from '@playwright/test'
import pg from 'pg'
import { BANCO_E2E, PORTA_SITE } from '../ambiente'
import { entrarCom, novaConta, abrirMenu } from './ajuda'

// Mesmo efeito de `npm run admin -- email`, direto no banco dos testes.
async function tornarAdmin(email: string) {
  const cliente = new pg.Client({ connectionString: BANCO_E2E })
  await cliente.connect()
  try {
    await cliente.query('UPDATE users SET is_admin = true WHERE lower(email) = lower($1)', [email])
  } finally {
    await cliente.end()
  }
}

test('o painel admin só aparece depois de a conta virar admin, e vale na hora', async ({ page, request }) => {
  const { email, token } = await novaConta(request)
  await entrarCom(page, token)

  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await abrirMenu(page)
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)

  await tornarAdmin(email)
  await page.reload()

  await abrirMenu(page)
  await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible()
  const propria = page.locator('.admin-usuario').filter({ hasText: email })
  await expect(propria).toContainText('(você)')
  // A própria conta não tem botões de tirar o admin nem de excluir (ninguém se tranca para fora).
  await expect(propria.getByRole('button')).toHaveCount(0)
})

test('a manchete do admin entra na barra de notícias de outro atleta e sai quando é removida', async ({ page, browser, request }) => {
  const chefe = await novaConta(request)
  await tornarAdmin(chefe.email)
  await entrarCom(page, chefe.token)
  await page.goto('/admin')

  const titulo = `LeBron muda de time ${Date.now()}`
  await page.getByLabel('Manchete').fill(titulo)
  await page.getByLabel('Fonte (opcional)').fill('ESPN')
  await page.getByLabel('Link da matéria (opcional)').fill('https://espn.example/lebron')
  await page.getByRole('button', { name: 'Publicar manchete' }).click()
  const barra = page.getByRole('region', { name: 'Notícias de basquete' })
  await expect(barra.getByRole('link', { name: titulo })).toBeVisible()

  // Outro atleta, no celular: a barra aparece sem vazar para os lados e sem cobrir o fim da página.
  const contexto = await browser.newContext({ baseURL: `http://localhost:${PORTA_SITE}`, viewport: { width: 390, height: 844 } })
  const celular = await contexto.newPage()
  const atleta = await novaConta(request)
  await entrarCom(celular, atleta.token)
  await celular.goto('/')
  const barraCelular = celular.getByRole('region', { name: 'Notícias de basquete' })
  await expect(barraCelular.getByText('Breaking news').first()).toBeVisible()
  expect(await celular.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await barraCelular.getByRole('button', { name: 'Pausar as notícias' }).click()
  await expect(barraCelular).toHaveClass(/pausada/)
  await contexto.close()

  page.on('dialog', (d) => d.accept())
  await page.locator('.admin-manchetes li').filter({ hasText: titulo }).getByRole('button', { name: 'Remover' }).click()
  await expect(barra.getByRole('link', { name: titulo })).toHaveCount(0)
})
