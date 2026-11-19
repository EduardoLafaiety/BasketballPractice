// Service worker do Basketball Practice: deixa o app abrir sem internet.
// Guarda só a "casca" do site (HTML, JS, CSS, ícones). Respostas da API nunca são guardadas:
// Rascunhos e envios pendentes ficam no armazenamento local por conta, limpo no logout explícito.
const VERSAO = 'bp-v7'
// Caminhos relativos ao escopo: o site pode estar em / ou numa subpasta (ex.: /BasketballPractice/ no GitHub Pages).
const BASE = new URL(self.registration.scope).pathname
const INDEX = BASE + 'index.html'
const CASCA = [BASE, INDEX, BASE + 'manifest.webmanifest', BASE + 'icon.svg']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(CASCA)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c.startsWith('bp-v') && c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

// Preparação explícita: somente arquivos estáticos do próprio escopo, sem respostas da API.
self.addEventListener('message', (evento) => {
  if (evento.data?.tipo !== 'PREPARAR_TREINO' || !evento.ports[0]) return
  evento.waitUntil((async () => {
    try {
      const urls = evento.data.urls
      if (!Array.isArray(urls) || urls.length > 200 || urls.some((valor) => {
        const url = new URL(valor)
        return url.origin !== self.location.origin || !url.pathname.startsWith(BASE + 'assets/') || !/\.(js|css|woff2?)$/.test(url.pathname)
      })) throw new Error('Arquivos inválidos')
      // Um deploy entre a abertura da página e a preparação não pode guardar
      // HTML novo apontando para módulos que esta página ainda não carregou.
      const html = await fetch(INDEX, { cache: 'reload' })
      if (!html.ok) throw new Error('Página indisponível')
      const documento = await html.clone().text()
      // Só os módulos do próprio site: scripts de fora (o do AdSense) não entram no cache offline.
      const entradas = [...documento.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
        .map((m) => new URL(m[1], self.registration.scope))
        .filter((url) => url.origin === self.location.origin)
        .map((url) => url.href)
      if (!entradas.length || entradas.some((url) => !urls.includes(url))) throw new Error('Página atualizada; recarregue antes de preparar')
      const cache = await caches.open(VERSAO)
      await cache.addAll([BASE + 'manifest.webmanifest', BASE + 'icon.svg', ...urls])
      await cache.put(INDEX, html.clone())
      await cache.put(BASE, html)
      evento.ports[0].postMessage({ ok: true })
    } catch { evento.ports[0].postMessage({ ok: false }) }
  })())
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith(BASE + 'api/')) return

  // Páginas: rede primeiro, pulando o cache HTTP (senão o HTML antigo aponta para o JS antigo); cache se estiver offline.
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone()
            caches.open(VERSAO).then((cache) => cache.put(INDEX, copia))
          }
          return resposta
        })
        .catch(() => caches.match(INDEX, { ignoreVary: true })),
    )
    return
  }

  // Arquivos com hash no nome (/assets) nunca mudam: cache primeiro.
  evento.respondWith(
    // São arquivos públicos do mesmo app. O Vary: Origin do preview não deve
    // distinguir o preload do pedido de módulo feito após reabrir offline.
    caches.match(request, { ignoreVary: true }).then(
      (guardado) =>
        guardado ??
        fetch(request).then((resposta) => {
          if (resposta.ok && (url.pathname.startsWith(BASE + 'assets/') || CASCA.includes(url.pathname))) {
            const copia = resposta.clone()
            caches.open(VERSAO).then((cache) => cache.put(request, copia))
          }
          return resposta
        }),
    ),
  )
})

// Web Push: o servidor manda { title, body, url, tag } e a notificação aparece mesmo com o app fechado.
self.addEventListener('push', (evento) => {
  let dados = {}
  try {
    dados = evento.data ? evento.data.json() : {}
  } catch {
    dados = { body: evento.data ? evento.data.text() : '' }
  }
  const caminho = typeof dados.url === 'string' && dados.url.startsWith('/') ? dados.url.slice(1) : ''
  evento.waitUntil(
    self.registration.showNotification(dados.title || 'Basketball Practice', {
      body: dados.body || '',
      icon: BASE + 'icon.svg',
      badge: BASE + 'icon.svg',
      tag: dados.tag || 'bp',
      data: { url: BASE + caminho },
    }),
  )
})

// Toque na notificação: abre (ou foca) o app, na página que a notificação indica.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = (evento.notification.data && evento.notification.data.url) || BASE
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => 'focus' in j)
      if (!aberta) return self.clients.openWindow(destino)
      if ('navigate' in aberta && destino !== BASE) aberta.navigate(destino).catch(() => undefined)
      return aberta.focus()
    }),
  )
})
