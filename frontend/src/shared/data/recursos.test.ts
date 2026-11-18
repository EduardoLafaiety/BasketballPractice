import { expect, it, vi } from 'vitest'
import { cache, carregarRecurso, invalidar, limparCache } from './recursos'
import { useRecurso } from './recursos'
import { renderHook, waitFor } from '@testing-library/react'

it('cancela uma consulta compartilhada só depois de sair o último consumidor', async () => {
  let sinal!: AbortSignal
  const carregar = vi.fn((signal: AbortSignal) => {
    sinal = signal
    return new Promise<string>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
  })
  const primeiro = renderHook(() => useRecurso('compartilhado', carregar))
  const segundo = renderHook(() => useRecurso('compartilhado', carregar))
  await waitFor(() => expect(carregar).toHaveBeenCalledTimes(1))
  primeiro.unmount()
  expect(sinal.aborted).toBe(false)
  segundo.unmount()
  expect(sinal.aborted).toBe(true)
})

it('invalidação cancela o pedido antigo e permite carregar o valor novo', async () => {
  let sinal!: AbortSignal
  const antigo = carregarRecurso('drills', (signal) => {
    sinal = signal
    return new Promise<string>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
  })
  await Promise.resolve()
  invalidar('drills')
  await expect(antigo).rejects.toMatchObject({ name: 'AbortError' })
  expect(sinal.aborted).toBe(true)
  expect(await carregarRecurso('drills', async () => 'novo')).toBe('novo')
  expect(cache.get('drills')).toBe('novo')
})

it('compartilha pedidos e impede resposta antiga após logout ou invalidação', async () => {
  let resolver!: (d: string) => void
  const carregar = vi.fn(() => new Promise<string>((r) => { resolver = r }))
  const a = carregarRecurso('teste', carregar)
  const b = carregarRecurso('teste', carregar)
  await Promise.resolve()
  expect(carregar).toHaveBeenCalledTimes(1)
  expect(a).toBe(b)
  limparCache()
  resolver('conta anterior')
  await a
  expect(cache.has('teste')).toBe(false)
  const antigo = carregarRecurso('teste', carregar)
  await Promise.resolve()
  invalidar('teste')
  await carregarRecurso('teste', async () => 'atual')
  resolver('velho')
  await antigo
  expect(cache.get('teste')).toBe('atual')
})
