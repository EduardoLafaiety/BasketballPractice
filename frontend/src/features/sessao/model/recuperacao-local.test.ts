import { sincronizar } from './sincronizar-sessoes'
import { expect, it, vi } from 'vitest'
import { criarGravadorRascunho, descartarRegistrosInvalidos, enfileirar, exportarTreinosLocais, gravarLocal, lerLocal, pendentes, registrosComProblema } from './treino-local'
import { rascunhoValido, type Rascunho } from './sessao'
import { sessaoValida } from './validacao-local'

const rascunhoExemplo = (): Rascunho => ({
  plano: { titulo: 'Treino', blocos: [{ drillId: '1', nome: 'Lance livre', categoria: 'Arremesso', metrica: 'acertos', minutos: 5 }] },
  clientId: 'identidade-estavel', inicio: '2026-11-18T12:00:00Z', indice: 0, restante: 300, decorrido: 0, reps: 0, entradas: [], zonas: {}, total: 0,
  toques: [], zona: null, diario: { esforco: 3, cansaco: 3, notas: '' },
})
const sessao = { clientId: 'a', data: '2026-11-18T12:00:00Z', duracaoMin: 5, entradas: [] }

it('lê rascunho legado e migra ao guardar sem trocar identidade ou contadores', () => {
  const original = rascunhoExemplo()
  localStorage.setItem('bp.treino.v1.1.rascunho', JSON.stringify(original))
  expect(rascunhoValido(lerLocal('1', 'rascunho'))).toBe(true)
  criarGravadorRascunho('1')(original)
  expect(JSON.parse(localStorage.getItem('bp.treino.v1.1.rascunho')!)).toEqual({ versaoRascunho: 2, dados: original })
  expect(lerLocal('1', 'rascunho')).toEqual(original)
})

it.each([
  { inicio: 'inválido' }, { zona: 'zona-desconhecida' }, { zonas: { garrafao: { acertos: 2, tentativas: 1 } } },
  { toques: [{ acertou: true, zona: 'inválida' }] }, { entradas: [{ drillId: '1', segundos: -1 }] }, { diario: { esforco: 7, cansaco: 2, notas: '' } },
])('recusa rascunho estruturalmente inválido: %j', (extra) => {
  expect(rascunhoValido({ ...rascunhoExemplo(), ...extra })).toBe(false)
})

it('preserva o JSON original e registros de versão futura; exportação isola conta e credenciais', () => {
  localStorage.setItem('bp.treino.v1.1.rascunho', '{incompleto')
  localStorage.setItem('bp.treino.v2.1.pendente.a', JSON.stringify({ versao: 99, sessao }))
  localStorage.setItem('bp.token', 'segredo')
  enfileirar('2', { ...sessao, notas: 'Outra conta' })
  expect(registrosComProblema('1')).toHaveLength(2)
  const copia = exportarTreinosLocais('1')
  expect(copia).toContain('{incompleto')
  expect(copia).not.toContain('segredo')
  expect(copia).not.toContain('Outra conta')
  expect(pendentes('1')).toEqual([])
  expect(localStorage.getItem('bp.treino.v1.1.rascunho')).toBe('{incompleto')
})

it('recupera itens válidos de uma fila legada mista e descarta somente os inválidos após decisão', async () => {
  gravarLocal('1', 'fila', [sessao, { data: 'inválida' }])
  enfileirar('2', sessao)
  expect(pendentes('1')).toEqual([sessao])
  descartarRegistrosInvalidos('1')
  expect(lerLocal('1', 'fila')).toEqual([sessao])
  const enviar = vi.fn().mockResolvedValue({})
  await sincronizar('1', enviar, () => true)
  expect(enviar.mock.calls[0][0].clientId).toBe('a')
  expect(pendentes('1')).toEqual([])
  expect(pendentes('2')).toHaveLength(1)
})

it('não envia versão antiga sobreposta por um item futuro ou com identidade divergente', () => {
  gravarLocal('1', 'fila', [sessao])
  localStorage.setItem('bp.treino.v2.1.pendente.a', JSON.stringify({ versao: 3, sessao }))
  expect(pendentes('1')).toEqual([])
  localStorage.setItem('bp.treino.v2.1.pendente.a', JSON.stringify({ versao: 2, sessao: { ...sessao, clientId: 'b' } }))
  expect(pendentes('1')).toEqual([])
})

it('não interpreta envelope de rascunho como formato conhecido da fila', () => {
  localStorage.setItem('bp.treino.v1.1.fila', JSON.stringify({ versaoRascunho: 2, dados: [sessao] }))
  expect(pendentes('1')).toEqual([])
  expect(registrosComProblema('1')).toHaveLength(1)
})

it('não sobrescreve nem remove o rascunho atualizado em outra aba', () => {
  const primeiro = criarGravadorRascunho('1')
  primeiro(rascunhoExemplo())
  const segundo = criarGravadorRascunho('1')
  segundo({ ...rascunhoExemplo(), reps: 4 })
  expect(() => primeiro(rascunhoExemplo())).toThrow('outra aba')
  primeiro.remover()
  expect(lerLocal<Rascunho>('1', 'rascunho')?.reps).toBe(4)
})

it('detecta atualização ocorrida antes de confirmar a retomada de um rascunho antigo', () => {
  const lido = rascunhoExemplo()
  gravarLocal('1', 'rascunho', { ...lido, reps: 9 })
  const gravar = criarGravadorRascunho('1', lido)
  expect(() => gravar(lido)).toThrow('outra aba')
  gravar.remover()
  expect(lerLocal<Rascunho>('1', 'rascunho')?.reps).toBe(9)
})

it('valida entradas e zonas antes de permitir o envio, mantendo notas corrigíveis pelo contrato HTTP', () => {
  expect(sessaoValida({ ...sessao, entradas: [{ drillId: '1', acertos: 3, tentativas: 2 }] })).toBe(false)
  expect(sessaoValida({ ...sessao, zonas: [{ zona: 'inexistente', acertos: 1, tentativas: 1 }] })).toBe(false)
  expect(sessaoValida({ ...sessao, notas: 'x'.repeat(2100) })).toBe(true)
})
