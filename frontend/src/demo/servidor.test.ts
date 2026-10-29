// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarServidor, type ServidorDemo } from './servidor'

// Fuso dos testes: America/Sao_Paulo (vite.config.ts), como o app manda em ?tzOffset.
const FUSO = `tzOffset=${new Date().getTimezoneOffset()}`

function meiaNoiteDeHoje() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function abrir() {
  const servidor = await criarServidor()
  const get = async <T>(caminho: string) => (await servidor.executar('GET', caminho)).body as T
  return { servidor, get }
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

  it('popula ~8 semanas de histórico até ontem, deixando o treino de hoje para o visitante', async () => {
    const sessoes = await get<{ performedAt: string }[]>('/sessions?limit=200')
    expect(sessoes.length).toBeGreaterThanOrEqual(30)
    const hoje = meiaNoiteDeHoje().getTime()
    expect(sessoes.every((s) => Date.parse(s.performedAt) < hoje)).toBe(true)

    // Os últimos 6 dias foram todos de treino: a sequência atual vale até ontem.
    const { streak, achievements } = await get<{
      streak: { current: number }
      achievements: { id: string; unlocked: boolean }[]
    }>(`/stats/progress?${FUSO}`)
    expect(streak.current).toBeGreaterThanOrEqual(6)
    expect(achievements.find((a) => a.id === 'primeira-sessao')?.unlocked).toBe(true)
    expect(achievements.find((a) => a.id === '100-sessoes')?.unlocked).toBe(false)
  })

  it('traz rotina de seis dias, metas, testes físicos e arremessos por zona', async () => {
    const treinos = await get<{ description: string | null }[]>('/workouts')
    expect(treinos.map((t) => t.description).sort()).toEqual(
      ['bp-rotina:1', 'bp-rotina:2', 'bp-rotina:3', 'bp-rotina:4', 'bp-rotina:5', 'bp-rotina:6'],
    )
    const metas = await get<{ title: string; current: number }[]>(`/goals?${FUSO}`)
    expect(metas.map((m) => m.title)).toContain('Lance livre a 80%')
    expect(metas.find((m) => m.title === 'Aproveitamento de 60%')!.current).toBeGreaterThan(0)
    expect(await get<unknown[]>('/tests')).toHaveLength(9)
    const zonas = await get<{ attempts: number }[]>(`/stats/zones?${FUSO}`)
    expect(zonas).toHaveLength(12)
    expect(zonas.filter((z) => z.attempts > 0).length).toBeGreaterThan(6)
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

  it('uma sessão registrada hoje entra no resumo e na sequência; recomeçar volta aos dados de exemplo', async () => {
    const desde = `from=${meiaNoiteDeHoje().toISOString()}&${FUSO}`
    const antes = await get<{ streak: { current: number } }>(`/stats/progress?${FUSO}`)
    const totalAntes = (await get<unknown[]>('/sessions?limit=200')).length

    const criada = await servidor.executar('POST', '/sessions', {
      performedAt: new Date().toISOString(),
      durationMinutes: 30,
      entries: [{ exerciseId: 1, makes: 8, attempts: 10 }],
      shots: [{ zone: 'lance_livre', makes: 8, attempts: 10 }],
    })
    expect(criada.status).toBe(201)
    const hoje = await get<{ totals: { sessions: number; minutes: number }; shooting: { makes: number; attempts: number } }>(
      `/stats/summary?${desde}`,
    )
    expect(hoje.totals).toMatchObject({ sessions: 1, minutes: 30 })
    expect(hoje.shooting).toMatchObject({ makes: 8, attempts: 10 })
    expect((await get<{ streak: { current: number } }>(`/stats/progress?${FUSO}`)).streak.current).toBe(antes.streak.current + 1)

    await servidor.recomecar()
    expect(await get<unknown[]>('/sessions?limit=200')).toHaveLength(totalAntes)
    expect((await get<{ totals: { sessions: number } }>(`/stats/summary?${desde}`)).totals.sessions).toBe(0)
  }, 60_000)
})
