import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { CURATED_HEADLINES, staticSiteNews } from '../src/lib/curated-news.js'
import { fetchHeadlines, syncNews, type NewsItem } from '../src/lib/news.js'
import { startApi } from './http.js'

const horasAtras = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString()

const artigo = (id: string, extra: object = {}) => ({
  id,
  title: `Manchete ${id}`,
  description: 'Texto da matéria',
  content: 'Texto da matéria',
  image: 'https://veiculo.example/foto.jpg',
  url: `https://veiculo.example/${id}`,
  publishedAt: horasAtras(13),
  lang: 'pt',
  source: { id: 'v', name: 'Veículo', url: 'https://veiculo.example' },
  ...extra,
})

function gnewsFalso(artigos: unknown[], status = 200) {
  const pedidos: { url: string; init?: RequestInit }[] = []
  const request = (async (url: string, init?: RequestInit) => {
    pedidos.push({ url, init })
    return new Response(JSON.stringify({ totalArticles: artigos.length, articles: artigos }), { status })
  }) as unknown as typeof fetch
  return { request, pedidos }
}

const { api, db, register } = await startApi()
const { token: atleta } = await register('Atleta')
const { token: admin, id: idAdmin } = await register('Chefe')
await db.query('UPDATE users SET is_admin = true WHERE id = $1', [idAdmin])

