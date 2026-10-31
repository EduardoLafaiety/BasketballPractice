import { expect, test, type Page } from '@playwright/test'
import { autorizacao, entrarCom, novaConta, numero, irPara } from './ajuda'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** Quantas fotos da página terminaram de carregar de verdade (sem imagem quebrada). */
async function fotosCarregadas(page: Page) {
  return page.locator('.foto-jogador img:not(.foto-cor)').evaluateAll(async (imagens: HTMLImageElement[]) => {
    for (const img of imagens) img.loading = 'eager'
    await Promise.all(imagens.map((img) => img.decode().catch(() => undefined)))
    return imagens.filter((img) => img.complete && img.naturalWidth > 0).length
  })
}

test('a API real tem os estilos ligados ao catálogo do Postgres', async ({ request }) => {
  const { token } = await novaConta(request)
  const headers = autorizacao(token)

  expect((await request.get('/api/styles')).status()).toBe(401)
  const lista = (await (await request.get('/api/styles', { headers })).json()) as { id: string; mix: Record<string, number> }[]
  expect(lista).toHaveLength(28)

  const catalogo = (await (await request.get('/api/exercises', { headers })).json()) as { id: number; name: string }[]
  const ids = new Set(catalogo.map((e) => e.id))
  for (const { id } of lista) {
    const estilo = (await (await request.get(`/api/styles/${id}`, { headers })).json()) as {
      moves: { name: string; exercise: { exerciseId: number } | null }[]
      session: { exerciseId: number }[]
    }
    // Todo movimento aponta para um exercício que existe no banco de verdade.
    expect(estilo.moves.filter((m) => !m.exercise || !ids.has(m.exercise.exerciseId)).map((m) => m.name), id).toEqual([])
    expect(estilo.session.every((b) => ids.has(b.exerciseId)), id).toBe(true)
  }
  expect((await request.get('/api/styles/michael-jordan', { headers })).status()).toBe(404)
})

test('escolhe um jogador pelo menu, vê o perfil e abre o exercício de um movimento', async ({ page, request }) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  await page.goto('/')
  await irPara(page, 'Jogue como')
  await expect(page.getByRole('heading', { name: 'Jogue como', level: 1 })).toBeVisible()
  await expect(page.locator('.cartao-jogador')).toHaveCount(28)
  expect(await fotosCarregadas(page)).toBe(28)

  // Filtro por posição.
  await page.getByRole('button', { name: 'Pivôs' }).click()
  await expect(page.locator('.cartao-jogador h3')).toHaveText(['Nikola Jokić', 'Victor Wembanyama', 'Joel Embiid', 'Anthony Davis', 'Karl-Anthony Towns', 'Bam Adebayo'])
  await page.getByRole('button', { name: 'Todos' }).click()
  await expect(page.locator('.cartao-jogador')).toHaveCount(28)

  // Perfil do Luka: ficha, divisão do treino, movimentos e crédito da foto.
  await page.getByRole('link', { name: /Luka Dončić/ }).click()
  await expect(page).toHaveURL(/\/jogue-como\/luka-doncic$/)
  await expect(page.getByRole('heading', { name: 'Luka Dončić', level: 1 })).toBeVisible()
  await expect(page.locator('.estilo-ficha')).toContainText('1,98 m')
  await expect(page.locator('.estilo-divisao-linha')).toHaveCount(4)
  await expect(page.locator('.movimento')).toHaveCount(5)
  await expect(page.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', /commons\.wikimedia\.org/)
  expect(await fotosCarregadas(page)).toBe(1)

  // O exercício de um movimento abre na biblioteca de treinos.
  await page.locator('.movimento').filter({ hasText: 'Leitura do corta-luz' }).getByRole('link').click()
  await expect(page).toHaveURL(/\/treinos\/\d+$/)
  await expect(page.getByRole('heading', { name: 'Corta-luz com cadeira' })).toBeVisible()

  // Endereço de jogador que não existe.
  await page.goto('/jogue-como/michael-jordan')
  await expect(page.getByText('Jogador não encontrado.')).toBeVisible()
  await page.getByRole('link', { name: 'Ver todos os jogadores' }).click()
  await expect(page.locator('.cartao-jogador')).toHaveCount(28)
})

