import { expect, it } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { cache } from '../../../shared/data/recursos'
import { apiFalsa } from '../../../test/api-falsa'
import { registrarSessao } from './registrarSessao'

const resposta = { id: 1, performedAt: '2026-11-01T12:00:00Z', durationMinutes: 10, rating: null, notes: null, entries: [] }
const entrada = { data: resposta.performedAt, duracaoMin: 10, entradas: [] }

it('salva sem consulta prévia, invalida derivados e atualiza somente uma lista já carregada', async () => {
  definirToken('conta-a')
  const { chamadas } = apiFalsa({ 'POST /sessions': resposta })
  cache.set('progresso-historico:0', ['antigo'])
  const criada = await registrarSessao(entrada)
  expect(cache.has('sessoes')).toBe(false)
  expect(cache.has('progresso-historico:0')).toBe(false)
  cache.set('sessoes', [criada])
  await registrarSessao(entrada)
  expect(cache.get('sessoes')).toEqual([criada])
  expect(chamadas.every((c) => c.metodo === 'POST')).toBe(true)
})

it('resposta de outra autenticação não altera o cache atual', async () => {
  definirToken('conta-a')
  let responder!: (valor: object) => void
  apiFalsa({ 'POST /sessions': () => new Promise((resolve) => { responder = resolve }) })
  const salvamento = registrarSessao(entrada)
  definirToken('conta-b')
  cache.set('progresso-historico:0', ['conta-b'])
  responder(resposta)
  await salvamento
  expect(cache.get('progresso-historico:0')).toEqual(['conta-b'])
})
