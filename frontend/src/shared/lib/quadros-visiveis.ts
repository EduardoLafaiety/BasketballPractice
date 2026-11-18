/** Animações didáticas param fora da tela; o relógio de treino tem seu próprio ciclo. */
export function animarQuandoVisivel(elemento: Element, desenhar: (agora: number, dt: number) => void) {
  let dentro = true
  let encerrado = false
  let pedido: number | null = null
  let ultimo: number | null = null
  const podeAnimar = () => dentro && document.visibilityState !== 'hidden' && !encerrado
  function passo(agora: number) {
    pedido = null
    if (!podeAnimar()) return
    const dt = ultimo === null ? 0 : Math.min(50, agora - ultimo)
    ultimo = agora
    desenhar(agora, dt)
    pedido = requestAnimationFrame(passo)
  }
  const atualizar = () => {
    if (pedido !== null) cancelAnimationFrame(pedido)
    pedido = null
    ultimo = null
    if (podeAnimar()) pedido = requestAnimationFrame(passo)
  }
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entrada]) => {
    dentro = entrada.isIntersecting
    atualizar()
  }) : null
  observer?.observe(elemento)
  document.addEventListener('visibilitychange', atualizar)
  atualizar()
  return () => { encerrado = true; atualizar(); observer?.disconnect(); document.removeEventListener('visibilitychange', atualizar) }
}
