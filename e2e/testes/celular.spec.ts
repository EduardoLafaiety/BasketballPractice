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

  // A barra de atalhos de baixo leva direto ao gerador da rotina e marca a seção atual.
  const atalhos = page.getByRole('navigation', { name: 'Atalhos' })
  await expect(atalhos).toBeVisible()
  await expect(page.locator('.topo').getByRole('link', { name: 'Gerar rotina' })).toBeHidden()
  await atalhos.getByRole('link', { name: 'Gerar rotina' }).click()
  await expect(page.getByRole('heading', { name: 'Rotina semanal', level: 1 })).toBeVisible()
  await expect(page.getByRole('form', { name: 'Gerar rotina semanal' })).toBeVisible()
  await expect(atalhos.getByRole('link', { name: 'Gerar rotina' })).toHaveClass(/active/)
  expect(await semRolagemLateral()).toBe(true)
})
