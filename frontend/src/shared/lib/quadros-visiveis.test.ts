import { expect, it, vi } from 'vitest'
import { animarQuandoVisivel } from './quadros-visiveis'

it('interrompe quadros na aba oculta e retoma sem avançar a animação pelo tempo de suspensão', () => {
  let proximo!: FrameRequestCallback
  const solicitar = vi.fn((cb: FrameRequestCallback) => { proximo = cb; return 1 })
  const cancelar = vi.fn()
  vi.stubGlobal('requestAnimationFrame', solicitar)
  vi.stubGlobal('cancelAnimationFrame', cancelar)
  const visibilidade = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const desenhar = vi.fn()
  const parar = animarQuandoVisivel(document.createElement('div'), desenhar)
  proximo(100)
  expect(desenhar).toHaveBeenLastCalledWith(100, 0)
  visibilidade.mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(cancelar).toHaveBeenCalled()
  const chamadas = solicitar.mock.calls.length
  proximo(10_000)
  expect(solicitar).toHaveBeenCalledTimes(chamadas)
  visibilidade.mockReturnValue('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  proximo(20_000)
  expect(desenhar).toHaveBeenLastCalledWith(20_000, 0)
  parar()
})
