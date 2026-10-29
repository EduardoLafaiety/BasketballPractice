import { describe, expect, it, vi } from 'vitest'
import { ApiError, aoTokenExpirar, api, dataLocal, definirToken, tokenAtual } from './api'
import { apiFalsa, Resposta } from './test/api-falsa'

describe('request', () => {
  it('envia o token salvo e o guarda no localStorage', async () => {
    const { ultima } = apiFalsa({ 'GET /auth/me': { id: 1, name: 'A', email: 'a@a.com', isAdmin: false } })
    definirToken('abc')
    expect(localStorage.getItem('bp.token')).toBe('abc')
    expect(tokenAtual()).toBe('abc')

    await api.eu()
    expect(ultima('GET', '/auth/me')?.headers.Authorization).toBe('Bearer abc')

    definirToken(null)
    expect(localStorage.getItem('bp.token')).toBeNull()
  })

  it('transforma a resposta de erro em ApiError com os detalhes', async () => {
    apiFalsa({
      'POST /auth/register': new Resposta(400, { error: 'Dados inválidos', details: { email: ['Invalid email'] } }),
    })
    const erro = await api.cadastrar('Ana', 'x', '12345678').catch((e) => e)
    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({ status: 400, message: 'Dados inválidos', details: { email: ['Invalid email'] } })
  })

  it('avisa que o token expirou só quando havia login', async () => {
    apiFalsa({ 'GET /auth/me': new Resposta(401, { error: 'Não autenticado' }) })
    const expirou = vi.fn()
    aoTokenExpirar(expirou)

    await expect(api.eu()).rejects.toThrow('Não autenticado')
    expect(expirou).not.toHaveBeenCalled()

    definirToken('velho')
    await expect(api.eu()).rejects.toMatchObject({ status: 401 })
    expect(expirou).toHaveBeenCalledOnce()
    aoTokenExpirar(null)
  })

  it('explica falha de rede e erro do servidor sem JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(api.eu()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('conexão') })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 })))
    await expect(api.eu()).rejects.toMatchObject({ status: 502, message: 'O servidor não respondeu. Tente de novo.' })
  })
})

