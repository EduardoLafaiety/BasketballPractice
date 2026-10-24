// Service worker do Basketball Practice: deixa o app abrir sem internet.
// Guarda só a "casca" do site (HTML, JS, CSS, ícones). Respostas da API nunca são guardadas:
// os dados do atleta ficam no servidor e não sobram no aparelho depois do logout.
const VERSAO = 'bp-v1'
const CASCA = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(CASCA)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Páginas: rede primeiro (versão nova), cache se estiver offline.
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(VERSAO).then((cache) => cache.put('/index.html', copia))
          return resposta
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Arquivos com hash no nome (/assets) nunca mudam: cache primeiro.
  evento.respondWith(
    caches.match(request).then(
      (guardado) =>
        guardado ??
        fetch(request).then((resposta) => {
          if (resposta.ok && (url.pathname.startsWith('/assets/') || CASCA.includes(url.pathname))) {
            const copia = resposta.clone()
            caches.open(VERSAO).then((cache) => cache.put(request, copia))
          }
          return resposta
        }),
    ),
  )
})

// Toque na notificação de lembrete: abre (ou foca) o app.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => 'focus' in j)
      return aberta ? aberta.focus() : self.clients.openWindow('/')
    }),
  )
})
