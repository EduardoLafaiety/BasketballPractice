import { existsSync, readFileSync } from 'node:fs'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { CAIXA_E2E } from '../ambiente'

export const SENHA = 'Senha-dos-testes-e2e'

/** E-mail que nenhum outro teste usa (eles rodam em paralelo contra o mesmo banco). */
export const emailUnico = (rotulo: string) =>
  `${rotulo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`

interface EmailEnviado {
  to: string
  subject: string
  text: string
}

const emailsPara = (endereco: string): EmailEnviado[] =>
  existsSync(CAIXA_E2E)
    ? readFileSync(CAIXA_E2E, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((linha) => JSON.parse(linha) as EmailEnviado)
        .filter((e) => e.to === endereco)
    : []

/** Espera chegar o e-mail com esse assunto (o envio é em segundo plano) e devolve o mais recente. */
export async function esperarEmail(endereco: string, assunto: RegExp, quantos = 1) {
  const comAssunto = () => emailsPara(endereco).filter((e) => assunto.test(e.subject))
  await expect.poll(() => comAssunto().length, { message: `e-mail "${assunto}" para ${endereco}` }).toBeGreaterThanOrEqual(quantos)
  return comAssunto().at(-1)!
}

/** O link de uso único que está no texto do e-mail. */
export function linkDoEmail(email: EmailEnviado) {
  const link = /https?:\S+#token=[\w-]+/.exec(email.text)?.[0]
  if (!link) throw new Error(`Sem link no e-mail: ${email.subject}`)
  return link
}

/** Cria e ativa a conta direto na API (mais rápido que o formulário, que tem um teste só dele). */
export async function novaConta(request: APIRequestContext, nome = 'Atleta E2E') {
  const email = emailUnico('atleta')
  const cadastro = await request.post('/api/auth/register', { data: { name: nome, email, password: SENHA } })
  expect(cadastro.status()).toBe(202)
  const link = linkDoEmail(await esperarEmail(email, /Ative sua conta/))
  const ativacao = await request.post('/api/auth/confirm', { data: { token: link.split('#token=')[1], password: SENHA } })
  expect(ativacao.status()).toBe(201)
  const { token } = (await ativacao.json()) as { token: string }
  return { email, token }
}

/** Abre o site já logado com o token (como se a pessoa tivesse entrado antes). */
export async function entrarCom(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('bp.token', t), token)
}

export const autorizacao = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function idDoExercicio(request: APIRequestContext, token: string, nome: string) {
  const lista = (await (await request.get('/api/exercises', { headers: autorizacao(token) })).json()) as {
    id: number
    name: string
  }[]
  const achado = lista.find((e) => e.name === nome)
  if (!achado) throw new Error(`Exercício "${nome}" não está no catálogo`)
  return achado.id
}

/** Registra uma sessão de agora pela API (para testes que precisam de histórico sem refazer a sessão na tela). */
export async function registrarSessao(request: APIRequestContext, token: string, acertos: number, tentativas: number) {
  const exerciseId = await idDoExercicio(request, token, 'Lance livre')
  const resposta = await request.post('/api/sessions', {
    headers: autorizacao(token),
    data: {
      performedAt: new Date().toISOString(),
      durationMinutes: 30,
      entries: [{ exerciseId, makes: acertos, attempts: tentativas }],
    },
  })
  expect(resposta.status()).toBe(201)
}

/** Valor em destaque do cartão de número com esse rótulo (Início e Desempenho). */
export const numero = (page: Page, rotulo: string) =>
  page.locator('.stat').filter({ hasText: rotulo }).locator('strong')

/** Aceita todas as confirmações e guarda as mensagens dos alertas, na ordem. */
export function aceitarDialogos(page: Page) {
  const mensagens: string[] = []
  page.on('dialog', async (dialogo) => {
    if (dialogo.type() === 'alert') mensagens.push(dialogo.message())
    await dialogo.accept()
  })
  return mensagens
}

/** Abre o menu em tela cheia (a navegação principal fica nele). */
export async function abrirMenu(page: Page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  return page.getByRole('navigation', { name: 'Principal' })
}

/** Vai para uma seção pelo menu. */
export async function irPara(page: Page, secao: string) {
  const menu = await abrirMenu(page)
  await menu.getByRole('link', { name: secao, exact: false }).click()
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'false')
}
