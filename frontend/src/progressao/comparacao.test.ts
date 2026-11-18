import { expect, it } from 'vitest'
import { comparar } from './comparacao'
import type { Sessao } from '../types'

const sessao = (data: string, entradas: Sessao['entradas']): Sessao => ({ id: data, data, duracaoMin: 20, entradas, zonas: [] })
it('compara janelas sem sobreposição, exclui o futuro e calcula o aproveitamento pelo total de tentativas', () => {
  const sessoes = [
    sessao('2026-11-18T10:00:00-03:00', [{ drillId: '1', acertos: 1, tentativas: 1 }]),
    sessao('2026-11-12T00:00:00-03:00', [{ drillId: '1', acertos: 1, tentativas: 9 }, { drillId: '2', repeticoes: 10 }]),
    sessao('2026-11-11T23:59:00-03:00', [{ drillId: '1', acertos: 2, tentativas: 2 }]),
    sessao('2026-11-19T00:00:00-03:00', [{ drillId: '1', acertos: 100, tentativas: 100 }]),
  ]
  const r = comparar(sessoes, 7, '', new Date('2026-11-18T12:00:00-03:00'))
  expect(r.atual).toMatchObject({ frequencia: 2, diasAtivos: 2, minutos: 40, aproveitamento: 20, repeticoes: 10 })
  expect(r.anterior).toMatchObject({ frequencia: 1, aproveitamento: 100 })
  expect(comparar(sessoes, 7, '2', new Date('2026-11-18T12:00:00-03:00')).atual).toMatchObject({ frequencia: 1, minutos: 0, aproveitamento: null, repeticoes: 10 })
})
