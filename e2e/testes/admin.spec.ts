import { expect, test } from '@playwright/test'
import pg from 'pg'
import { BANCO_E2E } from '../ambiente'
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
  await expect(page.getByRole('heading', { name: 'Gestão de usuários.' })).toBeVisible()
  await page.getByRole('button', { name: /^Administradores/ }).click()
  await page.getByRole('searchbox', { name: 'Buscar por nome ou e-mail' }).fill(email)
  const propria = page.locator('.gestao-linha').filter({ hasText: email })
  await expect(propria).toContainText('Você')
  await propria.getByRole('button', { name: /Ver detalhes/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Conta responsável protegida')
  await expect(page.getByRole('button', { name: 'Bloquear conta', exact: true })).toHaveCount(0)
})
