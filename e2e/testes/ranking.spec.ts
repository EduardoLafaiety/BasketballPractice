import { expect, test } from '@playwright/test'
import { aceitarDialogos, autorizacao, entrarCom, novaConta, registrarSessao } from './ajuda'

// Apelido que nenhum outro teste usa (eles rodam em paralelo contra o mesmo banco).
const apelido = (base: string) => `${base}_${Math.random().toString(36).slice(2, 8)}`

test('ranking com amigos: perfil, convite por link, desafio aceito e placar da semana', async ({ page, browser, request }) => {
  const ana = await novaConta(request, 'Ana E2E')
  const bia = await novaConta(request, 'Bia E2E')
  const apelidoAna = apelido('ana')
  const apelidoBia = apelido('bia')
  // Treinos da semana: Bia acerta mais lances livres.
  await registrarSessao(request, ana.token, 12, 20)
  await registrarSessao(request, bia.token, 18, 20)

  // Ana cria o perfil pela tela, fora do ranking aberto.
  await entrarCom(page, ana.token)
  await page.goto('/ranking')
  await page.getByLabel('Apelido').fill(apelidoAna)
  await page.getByLabel(/Aparecer no ranking aberto/).uncheck()
  await page.getByRole('button', { name: 'Criar perfil' }).click()
  const link = await page.locator('.convite-link').textContent()
  expect(link).toMatch(/\/convite\/[\w-]{10,}$/)

  // Bia abre o link: cria o perfil ali mesmo e aceita.
  // Segundo navegador, com a mesma base e o aviso de cookies já respondido (como o do projeto).
  const { baseURL, storageState } = test.info().project.use
  const contextoBia = await browser.newContext({ baseURL, storageState })
  const paginaBia = await contextoBia.newPage()
  await entrarCom(paginaBia, bia.token)
  await paginaBia.goto(new URL(link!).pathname)
  await expect(paginaBia.getByRole('heading', { name: apelidoAna })).toBeVisible()
  await paginaBia.getByLabel('Apelido').fill(apelidoBia)
  await paginaBia.getByRole('button', { name: 'Criar perfil' }).click()
  await paginaBia.getByRole('button', { name: 'Aceitar e virar amigo' }).click()
  await expect(paginaBia).toHaveURL(/\/ranking\?escopo=amigos/)

  // No ranking de amigos as duas aparecem, mesmo com Ana fora do ranking aberto.
  await expect(paginaBia.getByRole('list', { name: 'Pódio' })).toContainText(apelidoAna)
  await expect(paginaBia.getByRole('list', { name: 'Pódio' }).locator('.lugar-1')).toContainText(apelidoBia)
  // Quem não é amigo não vê a Ana no ranking aberto; a Bia, que é, vê.
  const cris = await novaConta(request, 'Cris E2E')
  await request.put('/api/social/profile', { headers: autorizacao(cris.token), data: { nickname: apelido('cris') } })
  const aberto = await request.get('/api/social/ranking?scope=todos', { headers: autorizacao(cris.token) })
  expect(JSON.stringify(await aberto.json())).not.toContain(apelidoAna)
  const daBia = await request.get('/api/social/ranking?scope=todos', { headers: autorizacao(bia.token) })
  expect(JSON.stringify(await daBia.json())).toContain(apelidoAna)

  // Ana desafia Bia em lances livres; Bia aceita e o placar aparece.
  await page.reload()
  await page.getByLabel('Desafio', { exact: true }).selectOption({ label: 'Quem acerta mais lances livres' })
  await page.getByRole('button', { name: /Desafiar/ }).click()
  await expect(page.getByText(`você desafiou ${apelidoBia}`)).toBeVisible()

  await paginaBia.reload()
  const desafio = paginaBia.locator('.desafio-amigo').filter({ hasText: `${apelidoAna} desafiou você` })
  await desafio.getByRole('button', { name: 'Aceitar' }).click()
  await expect(desafio.getByLabel(`Placar: você 18, ${apelidoAna} 12 cestas`)).toBeVisible()

  await page.reload()
  await expect(page.getByLabel(`Placar: você 12, ${apelidoBia} 18 cestas`)).toBeVisible()
  await contextoBia.close()
})

test('sair do ranking apaga o perfil, mas os treinos continuam', async ({ page, request }) => {
  const { token } = await novaConta(request)
  aceitarDialogos(page)
  await entrarCom(page, token)
  await registrarSessao(request, token, 5, 10)

  await page.goto('/ranking')
  await page.getByLabel('Apelido').fill(apelido('saida'))
  await page.getByRole('button', { name: 'Criar perfil' }).click()
  await page.getByRole('button', { name: 'Sair do ranking' }).click()
  await expect(page.getByRole('heading', { name: 'Entre no ranking' })).toBeVisible()

  expect(await (await request.get('/api/social/profile', { headers: autorizacao(token) })).json()).toBeNull()
  expect(((await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()) as unknown[]).length).toBe(1)
})
