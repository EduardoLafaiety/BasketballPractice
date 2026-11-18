/** Confirma pelo service worker que os arquivos essenciais foram guardados antes de prometer uso offline. */
export async function prepararArquivosOffline() {
  if (!('serviceWorker' in navigator)) throw new Error('Este navegador não oferece preparação offline. Use o site com conexão.')
  if (!navigator.serviceWorker.controller) throw new Error('A preparação ainda está iniciando. Recarregue a página com conexão e tente novamente.')
  const urls = [...new Set(performance.getEntriesByType('resource').map((r) => r.name).filter((name) => {
    const url = new URL(name)
    return url.origin === location.origin && url.pathname.startsWith(`${import.meta.env.BASE_URL}assets/`) && /\.(js|css|woff2?)$/.test(url.pathname)
  }))]
  const canal = new MessageChannel()
  await new Promise<void>((resolve, reject) => {
    const finalizar = () => { clearTimeout(timer); canal.port1.close(); canal.port2.close() }
    const timer = setTimeout(() => { finalizar(); reject(new Error('A preparação demorou demais. Confira a conexão e tente novamente.')) }, 15_000)
    canal.port1.onmessage = (evento) => {
      finalizar()
      if (evento.data?.ok === true) resolve()
      else reject(new Error('Não foi possível guardar todos os arquivos. Mantenha a conexão e tente novamente.'))
    }
    try { navigator.serviceWorker.controller!.postMessage({ tipo: 'PREPARAR_TREINO', urls }, [canal.port2]) }
    catch (erro) { finalizar(); reject(erro) }
  })
}
