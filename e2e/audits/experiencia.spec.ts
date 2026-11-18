import { expect, test } from '@playwright/test'
import { autorizacao, entrarCom, idDoExercicio, novaConta } from '../testes/ajuda'

test('registra aparência retrô e recursos das cinco telas principais', async ({ page, request }, info) => {
  test.setTimeout(120_000)
  const { token } = await novaConta(request, 'Atleta de referência')
  await entrarCom(page, token)
  // A aplicação tem sua própria preferência; o modo estático permite comparar conteúdo sem revelação por scroll.
  await page.addInitScript(() => localStorage.setItem('bp.animacoes', 'desligadas'))
  const exerciseId = await idDoExercicio(request, token, 'Lance livre')
  await request.put('/api/routine', { headers: autorizacao(token), data: {
    days: Array.from({ length: 7 }, (_, day) => ({ day, exercises: [{ exerciseId, minutes: 4 }] })),
  } })
  const medicoes: object[] = []
  for (const [largura, altura] of [[390, 844], [1440, 1000]]) {
    await page.setViewportSize({ width: largura, height: altura })
    for (const theme of ['claro', 'escuro']) {
      await request.put('/api/settings', { headers: autorizacao(token), data: { theme } })
      for (const [nome, rota, titulo] of [['inicio', '/', 'Treino de hoje'], ['treinos', '/treinos', 'Treinos'], ['rotina', '/rotina', 'Rotina semanal'], ['sessao', '/sessao?hoje', 'Treino de'], ['evolucao', '/evolucao', 'Evolução']]) {
        await page.goto(rota)
        await expect(page.getByRole('heading', { name: new RegExp(titulo) }).first()).toBeVisible()
        if (nome === 'inicio') await expect(page.locator('.lista-treino').first()).toBeVisible()
        if (nome === 'treinos') await expect(page.getByRole('link', { name: /Lance livre/ }).first()).toBeVisible()
        if (nome === 'rotina') await expect(page.getByRole('combobox', { name: /Adicionar treino/ }).first()).toBeVisible()
        if (nome === 'sessao') await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeVisible()
        if (nome === 'evolucao') await expect(page.getByRole('table')).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
        await page.screenshot({ path: info.outputPath(`${nome}-${largura}-${theme}.png`), fullPage: false, animations: 'disabled' })
        const recursos = await page.evaluate(() => {
          const entradas = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
          return { arquivos: entradas.length, bytesTransferidos: entradas.reduce((n, r) => n + r.transferSize, 0), js: entradas.filter((r) => /\.js($|\?)/.test(r.name)).length }
        })
        medicoes.push({ nome, largura, theme, ...recursos })
      }
    }
  }
  await info.attach('recursos-por-tela.json', { body: JSON.stringify(medicoes, null, 2), contentType: 'application/json' })
})