test('faz o treino do estilo na sessão guiada e a sessão é salva no banco', async ({ page, request }) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  await page.goto('/jogue-como/luka-doncic')
  await page.getByRole('button', { name: 'Começar este treino' }).click()
  await expect(page).toHaveURL(/\/sessao$/)
  await expect(page.getByRole('heading', { name: 'Jogue como Luka Dončić' })).toBeVisible()
  await expect(page.getByText(/7 exercícios · 60 min/)).toBeVisible()
  await page.getByRole('button', { name: 'Começar', exact: true }).click()

  // Aquecimento e hesitação ficam de fora; o corta-luz registra repetições.
  const nome = page.locator('.guiada-nome')
  await expect(nome).toHaveText('Drible estacionário')
  await page.getByRole('button', { name: 'Pular', exact: true }).click()
  await expect(nome).toHaveText('Hesitação em linha reta')
  await page.getByRole('button', { name: 'Pular', exact: true }).click()
  await expect(nome).toHaveText('Corta-luz com cadeira')
  await page.getByRole('button', { name: '+5' }).click()
  await page.getByRole('button', { name: '+1', exact: true }).click()
  await page.getByRole('button', { name: /Próximo exercício/ }).click()

  // Step-back de três: 2 acertos em 3 tentativas no contador ao vivo.
  await expect(nome).toHaveText('Step-back de três')
  const acertou = page.getByRole('button', { name: /Acertou/ })
  await acertou.click()
  await acertou.click()
  await page.getByRole('button', { name: /Errou/ }).click()
  await expect(page.locator('.contador-placar')).toContainText('2/3')
  await page.getByRole('button', { name: /Próximo exercício/ }).click()

  for (const resto of ['Fadeaway do cotovelo', 'Floater em uma perna', 'Lance livre']) {
    await expect(nome).toHaveText(resto)
    await page.getByRole('button', { name: 'Pular', exact: true }).click()
  }

  await expect(page.getByRole('heading', { name: /Treino concluído/ })).toBeVisible()
  await page.getByRole('button', { name: 'Salvar sessão' }).click()

  // Desempenho lê do banco: a sessão está lá com os dois exercícios registrados.
  await expect(page).toHaveURL(/\/desempenho$/)
  await page.reload()
  await expect(numero(page, 'sessões no total')).toHaveText('1')
  await expect(numero(page, 'aproveitamento')).toHaveText('67%')
  const sessoes = (await (await request.get('/api/sessions', { headers: autorizacao(token) })).json()) as {
    entries: { exerciseName?: string; name?: string; makes: number | null; attempts: number | null; reps: number | null }[]
  }[]
  expect(sessoes).toHaveLength(1)
  const entradas = sessoes[0].entries
  expect(entradas).toHaveLength(2)
  expect(entradas.find((e) => e.attempts === 3)).toMatchObject({ makes: 2, attempts: 3 })
  expect(entradas.find((e) => e.reps !== null)).toMatchObject({ reps: 6 })
})

test('coloca o treino do estilo na rotina de hoje e ele continua lá depois de recarregar', async ({ page, request }) => {
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  // O dia é o do navegador dos testes (America/Sao_Paulo).
  const hoje = await page.evaluate(() => new Date().getDay())
  await page.goto('/jogue-como/jalen-brunson')
  const salvou = page.waitForResponse(
    (r) => r.url().endsWith('/api/workouts') && r.request().method() === 'POST' && r.status() === 201,
  )
  await page.getByRole('combobox', { name: 'Usar na rotina' }).selectOption({ label: DIAS[hoje] })
  await expect(page.getByRole('status')).toContainText(`rotina de ${DIAS[hoje].toLowerCase()}`)
  await salvou

  await page.goto('/rotina')
  await page.reload()
  const cartao = page.locator('.dia.hoje')
  for (const exercicio of ['Drible estacionário', 'Corta-luz com cadeira', 'Hesitação em linha reta', 'Fadeaway do cotovelo', 'Floater em uma perna', 'Lance livre']) {
    await expect(cartao.getByRole('button', { name: `Remover ${exercicio}` })).toBeVisible()
  }
})

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('a lista e o perfil cabem na tela sem rolagem lateral', async ({ page, request }) => {
    const { token } = await novaConta(request)
    await entrarCom(page, token)
    const semRolagemLateral = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

    await page.goto('/jogue-como')
    await expect(page.locator('.cartao-jogador')).toHaveCount(28)
    expect(await semRolagemLateral()).toBe(true)

    await page.getByRole('link', { name: /Victor Wembanyama/ }).click()
    await expect(page.getByRole('heading', { name: 'Victor Wembanyama', level: 1 })).toBeVisible()
    await expect(page.locator('.movimento').first()).toBeVisible()
    expect(await semRolagemLateral()).toBe(true)
  })
})