describe('conversão dos dados do backend', () => {
  it('converte sessões, somando os exercícios e lendo números que chegam como texto', async () => {
    apiFalsa({
      'GET /sessions': [
        {
          id: 7,
          performedAt: '2026-10-20T21:30:00.000Z',
          durationMinutes: '60',
          rating: 4,
          fatigue: null,
          notes: null,
          entries: [
            { exerciseId: 1, exerciseName: 'Lance livre', makes: '41', attempts: 50, reps: null, seconds: null, bestStreak: 9 },
            { exerciseId: 3, exerciseName: 'Arremesso de três', makes: 12, attempts: '30', reps: null, seconds: null, bestStreak: 4 },
          ],
          shots: [{ zone: 'tres_topo', makes: 5, attempts: 12 }],
        },
      ],
    })

    const [s] = await api.sessoes()
    expect(s).toMatchObject({
      id: '7',
      drillId: '1',
      drillNome: 'Lance livre + 1',
      duracaoMin: 60,
      acertos: 53,
      tentativas: 80,
      esforco: 4,
      cansaco: undefined,
      notas: undefined,
      sequencia: 9,
      // Com mais de um exercício, repetições e tempo ficam só nas entradas.
      repeticoes: undefined,
      zonas: [{ zona: 'tres_topo', acertos: 5, tentativas: 12 }],
    })
    expect(s.entradas[1]).toEqual({
      drillId: '3',
      drillNome: 'Arremesso de três',
      acertos: 12,
      tentativas: 30,
      repeticoes: undefined,
      segundos: undefined,
      sequencia: 4,
    })
  })

  it('usa o nome do treino e deixa acertos vazios em exercícios sem arremesso', async () => {
    apiFalsa({
      'GET /sessions': [
        {
          id: 8,
          workoutName: 'Treino de drible',
          performedAt: '2026-10-21T21:30:00.000Z',
          durationMinutes: null,
          rating: null,
          notes: 'ok',
          entries: [{ exerciseId: 7, exerciseName: 'Drible estacionário', makes: null, attempts: null, reps: null, seconds: 300 }],
        },
      ],
    })
    const [s] = await api.sessoes()
    expect(s).toMatchObject({ drillNome: 'Treino de drible', duracaoMin: 0, acertos: undefined, segundos: 300, zonas: [] })
  })

  it('monta o corpo da nova sessão e descarta zonas sem tentativas', async () => {
    const { ultima } = apiFalsa({
      'POST /sessions': (corpo) => ({ id: 1, performedAt: '2026-10-29T12:00:00.000Z', notes: null, ...(corpo as object) }),
    })
    await api.registrarSessao({
      data: '2026-10-29T12:00:00.000Z',
      duracaoMin: 30,
      esforco: 3,
      entradas: [{ drillId: '1', acertos: 8, tentativas: 10, sequencia: 5 }],
      zonas: [
        { zona: 'garrafao', acertos: 8, tentativas: 10 },
        { zona: 'tres_topo', acertos: 0, tentativas: 0 },
      ],
    })

    expect(ultima('POST', '/sessions')?.corpo).toEqual({
      workoutId: null,
      performedAt: '2026-10-29T12:00:00.000Z',
      durationMinutes: 30,
      rating: 3,
      fatigue: null,
      notes: null,
      entries: [{ exerciseId: 1, makes: 8, attempts: 10, reps: null, seconds: null, bestStreak: 5 }],
      shots: [{ zone: 'garrafao', makes: 8, attempts: 10 }],
    })
  })

  it('pede o resumo com fuso e período, com o fim exclusivo', async () => {
    const { ultima } = apiFalsa({
      'GET /stats/summary': {
        totals: { sessions: '3', minutes: '135', averageRating: '4.5', averageFatigue: null },
        shooting: { makes: '30', attempts: '50', percentage: '60' },
        byWeek: [{ weekStart: '2026-10-26', sessions: '3', minutes: '135', makes: '30', attempts: '50' }],
      },
    })
    const desde = new Date(2026, 9, 26)
    const ate = new Date(2026, 9, 30)
    const r = await api.resumo(desde, ate)

    expect(r).toEqual({
      sessoes: 3,
      minutos: 135,
      acertos: 30,
      tentativas: 50,
      esforcoMedio: 4.5,
      cansacoMedio: undefined,
      semanas: [{ inicio: '2026-10-26', sessoes: 3, minutos: 135, acertos: 30, tentativas: 50 }],
    })
    const params = ultima('GET', '/stats/summary')!.url.searchParams
    expect(params.get('tzOffset')).toBe(String(new Date().getTimezoneOffset()))
    expect(params.get('from')).toBe(desde.toISOString())
    expect(params.get('to')).toBe(new Date(ate.getTime() - 1).toISOString())
  })

  it('remonta a rotina a partir dos treinos marcados com o dia', async () => {
    apiFalsa({
      'GET /workouts': [
        { id: 10, name: 'Rotina', description: 'bp-rotina:1' },
        { id: 11, name: 'Meu treino', description: 'Treino comum' },
        { id: 12, name: 'Rotina', description: 'bp-rotina:4' },
      ],
      'GET /workouts/10': { id: 10, name: 'Rotina', description: 'bp-rotina:1', exercises: [{ exerciseId: 1 }, { exerciseId: 7 }] },
      'GET /workouts/12': { id: 12, name: 'Rotina', description: 'bp-rotina:4', exercises: [{ exerciseId: 3 }] },
    })
    const { rotina, ids } = await api.rotina()
    expect(rotina[1]).toEqual(['1', '7'])
    expect(rotina[4]).toEqual(['3'])
    expect(rotina[0]).toEqual([])
    expect(ids).toEqual({ 1: 10, 4: 12 })
  })
})

describe('dataLocal', () => {
  it('usa o dia local, não o de UTC', () => {
    // 23h em Brasília já é o dia seguinte em UTC.
    expect(dataLocal(new Date(2026, 9, 29, 23, 30))).toBe('2026-10-29')
    expect(dataLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
