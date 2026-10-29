import { expect, test } from '@playwright/test'
import pg from 'pg'
import { BANCO_E2E } from '../ambiente'
import { entrarCom, novaConta } from './ajuda'

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
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)

  await tornarAdmin(email)
  await page.reload()

  await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible()
  const propria = page.locator('.admin-usuario').filter({ hasText: email })
  await expect(propria).toContainText('(você)')
  // A própria conta não tem botões de tirar o admin nem de excluir (ninguém se tranca para fora).
  await expect(propria.getByRole('button')).toHaveCount(0)
})
