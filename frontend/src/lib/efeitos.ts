// Efeitos do site inteiro: os blocos aparecem ao entrar na tela e o mouse revela uma camada por baixo.
// Tudo é só visual: sem estes efeitos a página continua completa e legível.
const SURGE = '.surge, .card, .treino-linha, .stat, .plano-item, .semana-dia'
const SEM_SURGE = '.guiada, .menu-tela, .topo'
const REVELA = '.foto-jogador, .semana-dia, .drill-card, .cartao-jogador, .nivel-cartao, .ferramenta-linha, .treino-linha, .conteudo div.card, .conteudo h1, .conteudo h2'
const SEM_REVELA = '.guiada, .abertura, .menu-tela'
const TEXTO = /^H[12]$/

interface Revelando {
  x: number
  y: number
  r: number
}

export function iniciarEfeitos(raiz: HTMLElement) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {}

  const esperando = new Set<HTMLElement>()
  const registrar = () => {
    raiz.querySelectorAll<HTMLElement>(SURGE).forEach((el) => {
      // Quem já estava esperando continua na fila: os efeitos podem ter sido reiniciados.
      if ((el.dataset.surge && el.dataset.surge !== 'espera') || el.closest(SEM_SURGE)) return
      el.dataset.surge = 'espera'
      esperando.add(el)
    })
    verificar()
  }
  const verificar = () => {
    const limite = window.innerHeight * 0.94
    esperando.forEach((el) => {
      if (!el.isConnected) {
        esperando.delete(el)
        return
      }
      if (el.getBoundingClientRect().top > limite) return
      esperando.delete(el)
      el.dataset.surge = 'ok'
      // Depois da entrada, o elemento volta a mandar nas próprias transições (hover etc.).
      window.setTimeout(() => el.removeAttribute('data-surge'), 1400)
    })
  }

  const mutacoes = new MutationObserver(registrar)
  mutacoes.observe(raiz, { childList: true, subtree: true })
  window.addEventListener('scroll', verificar, { passive: true })
  window.addEventListener('resize', verificar)
  const garantia = window.setInterval(verificar, 400)
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
      if (TEXTO.test(sob.tagName)) sob.dataset.texto = sob.textContent ?? ''
    }
    if (ativos.size && !quadro) quadro = requestAnimationFrame(passo)
  }
  window.addEventListener('pointermove', aoMover, { passive: true })

  return () => {
    mutacoes.disconnect()
    window.removeEventListener('scroll', verificar)
    window.removeEventListener('resize', verificar)
    window.removeEventListener('pointermove', aoMover)
    window.clearInterval(garantia)
    cancelAnimationFrame(quadro)
  }
}
