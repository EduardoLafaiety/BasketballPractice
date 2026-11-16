// Efeitos do site inteiro: os blocos aparecem ao entrar na tela e o mouse revela uma camada por baixo.
// Tudo é só visual: sem estes efeitos a página continua completa e legível.
const SURGE = '.surge, .card, .treino-linha, .stat, .plano-item, .semana-dia'
const SEM_SURGE = '.guiada, .menu-tela, .topo'
// Só onde o mouse troca uma cor de verdade; cartões e listas com texto miúdo ficam de fora.
const REVELA = '.foto-jogador, .cartao-jogador, .conteudo h1, .conteudo h2'
const SEM_REVELA = '.guiada, .abertura, .menu-tela'
const TEXTO = /^H[12]$/

interface Revelando {
  x: number
  y: number
  r: number
}

export function iniciarEfeitos(raiz: HTMLElement) {
  const esperando = new Set<HTMLElement>()
  const registrar = () => {
    raiz.querySelectorAll<HTMLElement>(SURGE).forEach((el) => {
      // Quem já estava esperando continua na fila: os efeitos podem ter sido reiniciados.
      if ((el.dataset.surge && el.dataset.surge !== 'espera') || el.closest(SEM_SURGE)) return
      el.dataset.surge = 'espera'
      esperando.add(el)
      olho?.observe(el)
    })
    // Com o observador, quem já está na tela é avisado no próximo quadro; sem ele, confere agora.
    if (!olho) verificar()
  }
  const mostrar = (el: HTMLElement) => {
    esperando.delete(el)
    olho?.unobserve(el)
    el.dataset.surge = 'ok'
    // Depois da entrada, o elemento volta a mandar nas próprias transições (hover etc.).
    window.setTimeout(() => el.removeAttribute('data-surge'), 1400)
  }
  // Confere pela posição quem já pode aparecer. Mede todos primeiro e só depois escreve, para o navegador
  // calcular o layout uma vez só.
  const verificar = () => {
    if (!esperando.size) return
    const limite = window.innerHeight * 0.94
    const prontos: HTMLElement[] = []
    esperando.forEach((el) => {
      if (!el.isConnected) esperando.delete(el)
      else if (el.getBoundingClientRect().top <= limite) prontos.push(el)
    })
    prontos.forEach(mostrar)
  }
  // Com IntersectionObserver o navegador avisa quando o bloco entra na tela, fora do caminho da rolagem:
  // nada de medir cada bloco a cada evento de scroll. O intervalo abaixo fica só de garantia, para o que o
  // observador não vê (bloco cortado por uma faixa de rolagem lateral, por exemplo).
  const olho =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          (itens) => {
            const limite = window.innerHeight * 0.94
            for (const item of itens) {
              const el = item.target as HTMLElement
              if (esperando.has(el) && (item.isIntersecting || item.boundingClientRect.top <= limite)) mostrar(el)
            }
          },
          { rootMargin: '0px 0px -6% 0px' },
        )

  const mutacoes = new MutationObserver(registrar)
  mutacoes.observe(raiz, { childList: true, subtree: true })
  if (!olho) {
    window.addEventListener('scroll', verificar, { passive: true })
    window.addEventListener('resize', verificar)
  }
  const garantia = window.setInterval(verificar, olho ? 1000 : 400)
  registrar()

  // Mouse: cada elemento sob o ponteiro ganha um círculo que cresce, persegue o mouse e encolhe ao sair.
  const ativos = new Map<HTMLElement, Revelando>()
  const mouse = { x: 0, y: 0 }
  let sob: HTMLElement | null = null
  let quadro = 0

  const passo = () => {
    quadro = 0
    ativos.forEach((a, el) => {
      const caixa = el.getBoundingClientRect()
      const alvo = el === sob ? Math.min(280, Math.max(120, Math.max(caixa.width, caixa.height) * 0.62)) : 0
      a.r += (alvo - a.r) * 0.14
      if (el === sob) {
        a.x += (mouse.x - caixa.left - a.x) * 0.2
        a.y += (mouse.y - caixa.top - a.y) * 0.2
      }
      if (alvo === 0 && a.r < 1) {
        ativos.delete(el)
        el.style.removeProperty('--r')
        return
      }
      el.style.setProperty('--x', `${a.x.toFixed(1)}px`)
      el.style.setProperty('--y', `${a.y.toFixed(1)}px`)
      el.style.setProperty('--r', `${a.r.toFixed(1)}px`)
    })
    if (ativos.size) quadro = requestAnimationFrame(passo)
  }

  const aoMover = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    mouse.x = e.clientX
    mouse.y = e.clientY
    const alvo = e.target instanceof Element ? e.target.closest<HTMLElement>(REVELA) : null
    sob = alvo && !alvo.closest(SEM_REVELA) ? alvo : null
    if (sob && !ativos.has(sob)) {
      const caixa = sob.getBoundingClientRect()
      ativos.set(sob, { x: mouse.x - caixa.left, y: mouse.y - caixa.top, r: 0 })
      // innerText guarda as quebras dos <br>; sem elas a cópia laranja quebra as linhas em outro lugar.
      if (TEXTO.test(sob.tagName)) sob.dataset.texto = sob.innerText
    }
    if (ativos.size && !quadro) quadro = requestAnimationFrame(passo)
  }
  window.addEventListener('pointermove', aoMover, { passive: true })

  return () => {
    mutacoes.disconnect()
    olho?.disconnect()
    window.removeEventListener('scroll', verificar)
    window.removeEventListener('resize', verificar)
    window.removeEventListener('pointermove', aoMover)
    window.clearInterval(garantia)
    cancelAnimationFrame(quadro)
  }
}
