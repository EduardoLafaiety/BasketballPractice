// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

function worker(scope = 'https://app.exemplo.com/') {
  const listeners: Record<string, (event: any) => void> = {}
  const cache = { addAll: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) }
  const caches = { open: vi.fn().mockResolvedValue(cache), match: vi.fn().mockResolvedValue({ ok: true }), keys: vi.fn().mockResolvedValue(['bp-v6', 'outro-aplicativo']), delete: vi.fn().mockResolvedValue(true) }
  const fetch = vi.fn().mockImplementation(async () => new Response(`<script src="${new URL('assets/sessao-abc.js', scope).pathname}"></script>`))
  runInNewContext(readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, location: { origin: new URL(scope).origin }, addEventListener: (name: string, fn: (e: any) => void) => { listeners[name] = fn }, clients: { claim: vi.fn() } },
    caches, URL, fetch,
  })
  return { listeners, cache, caches, fetch }
}

it('confirma preparação somente após guardar a casca e os arquivos do próprio escopo', async () => {
  const { listeners, cache } = worker('https://app.exemplo.com/basket/')
  let tarefa!: Promise<unknown>
  const postMessage = vi.fn()
  listeners.message({ data: { tipo: 'PREPARAR_TREINO', urls: ['https://app.exemplo.com/basket/assets/sessao-abc.js'] }, ports: [{ postMessage }], waitUntil: (p: Promise<unknown>) => { tarefa = p } })
  await tarefa
  expect(cache.addAll).toHaveBeenCalledWith(['/basket/manifest.webmanifest', '/basket/icon.svg', 'https://app.exemplo.com/basket/assets/sessao-abc.js'])
  expect(cache.put.mock.calls.map(([key]) => key)).toEqual(['/basket/index.html', '/basket/'])
  expect(postMessage).toHaveBeenCalledWith({ ok: true })
})

it.each(['https://app.exemplo.com/api/sessions', 'https://outro.exemplo.com/assets/script.js', 'https://app.exemplo.com/fora/script.js'])('recusa conteúdo fora dos arquivos estáticos: %s', async (url) => {
  const { listeners, cache } = worker()
  let tarefa!: Promise<unknown>
  const postMessage = vi.fn()
  listeners.message({ data: { tipo: 'PREPARAR_TREINO', urls: [url] }, ports: [{ postMessage }], waitUntil: (p: Promise<unknown>) => { tarefa = p } })
  await tarefa
  expect(cache.addAll).not.toHaveBeenCalled()
  expect(postMessage).toHaveBeenCalledWith({ ok: false })
})

it('falha no armazenamento não é anunciada como treino preparado', async () => {
  const { listeners, cache } = worker()
  cache.addAll.mockRejectedValue(new Error('Sem espaço'))
  let tarefa!: Promise<unknown>
  const postMessage = vi.fn()
  listeners.message({ data: { tipo: 'PREPARAR_TREINO', urls: ['https://app.exemplo.com/assets/sessao-abc.js'] }, ports: [{ postMessage }], waitUntil: (p: Promise<unknown>) => { tarefa = p } })
  await tarefa
  expect(postMessage).toHaveBeenCalledWith({ ok: false })
})

it('não confirma HTML de outro deploy que referencia módulos ainda não carregados', async () => {
  const { listeners, cache, fetch } = worker()
  fetch.mockResolvedValue(new Response('<script src="/assets/novo-deploy.js"></script>'))
  let tarefa!: Promise<unknown>
  const postMessage = vi.fn()
  listeners.message({ data: { tipo: 'PREPARAR_TREINO', urls: ['https://app.exemplo.com/assets/sessao-abc.js'] }, ports: [{ postMessage }], waitUntil: (p: Promise<unknown>) => { tarefa = p } })
  await tarefa
  expect(postMessage).toHaveBeenCalledWith({ ok: false })
  expect(cache.put).not.toHaveBeenCalled()
})

it('não intercepta a API e reutiliza arquivos públicos apesar de Vary Origin', async () => {
  const { listeners, caches } = worker()
  const respondWith = vi.fn()
  listeners.fetch({ request: { method: 'GET', url: 'https://app.exemplo.com/api/sessions' }, respondWith })
  expect(respondWith).not.toHaveBeenCalled()
  const request = { method: 'GET', url: 'https://app.exemplo.com/assets/app.js' }
  listeners.fetch({ request, respondWith })
  await respondWith.mock.calls[0][0]
  expect(caches.match).toHaveBeenCalledWith(request, { ignoreVary: true })
})

it('atualização remove somente versões antigas do cache deste aplicativo', async () => {
  const { listeners, caches } = worker()
  let tarefa!: Promise<unknown>
  listeners.activate({ waitUntil: (p: Promise<unknown>) => { tarefa = p } })
  await tarefa
  expect(caches.delete.mock.calls).toEqual([['bp-v6']])
})

it('prepara o treino mesmo com o script do AdSense no HTML: scripts de fora não são guardados nem exigidos', async () => {
  const { listeners, cache, fetch } = worker()
  fetch.mockResolvedValue(new Response(
    '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1"></script><script type="module" src="/assets/sessao-abc.js"></script>',
  ))
  let tarefa!: Promise<unknown>
  const postMessage = vi.fn()
  listeners.message({ data: { tipo: 'PREPARAR_TREINO', urls: ['https://app.exemplo.com/assets/sessao-abc.js'] }, ports: [{ postMessage }], waitUntil: (p: Promise<unknown>) => { tarefa = p } })
  await tarefa
  expect(postMessage).toHaveBeenCalledWith({ ok: true })
  expect(cache.addAll.mock.calls[0][0].some((u: string) => u.includes('googlesyndication'))).toBe(false)
})
