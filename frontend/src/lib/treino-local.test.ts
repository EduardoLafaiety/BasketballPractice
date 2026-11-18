import { describe, expect, it, vi } from 'vitest'
import { enfileirar, gravarLocal, lerLocal, limparTreinosLocais, pendentes, sincronizar } from './treino-local'
import type { NovaSessao } from '../types'

const sessao = (clientId: string): NovaSessao => ({ clientId, data: new Date().toISOString(), duracaoMin: 1, entradas: [] })

describe('dados locais do treino', () => {
  it('isola contas, recupera rascunhos e limpa ao sair', () => {
    gravarLocal('1', 'rascunho', { indice: 2 })
    expect(lerLocal('2', 'rascunho')).toBeNull()
    expect(lerLocal('1', 'rascunho')).toEqual({ indice: 2 })
    limparTreinosLocais()
    expect(lerLocal('1', 'rascunho')).toBeNull()
  })
  it('não promete persistência quando o armazenamento está cheio', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Cheio') })
    expect(() => enfileirar('1', sessao('a'))).toThrow('Cheio')
  })
  it('mantém o pedido após falha e reenvia com a mesma chave sem duplicar na fila', async () => {
    enfileirar('1', sessao('a')); enfileirar('1', sessao('a'))
    const enviar = vi.fn().mockRejectedValueOnce(new Error('Rede')).mockResolvedValueOnce({})
    await expect(sincronizar('1', enviar, () => true)).rejects.toThrow('Rede')
    expect(pendentes('1')).toHaveLength(1)
    await sincronizar('1', enviar, () => true)
    expect(enviar.mock.calls.map(([s]) => s.clientId)).toEqual(['a', 'a'])
    expect(pendentes('1')).toEqual([])
  })
  it('preserva novas sessões adicionadas durante o envio e para ao trocar de conta', async () => {
    enfileirar('1', sessao('a'))
    const enviar = vi.fn(async () => { enfileirar('1', sessao('b')) })
    await sincronizar('1', enviar, () => true)
    expect(pendentes('1').map((s) => s.clientId)).toEqual(['b'])
    await sincronizar('1', enviar, () => false)
    expect(enviar).toHaveBeenCalledTimes(1)
  })
})
