import { expect, test } from '@playwright/test'
import { entrarCom, novaConta, irPara } from './ajuda'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('no celular, o menu abre em tela cheia, navega entre as telas e nada vaza para os lados', async ({
  page,
  request,
}) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  const semRolagemLateral = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Bora pra quadra/ })).toBeVisible()
  // O menu fica fechado e não ocupa a tela.
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden()
  expect(await semRolagemLateral()).toBe(true)

  for (const [link, titulo] of [
    ['Desempenho', 'Desempenho'],
    ['Ferramentas', 'Ferramentas'],
    ['Metas', 'Metas e conquistas'],
  ]) {
    await irPara(page, link)
    await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
    expect(await semRolagemLateral()).toBe(true)
  }
})
