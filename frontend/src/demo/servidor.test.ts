// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarServidor, type ServidorDemo } from './servidor'

// Fuso dos testes: America/Sao_Paulo (vite.config.ts), como o app manda em ?tzOffset.
const FUSO = `tzOffset=${new Date().getTimezoneOffset()}`

type Resumo = { totals: { sessions: number; minutes: number }; shooting: { makes: number; attempts: number } }
type Progresso = { streak: { current: number; best: number }; achievements: { id: string; unlocked: boolean }[] }

async function abrir() {
  const servidor = await criarServidor()
  const get = async <T>(caminho: string) => (await servidor.executar('GET', caminho)).body as T
  return { servidor, get }
}

/** Confere que o visitante está como uma conta recém-criada. */
async function esperarZerado(get: <T>(caminho: string) => Promise<T>) {
  expect(await get('/sessions?limit=200')).toEqual([])
  expect(await get('/workouts')).toEqual([])
  expect(await get(`/goals?${FUSO}`)).toEqual([])
  expect(await get('/tests')).toEqual([])
  const resumo = await get<Resumo>(`/stats/summary?${FUSO}`)
  expect(resumo.totals).toMatchObject({ sessions: 0, minutes: 0 })
  expect(resumo.shooting).toMatchObject({ makes: 0, attempts: 0 })
  const progresso = await get<Progresso>(`/stats/progress?${FUSO}`)
  expect(progresso.streak).toEqual({ current: 0, best: 0 })
  expect(progresso.achievements.filter((a) => a.unlocked)).toEqual([])
  expect((await get<{ attempts: number }[]>(`/stats/zones?${FUSO}`)).every((z) => z.attempts === 0)).toBe(true)
  // Só o catálogo padrão, nenhum exercício próprio.
  const exercicios = await get<{ custom: boolean }[]>('/exercises')
  expect(exercicios).toHaveLength(23)
  expect(exercicios.some((e) => e.custom)).toBe(false)
}

describe('Servidor da demonstração', () => {
  let servidor: ServidorDemo
  let get: <T>(caminho: string) => Promise<T>

  beforeAll(async () => {
    ;({ servidor, get } = await abrir())
  }, 60_000)
  afterAll(() => servidor.fechar())

  it('abre já com o visitante, sem login e sem acesso de admin', async () => {
    expect(await get('/auth/me')).toEqual({ id: 1, name: 'Visitante', email: 'visitante@demo.local', isAdmin: false })
    expect(await servidor.executar('GET', '/admin/users')).toEqual({
      status: 403,
      body: { error: 'Acesso restrito a administradores' },
    })
  })

  it('começa zerado, como no primeiro acesso: sem sessões, rotina, metas, testes nem estatísticas', async () => {
    await esperarZerado(get)
  })

  it('responde com as mesmas validações e erros da API real', async () => {
    const invalida = await servidor.executar('POST', '/sessions', {
      performedAt: new Date().toISOString(),
      entries: [{ exerciseId: 1, makes: 9, attempts: 5 }],
    })
    expect(invalida.status).toBe(400)
    expect(invalida.body).toMatchObject({ error: 'Dados inválidos', details: { entries: expect.any(Array) } })

    expect(await servidor.executar('DELETE', '/exercises/1')).toEqual({
      status: 403,
      body: { error: 'Exercícios do catálogo padrão não podem ser alterados' },
    })
    // Exercício do visitante já usado numa sessão: a FK barra a exclusão (409, não 500).
    const proprio = await servidor.executar('POST', '/exercises', { name: 'Floater', category: 'finalizacao', metric: 'acertos' })
    const id = (proprio.body as { id: number }).id
    await servidor.executar('POST', '/sessions', {
      performedAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
      entries: [{ exerciseId: id, makes: 3, attempts: 5 }],
    })
    expect(await servidor.executar('DELETE', `/exercises/${id}`)).toEqual({
      status: 409,
      body: { error: 'Exercício está em uso por treinos ou registros' },
    })
    expect(await servidor.executar('GET', '/nao-existe')).toEqual({ status: 404, body: { error: 'Rota não encontrada' } })
    expect((await servidor.executar('GET', '/sessions/999999')).status).toBe(404)
  })
})

describe('Registros do visitante', () => {
  let servidor: ServidorDemo
  let get: <T>(caminho: string) => Promise<T>

  beforeAll(async () => {
    ;({ servidor, get } = await abrir())
  }, 60_000)
  afterAll(() => servidor.fechar())

  it('o primeiro treino entra nas estatísticas; recomeçar apaga tudo e volta ao app zerado', async () => {
    await servidor.executar('POST', '/workouts', {
      name: 'Rotina de quinta',
      description: 'bp-rotina:4',
      exercises: [{ exerciseId: 1 }],
    })
    await servidor.executar('POST', '/goals', { title: '4 treinos por semana', kind: 'sessoes_semana', target: 4 })
    const criada = await servidor.executar('POST', '/sessions', {
      performedAt: new Date().toISOString(),
      durationMinutes: 30,
      entries: [{ exerciseId: 1, makes: 8, attempts: 10 }],
      shots: [{ zone: 'lance_livre', makes: 8, attempts: 10 }],
    })
    expect(criada.status).toBe(201)

    const resumo = await get<Resumo>(`/stats/summary?${FUSO}`)
    expect(resumo.totals).toMatchObject({ sessions: 1, minutes: 30 })
    expect(resumo.shooting).toMatchObject({ makes: 8, attempts: 10 })
    const progresso = await get<Progresso>(`/stats/progress?${FUSO}`)
    expect(progresso.streak).toEqual({ current: 1, best: 1 })
    expect(progresso.achievements.find((a) => a.id === 'primeira-sessao')?.unlocked).toBe(true)
    expect((await get<{ current: number }[]>(`/goals?${FUSO}`))[0].current).toBe(1)

    await servidor.recomecar()
    await esperarZerado(get)
  }, 60_000)
})
