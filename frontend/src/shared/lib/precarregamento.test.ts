import { expect, it, vi } from 'vitest'
import { precarregarDestino, registrarPagina } from './precarregamento'

it('antecipa apenas o destino solicitado e respeita economia de dados', async () => {
  const pagina = vi.fn(async () => ({})), outra = vi.fn(async () => ({}))
  registrarPagina('/teste-carregar/:id', pagina)
  registrarPagina('/teste-outra', outra)
  precarregarDestino('/teste-carregar/1')
  precarregarDestino('/teste-carregar/2')
  expect(pagina).toHaveBeenCalledTimes(1)
  expect(outra).not.toHaveBeenCalled()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  precarregarDestino('/teste-outra')
  expect(outra).not.toHaveBeenCalled()
})
