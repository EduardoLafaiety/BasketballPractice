import { expect, test } from '@playwright/test'
import { autorizacao, entrarCom, idDoExercicio, novaConta } from './ajuda'

test('recupera a sessão após recarregar e envia o treino ao voltar a conexão', async ({ page, context, request }) => {
  const { token } = await novaConta(request)
  const exerciseId = await idDoExercicio(request, token, 'Lance livre')
  await entrarCom(page, token)
  const dia = new Date().getDay()
  await request.post('/api/workouts', { headers: autorizacao(token), data: {
    name: 'Recuperável', description: `bp-rotina:${dia}`, exercises: [{ exerciseId }],
  } })
  await page.goto('/sessao?hoje')
  await page.getByRole('button', { name: 'Começar', exact: true }).click()
  await page.getByRole('button', { name: /Acertou/ }).click()
  await page.getByRole('button', { name: /Errou/ }).click()
  page.on('dialog', (dialog) => dialog.accept())
  await page.reload()
  await page.getByRole('button', { name: 'Retomar treino', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible()
  await expect(page.locator('.contador-placar')).toContainText('1/2')
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Retomar treino', exact: true }).click()
  await expect(page.locator('.contador-placar')).toContainText('1/2')
  await page.getByRole('button', { name: 'Concluir treino' }).click()
  await page.getByLabel('Notas').fill('Sem conexão na quadra')
  await page.getByRole('button', { name: 'Salvar sessão' }).click()
  await expect(page.getByText(/aguardando sincronização/)).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText(/aguardando sincronização/)).toHaveCount(0)
  const sessions = await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()
  expect(sessions).toHaveLength(1)
  expect(sessions[0].entries[0]).toMatchObject({ makes: 1, attempts: 2 })
  expect(sessions[0].notes).toContain('Sem conexão na quadra')
})

test('Postgres real serializa dois envios simultâneos com a mesma chave', async ({ request }) => {
  const { token } = await novaConta(request)
  const data = { clientId: crypto.randomUUID(), performedAt: new Date().toISOString(), durationMinutes: 10 }
  const responses = await Promise.all([1, 2].map(() => request.post('/api/sessions', { headers: autorizacao(token), data })))
  for (const r of responses) expect(r.status()).toBe(201)
  const [a, b] = await Promise.all(responses.map((r) => r.json()))
  expect(a.id).toBe(b.id)
  expect(await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()).toHaveLength(1)
})

test('uma sessão rejeitada não bloqueia a seguinte e pode ser corrigida individualmente', async ({ page, request }) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)
  await page.goto('/')
  await expect(page.locator('button[aria-controls="menu-tela"]:visible')).toBeVisible()
  await page.evaluate((t) => {
    const conta = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub
    for (const notas of ['inválida '.repeat(251), 'Treino válido']) {
      const sessao = { clientId: crypto.randomUUID(), data: new Date().toISOString(), duracaoMin: 5, entradas: [], notas }
      localStorage.setItem(`bp.treino.v2.${conta}.pendente.${sessao.clientId}`, JSON.stringify({ versao: 2, sessao }))
    }
    window.dispatchEvent(new Event('online'))
  }, token)
  const painel = page.getByRole('complementary', { name: 'Treinos neste aparelho' })
  await expect(painel).toContainText('1 sessão(ões)')
  await painel.getByText('Revisar sessões pendentes').click()
  await expect(painel.getByRole('alert')).toBeVisible()
  expect(await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()).toHaveLength(1)
  await painel.getByLabel('Corrigir notas').fill('Notas corrigidas')
  await painel.getByLabel('Corrigir notas').press('Tab')
  await expect(painel).toHaveCount(0)
  const sessoes = await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()
  expect(sessoes).toHaveLength(2)
  expect(sessoes.map((s: { notes: string }) => s.notes).sort()).toEqual(['Notas corrigidas', 'Treino válido'])
})
