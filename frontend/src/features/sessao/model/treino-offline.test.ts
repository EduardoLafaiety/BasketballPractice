import { expect, it, vi } from 'vitest'
import { guardarTreinoOffline, lerTreinoOffline } from './treino-offline'
import { limparTreinosLocais } from './treino-local'
import type { Drill } from '../../../shared/types'

const drills: Drill[] = [{ id: '1', nome: 'Lance livre', categoria: 'Arremesso', metrica: 'acertos', descricao: 'Mantenha a postura.', personalizado: false },
  { id: '2', nome: 'Outro exercício', categoria: 'Drible', metrica: 'tempo', descricao: 'Outra instrução', personalizado: true }]
const plano = { titulo: 'Treino preparado', blocos: [{ drillId: '1', nome: 'Lance livre', categoria: 'Arremesso' as const, metrica: 'acertos' as const, minutos: 4 }] }

it('guarda só o catálogo necessário, mantendo ordem e duração do plano, isolado por conta', () => {
  guardarTreinoOffline('1', plano, drills)
  expect(lerTreinoOffline('1')).toMatchObject({ plano, exercicios: [drills[0]] })
  expect(lerTreinoOffline('2')).toBeNull()
  expect(localStorage.getItem('bp.treino.v3.1.offline')).not.toContain('Outro exercício')
  limparTreinosLocais()
  expect(lerTreinoOffline('1')).toBeNull()
})

it('não substitui pacote anterior se faltam exercícios ou armazenamento falha', () => {
  guardarTreinoOffline('1', plano, drills)
  const anterior = localStorage.getItem('bp.treino.v3.1.offline')
  expect(() => guardarTreinoOffline('1', plano, [])).toThrow('Carregue')
  expect(localStorage.getItem('bp.treino.v3.1.offline')).toBe(anterior)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Cheio') })
  expect(() => guardarTreinoOffline('1', plano, drills)).toThrow('Cheio')
})

it('recusa versão desconhecida, plano incompleto e catálogo inválido sem apagar o original', () => {
  const pacote = guardarTreinoOffline('1', plano, drills)
  for (const extra of [{ versao: 99 }, { exercicios: [] }, { exercicios: [{ ...drills[0], descricao: {} }] }, { plano: { ...plano, blocos: [{ ...plano.blocos[0], minutos: -1 }] } }]) {
    const raw = JSON.stringify({ ...pacote, ...extra })
    localStorage.setItem('bp.treino.v3.1.offline', raw)
    expect(lerTreinoOffline('1')).toBeNull()
    expect(localStorage.getItem('bp.treino.v3.1.offline')).toBe(raw)
  }
})
