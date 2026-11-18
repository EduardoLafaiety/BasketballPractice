import { sincronizar } from './sincronizar-sessoes'
import { describe, expect, it, vi } from 'vitest'
import { enfileirar, gravarLocal, lerLocal, limparTreinosLocais, pendentes } from './treino-local'
import type { NovaSessao } from '../../../shared/types'
import { ApiError } from '../../../shared/api/http'

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
    expect((await sincronizar('1', enviar, () => true)).interrupcao?.message).toBe('Rede')
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
  it('lê o formato antigo e preserva uma edição realizada durante o envio', async () => {
    gravarLocal('1', 'fila', [sessao('a')])
    expect(pendentes('1')).toHaveLength(1)
    await sincronizar('1', async () => { enfileirar('1', { ...sessao('a'), notas: 'Corrigida' }) }, () => true)
    expect(pendentes('1')[0].notas).toBe('Corrigida')
  })

  it('mantém rejeições por sessão e envia os demais registros', async () => {
    for (const id of ['a', 'b', 'c']) enfileirar('1', sessao(id))
    const enviar = vi.fn(async (s: NovaSessao) => {
      if (s.clientId === 'a') throw new ApiError(409, 'Dia do programa indisponível')
      if (s.clientId === 'b') throw new ApiError(422, 'Notas inválidas')
    })
    const resultado = await sincronizar('1', enviar, () => true)
    expect(resultado.enviadas).toBe(1)
    expect(resultado.falhas.map((f) => [f.sessao.clientId, f.erro.status])).toEqual([['a', 409], ['b', 422]])
    expect(pendentes('1').map((s) => s.clientId)).toEqual(['a', 'b'])
  })

  it.each([401, 403, 429, 503])('interrompe a fila em erro %s sem descartar as próximas sessões', async (status) => {
    enfileirar('1', sessao('a')); enfileirar('1', sessao('b'))
    const erro = new ApiError(status, 'Tente depois')
    const enviar = vi.fn().mockRejectedValue(erro)
    expect((await sincronizar('1', enviar, () => true)).interrupcao).toBe(erro)
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(pendentes('1')).toHaveLength(2)
  })

  it('preserva rejeições anteriores quando uma falha de rede interrompe o restante', async () => {
    enfileirar('1', sessao('a')); enfileirar('1', sessao('b'))
    const enviar = vi.fn().mockRejectedValueOnce(new ApiError(400, 'Notas inválidas')).mockRejectedValueOnce(new Error('Rede'))
    const resultado = await sincronizar('1', enviar, () => true)
    expect(resultado.falhas[0].sessao.clientId).toBe('a')
    expect(resultado.interrupcao?.message).toBe('Rede')
    expect(pendentes('1')).toHaveLength(2)
  })

  it('informa confirmações parciais antes de uma falha de servidor', async () => {
    enfileirar('1', sessao('a')); enfileirar('1', sessao('b'))
    const enviar = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new ApiError(503, 'Servidor indisponível'))
    const resultado = await sincronizar('1', enviar, () => true)
    expect(resultado.enviadas).toBe(1)
    expect(resultado.interrupcao?.message).toBe('Servidor indisponível')
    expect(pendentes('1').map((s) => s.clientId)).toEqual(['b'])
  })

  it('não repete automaticamente um item já rejeitado, permitindo enviar itens novos', async () => {
    enfileirar('1', sessao('a')); enfileirar('1', sessao('b'))
    const enviar = vi.fn().mockResolvedValue({})
    await sincronizar('1', enviar, () => true, (s) => s.clientId === 'a')
    expect(enviar.mock.calls.map(([s]) => s.clientId)).toEqual(['b'])
    expect(pendentes('1').map((s) => s.clientId)).toEqual(['a'])
  })
})
