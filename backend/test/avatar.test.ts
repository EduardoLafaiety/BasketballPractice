import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import sharp from 'sharp'
import { startApi } from './http.js'

const { api, register } = await startApi()
const image = async (format: 'png' | 'jpeg') => `data:image/${format};base64,${(await sharp({ create: { width: 480, height: 320, channels: 3, background: '#bf651f' } })[format]().toBuffer()).toString('base64')}`

describe('Foto de perfil', () => {
  it('aceita PNG e JPG e guarda somente uma imagem WebP quadrada sem metadados', async () => {
    const owner = await register()
    const other = await register()
    for (const format of ['png', 'jpeg'] as const) {
      const response = await api('PUT', '/auth/avatar', { image: await image(format) }, owner.token)
      assert.equal(response.status, 200)
      assert.match(response.body.avatarUrl, /^data:image\/webp;base64,/)
      const saved = (await api('GET', '/auth/me', undefined, owner.token)).body.avatarUrl
      assert.equal(saved, response.body.avatarUrl)
      const metadata = await sharp(Buffer.from(saved.split(',')[1], 'base64')).metadata()
      assert.equal(metadata.width, 256)
      assert.equal(metadata.height, 256)
      assert.equal(metadata.format, 'webp')
      assert.equal(metadata.exif, undefined)
      assert.equal((await api('GET', '/auth/me', undefined, other.token)).body.avatarUrl, undefined)
    }
    assert.equal((await api('DELETE', '/auth/avatar', undefined, owner.token)).status, 200)
    assert.equal((await api('GET', '/auth/me', undefined, owner.token)).body.avatarUrl, undefined)
  })

  it('exige autenticação e rejeita conteúdo inválido, MIME falso e identificador de outra conta', async () => {
    const owner = await register()
    const valid = await image('png')
    assert.equal((await api('PUT', '/auth/avatar', { image: valid })).status, 401)
    assert.equal((await api('DELETE', '/auth/avatar')).status, 401)
    for (const invalid of ['data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,YWJjZA==', valid.replace('image/png', 'image/jpeg'), `data:image/png;base64,${Buffer.alloc(262145).toString('base64')}`]) {
      assert.equal((await api('PUT', '/auth/avatar', { image: invalid }, owner.token)).status, 400)
    }
    assert.equal((await api('PUT', '/auth/avatar', { image: valid, userId: 999 }, owner.token)).status, 400)
    assert.equal((await api('GET', '/auth/me', undefined, owner.token)).body.avatarUrl, undefined)
  })

  it('limita a resolução antes de descompactar uma imagem enviada diretamente', async () => {
    const owner = await register()
    const oversized = await sharp({ create: { width: 2100, height: 2100, channels: 3, background: '#fff' } }).png().toBuffer()
    assert.equal((await api('PUT', '/auth/avatar', { image: `data:image/png;base64,${oversized.toString('base64')}` }, owner.token)).status, 400)
  })
})
