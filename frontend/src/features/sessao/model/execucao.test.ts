import { expect, it } from 'vitest'
import { estadoInicial, transicaoSessao } from './execucao'
import { salvarOuEnfileirar } from './salvar-sessao'
import { ApiError, definirToken } from '../../../shared/api/http'
import { pendentes } from './treino-local'

it('só avança em sequência e não reabre um resumo por uma ação atrasada', () => {
  const inicial = estadoInicial(2)
  expect(transicaoSessao(inicial, { tipo: 'alternar' })).toBe(inicial)
  expect(transicaoSessao(inicial, { tipo: 'bloco', indice: 1, quantidade: 2 })).toBe(inicial)
  const primeiro = transicaoSessao(inicial, { tipo: 'bloco', indice: 0, quantidade: 2 })
  expect(primeiro).toEqual({ fase: 'execucao', indice: 0, ritmo: 'rodando' })
  expect(transicaoSessao(primeiro, { tipo: 'alternar' })).toEqual({ fase: 'execucao', indice: 0, ritmo: 'pausada' })
  const segundo = transicaoSessao(primeiro, { tipo: 'bloco', indice: 1, quantidade: 2 })
  const resumo = transicaoSessao(segundo, { tipo: 'bloco', indice: 2, quantidade: 2 })
  expect(resumo).toEqual({ fase: 'resumo' })
  expect(transicaoSessao(resumo, { tipo: 'bloco', indice: 0, quantidade: 2 })).toBe(resumo)
})

it('retoma execução pausada ou resumo sem disparar o relógio automaticamente', () => {
  expect(estadoInicial(2, 1)).toEqual({ fase: 'execucao', indice: 1, ritmo: 'pausada' })
  expect(estadoInicial(2, 2)).toEqual({ fase: 'resumo' })
})

it('distingue confirmação do servidor, persistência local e falhas de acesso', async () => {
  const sessao = { clientId: 'a', data: '2026-11-18T12:00:00Z', duracaoMin: 5, entradas: [] }
  expect(await salvarOuEnfileirar('1', sessao, async () => ({}))).toBe('servidor')
  expect(pendentes('1')).toEqual([])
  expect(await salvarOuEnfileirar('1', sessao, async () => { throw new ApiError(503, 'Indisponível') })).toBe('aparelho')
  expect(pendentes('1')).toEqual([sessao])
  await expect(salvarOuEnfileirar('2', sessao, async () => { throw new ApiError(401, 'Entre novamente') })).rejects.toThrow('Entre novamente')
  expect(pendentes('2')).toEqual([])
})

it('um envio antigo que falhou não recria dados locais após sair ou trocar de conta', async () => {
  definirToken('primeira')
  await expect(salvarOuEnfileirar('1', { clientId: 'a', data: '2026-11-18T12:00:00Z', duracaoMin: 5, entradas: [] }, async () => {
    definirToken('outra'); throw new ApiError(503, 'Indisponível')
  })).rejects.toThrow('A conta mudou')
  expect(pendentes('1')).toEqual([])
})
