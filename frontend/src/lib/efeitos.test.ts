import { afterEach, describe, expect, it, vi } from 'vitest'
import { iniciarEfeitos } from './efeitos'

function raizCom(html: string) {
  const raiz = document.createElement('main')
  raiz.innerHTML = html
  document.body.appendChild(raiz)
  return raiz
}
const naTela = (el: Element, top: number) => vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect)

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Blocos que aparecem ao rolar', () => {
  it('nada fica escondido se os efeitos forem reiniciados com o bloco ainda esperando', () => {
    const raiz = raizCom('<div class="card"></div>')
    const card = raiz.querySelector<HTMLElement>('.card')!
    naTela(card, 99999)

    const parar = iniciarEfeitos(raiz)
    expect(card.dataset.surge).toBe('espera')
    parar()

    const pararDeNovo = iniciarEfeitos(raiz)
    naTela(card, 10)
    window.dispatchEvent(new Event('scroll'))
    expect(card.dataset.surge).toBe('ok')
    pararDeNovo()
  })

  it('só mostra o bloco quando ele entra na tela, e também os que surgem depois', async () => {
    const raiz = raizCom('<div class="card" id="um"></div>')
    const um = raiz.querySelector<HTMLElement>('#um')!
    naTela(um, 99999)
    const parar = iniciarEfeitos(raiz)
    expect(um.dataset.surge).toBe('espera')

    const novo = document.createElement('div')
    novo.className = 'card'
    raiz.appendChild(novo)
    await vi.waitFor(() => expect(novo.dataset.surge).toBe('ok'))
    expect(um.dataset.surge).toBe('espera')
    parar()
  })

  it('a sessão guiada não anima: o atleta está treinando', () => {
    const raiz = raizCom('<div class="guiada"><div class="card"></div></div>')
    const parar = iniciarEfeitos(raiz)
    expect(raiz.querySelector<HTMLElement>('.card')!.dataset.surge).toBeUndefined()
    parar()
  })

  it('quem prefere menos movimento não vê nenhum efeito', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const raiz = raizCom('<div class="card"></div>')
    const parar = iniciarEfeitos(raiz)
    expect(raiz.querySelector<HTMLElement>('.card')!.dataset.surge).toBeUndefined()
    parar()
    vi.unstubAllGlobals()
  })
})
