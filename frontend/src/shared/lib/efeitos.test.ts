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
})

describe('Com IntersectionObserver (todo navegador atual)', () => {
  // Observador de mentira: guarda quem está sendo observado e deixa o teste disparar o aviso.
  function observadorFalso() {
    const observados = new Set<Element>()
    let avisar: IntersectionObserverCallback = () => {}
    vi.stubGlobal('IntersectionObserver', class {
      constructor(aoAvisar: IntersectionObserverCallback) { avisar = aoAvisar }
      observe(el: Element) { observados.add(el) }
      unobserve(el: Element) { observados.delete(el) }
      disconnect() { observados.clear() }
    })
    const entrar = (el: Element, isIntersecting: boolean, top = 99999) =>
      avisar([{ target: el, isIntersecting, boundingClientRect: { top } } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
    return { observados, entrar }
  }

  it('não mede os blocos a cada rolagem: espera o aviso do navegador', () => {
    const { observados, entrar } = observadorFalso()
    const raiz = raizCom('<div class="card"></div>')
    const card = raiz.querySelector<HTMLElement>('.card')!
    const medir = naTela(card, 10)
    const parar = iniciarEfeitos(raiz)

    expect(card.dataset.surge).toBe('espera')
    expect(observados.has(card)).toBe(true)
    window.dispatchEvent(new Event('scroll'))
    expect(medir).not.toHaveBeenCalled()
    expect(card.dataset.surge).toBe('espera')

    entrar(card, true)
    expect(card.dataset.surge).toBe('ok')
    expect(observados.has(card)).toBe(false)
    parar()
  })

  it('mostra também o bloco que já ficou para cima da tela, e ignora o que ainda está abaixo', () => {
    const { entrar } = observadorFalso()
    const raiz = raizCom('<div class="card" id="acima"></div><div class="card" id="abaixo"></div>')
    const parar = iniciarEfeitos(raiz)
    const acima = raiz.querySelector<HTMLElement>('#acima')!
    const abaixo = raiz.querySelector<HTMLElement>('#abaixo')!
    entrar(acima, false, -500)
    entrar(abaixo, false, 99999)
    expect(acima.dataset.surge).toBe('ok')
    expect(abaixo.dataset.surge).toBe('espera')
    parar()
  })

  it('a garantia mostra o bloco que o observador não avisou', () => {
    vi.useFakeTimers()
    observadorFalso()
    const raiz = raizCom('<div class="card"></div>')
    const card = raiz.querySelector<HTMLElement>('.card')!
    naTela(card, 10)
    const parar = iniciarEfeitos(raiz)
    expect(card.dataset.surge).toBe('espera')
    vi.advanceTimersByTime(1000)
    expect(card.dataset.surge).toBe('ok')
    parar()
  })
})
