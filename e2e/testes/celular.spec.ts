import { expect, test } from '@playwright/test'
import { entrarCom, novaConta } from './ajuda'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('no celular, o menu vira barra no topo, navega entre as telas e nada vaza para os lados', async ({
  page,
  request,
}) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  const semRolagemLateral = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Bora pra quadra/ })).toBeVisible()
  // A barra lateral fica em cima do conteúdo, não ao lado.
  const menu = await page.locator('.lateral').boundingBox()
  const conteudo = await page.locator('.conteudo').boundingBox()
  expect(menu!.y + menu!.height).toBeLessThanOrEqual(conteudo!.y + 1)
  expect(await semRolagemLateral()).toBe(true)

  for (const [link, titulo] of [
    ['Desempenho', 'Desempenho'],
    ['Ferramentas', 'Ferramentas'],
    ['Metas', 'Metas e conquistas'],
  ]) {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: link }).click()
    await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
    expect(await semRolagemLateral()).toBe(true)
  }
})
