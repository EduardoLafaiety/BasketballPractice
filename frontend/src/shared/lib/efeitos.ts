// Entrada suave dos blocos, sem efeitos acompanhando o mouse.
// Tudo é só visual: sem estes efeitos a página continua completa e legível.
const SURGE = '.surge, .card, .treino-linha, .stat, .plano-item, .semana-dia'
const SEM_SURGE = '.guiada, .menu-tela, .topo, .cartao-jogador, .foto-jogador, .detalhe > .painel'
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

  return () => {
    mutacoes.disconnect()
    olho?.disconnect()
    window.removeEventListener('scroll', verificar)
    window.removeEventListener('resize', verificar)
    window.clearInterval(garantia)
  }
}
