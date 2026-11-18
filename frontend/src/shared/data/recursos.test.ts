import { expect, it, vi } from 'vitest'
import { cache, carregarRecurso, invalidar, limparCache } from './recursos'

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
