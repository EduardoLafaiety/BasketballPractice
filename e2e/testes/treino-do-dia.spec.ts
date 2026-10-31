import { expect, test } from '@playwright/test'
import { entrarCom, novaConta, numero, irPara } from './ajuda'

// A jornada principal: montar o treino de hoje, fazer a sessão guiada e ver a evolução em todas as telas.
test('monta a rotina de hoje, faz a sessão guiada e vê o resultado em Desempenho, Metas e Início', async ({
  page,
  request,
}) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  // Rotina: o cartão de hoje vem destacado; o exercício aparece na hora e é salvo na API em segundo plano.
  await page.goto('/rotina')
  const hoje = page.locator('.dia.hoje')
  const salvou = page.waitForResponse(
    (r) => r.url().endsWith('/api/workouts') && r.request().method() === 'POST' && r.status() === 201,
  )
  await hoje.getByRole('combobox').selectOption({ label: 'Lance livre' })
  await expect(hoje.getByRole('button', { name: 'Remover Lance livre' })).toBeVisible()
  await salvou
  await page.reload()
  await expect(page.locator('.dia.hoje').getByRole('button', { name: 'Remover Lance livre' })).toBeVisible()

  // Início mostra o treino do dia e leva à sessão guiada.
  await irPara(page, 'Início')
  await expect(page.locator('.lista-treino').getByRole('link', { name: /Lance livre/ })).toBeVisible()
  await page.getByRole('link', { name: 'Começar treino de hoje' }).click()
  await page.getByRole('button', { name: 'Começar', exact: true }).click()

  // Contador ao vivo: 3 acertos e 1 erro.
  const acertou = page.getByRole('button', { name: /Acertou/ })
  await acertou.click()
  await acertou.click()
  await acertou.click()
  await page.getByRole('button', { name: /Errou/ }).click()
  await expect(page.locator('.contador-placar')).toContainText('3/4')

  await page.getByRole('button', { name: 'Concluir treino' }).click()
  await expect(page.getByRole('heading', { name: /Treino concluído/ })).toBeVisible()
  await expect(page.getByText('aproveitamento (3/4)')).toBeVisible()
  await page.getByRole('button', { name: 'Salvar sessão' }).click()

  // Desempenho: a sessão saiu do banco e volta igual depois de recarregar.
  await expect(page).toHaveURL(/\/desempenho$/)
  await expect(numero(page, 'sessões no total')).toHaveText('1')
  await expect(numero(page, 'aproveitamento')).toHaveText('75%')
  await page.reload()
  await expect(numero(page, 'sessões no total')).toHaveText('1')
  await expect(page.locator('.historico > li')).toHaveCount(1)
  await expect(page.locator('.historico > li')).toContainText('3/4 (75%)')

  // Metas: primeiro dia da sequência e a conquista do primeiro treino.
  await irPara(page, 'Metas')
  await expect(page.locator('.sequencia strong').first()).toHaveText('1')
  await expect(page.locator('.conquista.desbloqueada')).toHaveCount(1)
  await expect(page.locator('.conquista.desbloqueada')).toContainText('Primeiro treino')

  // Início: números da semana e a sequência no topo.
  await irPara(page, 'Início')
  await expect(numero(page, 'sessões nos últimos 7 dias')).toHaveText('1')
  await expect(numero(page, 'aproveitamento nos arremessos')).toHaveText('75%')
  await expect(page.getByRole('link', { name: /1 dia seguido/ })).toBeVisible()
})
