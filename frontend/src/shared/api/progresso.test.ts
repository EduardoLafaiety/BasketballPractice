import { expect, it } from 'vitest'
import { api } from './backend'
import { apiFalsa, Resposta } from '../../test/api-falsa'

const compacta = (id: number) => ({ id, performedAt: '2026-11-01T12:00:00Z', durationMinutes: 5, makes: 0, bestStreak: 0, entries: [], shots: [] })

it('pontuação inclui sessões além da primeira página de duzentas', async () => {
  const registros = Array.from({ length: 201 }, (_, i) => compacta(i + 1))
  const { chamadas } = apiFalsa({ 'GET /sessions/progress': (_, url) => registros.slice(Number(url.searchParams.get('offset')), Number(url.searchParams.get('offset')) + 200) })
  const resultado = await api.sessoesProgresso()
  expect(resultado).toHaveLength(201)
  expect(new Set(resultado.map((s) => s.id)).size).toBe(201)
  expect(chamadas.map((c) => c.url.searchParams.get('offset'))).toEqual(['0', '200'])
})

it('fallback legado recomeça sem misturar uma projeção parcial nem duplicar sessões', async () => {
  apiFalsa({
    'GET /sessions/progress': (_, url) => url.searchParams.get('offset') === '0' ? Array.from({ length: 200 }, (_, i) => compacta(i + 1)) : new Resposta(404),
    'GET /sessions': [{ id: 99, performedAt: '2026-11-01T12:00:00Z', durationMinutes: 10, rating: null, notes: null, entries: [] }],
  })
  expect((await api.sessoesProgresso()).map((s) => s.id)).toEqual(['99'])
})