describe('Notícias', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM news_items')
    await db.query('UPDATE news_sync SET last_attempt_at = NULL')
  })

  const manchetes = async () => (await api('GET', '/news', undefined, atleta)).body as NewsItem[]
  const sincronizar = (request: typeof fetch, intervalMinutes = 20) =>
    syncNews(db, { apiKey: 'chave-secreta', intervalMinutes, request })

  it('exige login para ler e admin para publicar ou remover', async () => {
    assert.equal((await api('GET', '/news')).status, 401)
    const corpo = { title: 'LeBron muda de time' }
    assert.equal((await api('POST', '/admin/news', corpo)).status, 401)
    assert.equal((await api('POST', '/admin/news', corpo, atleta)).status, 403)

    const { body, status } = await api('POST', '/admin/news', corpo, admin)
    assert.equal(status, 201)
    assert.equal((await api('DELETE', `/admin/news/${body.id}`, undefined, atleta)).status, 403)
    assert.equal((await manchetes()).length, 1)
  })

  it('valida a manchete do admin e recusa link que não seja http(s)', async () => {
    const postar = (corpo: object) => api('POST', '/admin/news', corpo, admin)
    assert.equal((await postar({ title: 'ab' })).status, 400)
    assert.equal((await postar({ title: 'x'.repeat(161) })).status, 400)
    assert.equal((await postar({ title: 'Manchete', hours: 0 })).status, 400)
    assert.equal((await postar({ title: 'Manchete', hours: 169 })).status, 400)
    assert.equal((await postar({ title: 'Manchete', url: 'javascript:alert(1)' })).status, 400)
    assert.equal((await postar({ title: 'Manchete', url: 'não é link' })).status, 400)

    const ok = await postar({ title: '  Manchete  ', sourceName: 'ESPN', url: 'https://espn.example/1', hours: 6 })
    assert.equal(ok.status, 201)
    assert.equal(ok.body.title, 'Manchete')
    assert.equal(ok.body.origin, 'admin')
    const horas = (Date.parse(ok.body.expiresAt) - Date.parse(ok.body.publishedAt)) / 3_600_000
    assert.ok(Math.abs(horas - 6) < 0.01)
  })

  it('tira do ar a manchete do admin quando o prazo vence', async () => {
    const { body } = await api('POST', '/admin/news', { title: 'Vai vencer' }, admin)
    await db.query(`UPDATE news_items SET expires_at = now() - interval '1 minute' WHERE id = $1`, [body.id])
    assert.deepEqual(await manchetes(), [])
  })

  it('guarda só título, fonte e link, e mostra as do admin primeiro', async () => {
    const { request } = gnewsFalso([artigo('a')])
    assert.equal(await sincronizar(request), 1)
    const { body } = await api('POST', '/admin/news', { title: 'Breaking' }, admin)
    // Mais antiga que a automática: tem que vir primeiro por ser do admin, não por ser recente.
    await db.query(`UPDATE news_items SET published_at = now() - interval '2 days' WHERE id = $1`, [body.id])

    const [primeira, segunda] = await manchetes()
    assert.equal(primeira.title, 'Breaking')
    assert.deepEqual(
      { title: segunda.title, sourceName: segunda.sourceName, url: segunda.url },
      { title: 'Manchete a', sourceName: 'Veículo', url: 'https://veiculo.example/a' },
    )
    const { rows } = await db.query<Record<string, unknown>>(`SELECT * FROM news_items WHERE origin = 'gnews'`)
    assert.ok(!JSON.stringify(rows).includes('Texto da matéria'))
    assert.ok(!JSON.stringify(rows).includes('foto.jpg'))
  })

  it('manda a chave no cabeçalho, nunca na URL', async () => {
    const { request, pedidos } = gnewsFalso([])
    await sincronizar(request)
    assert.ok(!pedidos[0].url.includes('chave-secreta'))
    assert.equal((pedidos[0].init?.headers as Record<string, string>)['X-Api-Key'], 'chave-secreta')
    assert.ok(new URL(pedidos[0].url).searchParams.get('lang') === 'pt')
  })

  it('não busca de novo antes do intervalo, mesmo depois de uma falha', async () => {
    const falha = gnewsFalso([], 403)
    await assert.rejects(sincronizar(falha.request), /GNews respondeu 403/)

    const depois = gnewsFalso([artigo('a')])
    assert.equal(await sincronizar(depois.request), null)
    assert.equal(depois.pedidos.length, 0)

    await db.query(`UPDATE news_sync SET last_attempt_at = now() - interval '21 minutes'`)
    assert.equal(await sincronizar(depois.request), 1)
    assert.equal(depois.pedidos.length, 1)
  })

  it('não duplica, e o que o admin removeu não volta na próxima busca', async () => {
    const { request } = gnewsFalso([artigo('a'), artigo('b')])
    assert.equal(await sincronizar(request), 2)

    await db.query('UPDATE news_sync SET last_attempt_at = NULL')
    assert.equal(await sincronizar(request), 0)

    const alvo = (await manchetes()).find((m) => m.title === 'Manchete a')!
    assert.equal((await api('DELETE', `/admin/news/${alvo.id}`, undefined, admin)).status, 204)
    await db.query('UPDATE news_sync SET last_attempt_at = NULL')
    assert.equal(await sincronizar(request), 0)
    assert.deepEqual((await manchetes()).map((m) => m.title), ['Manchete b'])
  })

  it('remover a manchete do admin apaga de vez; id inexistente é 404', async () => {
    const { body } = await api('POST', '/admin/news', { title: 'Engano' }, admin)
    assert.equal((await api('DELETE', `/admin/news/${body.id}`, undefined, admin)).status, 204)
    assert.equal((await db.query('SELECT 1 FROM news_items WHERE id = $1', [body.id])).rows.length, 0)
    assert.equal((await api('DELETE', `/admin/news/${body.id}`, undefined, admin)).status, 404)
  })

  it('descarta artigo malformado, link perigoso e notícia velha', async () => {
    const { request } = gnewsFalso([
      artigo('boa'),
      artigo('sem-fonte', { source: {} }),
      artigo('js', { url: 'javascript:alert(1)' }),
      artigo('sem-data', { publishedAt: 'ontem' }),
      artigo('velha', { publishedAt: horasAtras(24 * 8) }),
      'lixo',
    ])
    assert.deepEqual((await fetchHeadlines('k', request)).map((h) => h.title), ['Manchete boa'])
  })

  it('aguenta resposta sem a lista de artigos', async () => {
    const request = (async () => new Response('{}')) as unknown as typeof fetch
    assert.deepEqual(await fetchHeadlines('k', request), [])
  })

  it('apaga as notícias automáticas antigas e para de mostrá-las', async () => {
    await db.query(
      `INSERT INTO news_items (origin, title, url, published_at) VALUES ('gnews', 'Velha', 'https://v.example/1', now() - interval '8 days')`,
    )
    assert.deepEqual(await manchetes(), [])
    await sincronizar(gnewsFalso([]).request)
    assert.equal((await db.query('SELECT 1 FROM news_items')).rows.length, 0)
  })
})

describe('notícias da demonstração', () => {
  it('usa as manchetes escritas à mão quando não há automáticas', () => {
    const itens = staticSiteNews([])
    assert.equal(itens.length, CURATED_HEADLINES.length)
    assert.ok(itens.every((n) => n.origin === 'curated'))
  })

  it('prefere as automáticas quando existem', () => {
    const automatica = { title: 'Manchete', sourceName: 'Veículo', url: 'https://veiculo.example/1', publishedAt: horasAtras(13) }
    assert.deepEqual(staticSiteNews([automatica]), [{ id: 1, origin: 'gnews', expiresAt: null, ...automatica }])
  })

  it('toda manchete escrita à mão tem título, fonte, link e data válidos, da mais nova para a mais antiga', () => {
    const datas = CURATED_HEADLINES.map((n) => Date.parse(n.publishedAt))
    assert.deepEqual(datas, [...datas].sort((a, b) => b - a))
    for (const n of CURATED_HEADLINES) {
      assert.ok(n.title.length <= 160 && n.sourceName, n.title)
      assert.ok(n.url.startsWith('https://'), n.url)
      assert.ok(Number.isFinite(Date.parse(n.publishedAt)), n.publishedAt)
    }
  })
})
