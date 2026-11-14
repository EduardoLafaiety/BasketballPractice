import { expect, test } from '@playwright/test'
import { aceitarDialogos, entrarCom, novaConta } from './ajuda'

test('exercício próprio: registra uma sessão e só deixa excluir quando não está em uso', async ({
  page,
  request,
}) => {
  const alertas = aceitarDialogos(page)
  const { token } = await novaConta(request)
  await entrarCom(page, token)

  // A lista de Treinos não tem mais o botão de novo exercício: o exercício é criado pela API e aberto pela página dele.
  const criar = async (nome: string, categoria: string) => {
    const resposta = await request.post('/api/exercises', { headers: { Authorization: `Bearer ${token}` }, data: { name: nome, category: categoria, metric: 'acertos' } })
    expect(resposta.status()).toBe(201)
    return (await resposta.json()).id as number
  }
  await page.goto(`/treinos/${await criar('Floater E2E', 'finalizacao')}`)
  await expect(page.getByRole('heading', { name: 'Floater E2E' })).toBeVisible()
  const paginaDoExercicio = page.url()

  // Registro manual: com mais acertos que tentativas, o aviso aparece e não dá para salvar.
  const salvar = page.getByRole('button', { name: 'Salvar sessão' })
  await page.getByLabel('Duração (min)').fill('20')
  await page.getByLabel('Acertos', { exact: true }).fill('9')
  await page.getByLabel('Tentativas', { exact: true }).fill('5')
  await expect(page.getByText('Acertos não podem passar das tentativas.')).toBeVisible()
  await expect(salvar).toBeDisabled()

  await page.getByLabel('Acertos', { exact: true }).fill('4')
  await expect(salvar).toBeEnabled()
  await salvar.click()
  await expect(page).toHaveURL(/\/desempenho$/)
  await expect(page.locator('.historico > li').first()).toContainText('Floater E2E')

  // Em uso numa sessão: o Postgres barra a exclusão e o app explica o motivo (antes era um erro 500).
  await page.goto(paginaDoExercicio)
  await page.getByRole('button', { name: 'Excluir' }).click()
  await expect.poll(() => alertas).toEqual(['Exercício está em uso por treinos ou registros'])
  await expect(page).toHaveURL(paginaDoExercicio)

  // Sem uso: exclui e some da biblioteca.
  await page.goto(`/treinos/${await criar('Exercício sem uso E2E', 'arremesso')}`)
  await expect(page.getByRole('heading', { name: 'Exercício sem uso E2E' })).toBeVisible()
  await page.getByRole('button', { name: 'Excluir' }).click()
  await expect(page).toHaveURL(/\/treinos$/)
  await expect(page.getByRole('heading', { name: 'Floater E2E' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Exercício sem uso E2E' })).toHaveCount(0)
})
