import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import { splitPercent, STYLES } from '../src/routes/styles.js'
import { startApi } from './http.js'

const { api, db, register } = await startApi()
let token = ''

before(async () => {
  token = (await register()).token
})

describe('Estilos de jogo', () => {
  it('pede login', async () => {
    assert.equal((await api('GET', '/styles')).status, 401)
  })

  it('todo exercício citado nos estilos existe no catálogo padrão', async () => {
    for (const style of STYLES) {
      const { status, body } = await api('GET', `/styles/${style.id}`, undefined, token)
      assert.equal(status, 200)
      const missing = body.moves.filter((m: { exercise: unknown }) => m.exercise === null).map((m: { name: string }) => m.name)
      assert.deepEqual(missing, [], `${style.name}: ${missing.join(', ')}`)
      // Aquecimento + movimentos + lance livre.
      assert.equal(body.session.length, style.moves.length + 2)
    }
  })

  it('lista os estilos com a divisão do treino somando 100%', async () => {
    const { status, body } = await api('GET', '/styles', undefined, token)
    assert.equal(status, 200)
    assert.equal(body.length, STYLES.length)
    assert.equal(new Set(body.map((s: { id: string }) => s.id)).size, body.length)
    for (const style of body) {
      const values = Object.values(style.mix) as number[]
      assert.equal(values.reduce((a, b) => a + b, 0), 100, style.name)
      assert.ok(style.minutes > 0)
    }
  })

  it('o detalhe traz os ids do catálogo e a sessão na ordem dos movimentos', async () => {
    const { body } = await api('GET', '/styles/luka-doncic', undefined, token)
    const catalog = await db.query<{ id: number }>(`SELECT id FROM exercises WHERE user_id IS NULL AND name = 'Step-back de três'`)
    const stepBack = body.moves.find((m: { name: string }) => m.name === 'Step-back de três')
    assert.equal(stepBack.exercise.exerciseId, catalog.rows[0].id)
    assert.equal(stepBack.exercise.category, 'arremesso')
    assert.deepEqual(
      body.session.map((b: { name: string }) => b.name),
      ['Drible estacionário', 'Hesitação em linha reta', 'Corta-luz com cadeira', 'Step-back de três', 'Fadeaway do cotovelo', 'Floater em uma perna', 'Lance livre'],
    )
    assert.equal(body.minutes, body.session.reduce((s: number, b: { minutes: number }) => s + b.minutes, 0))
  })

  it('usa só o catálogo, nunca um exercício do atleta com o mesmo nome', async () => {
    const own = await api('POST', '/exercises', { name: 'Floater em uma perna', category: 'arremesso', metric: 'tempo' }, token)
    assert.equal(own.status, 201)
    const { body } = await api('GET', '/styles/luka-doncic', undefined, token)
    const floater = body.session.find((b: { name: string }) => b.name === 'Floater em uma perna')
    assert.notEqual(floater.exerciseId, own.body.id)
    assert.equal(floater.category, 'finalizacao')
  })

  it('responde 404 para estilo desconhecido e 400 para id inválido', async () => {
    assert.equal((await api('GET', '/styles/michael-jordan', undefined, token)).status, 404)
    assert.equal((await api('GET', '/styles/Luka%20Doncic', undefined, token)).status, 400)
  })
})

describe('Divisão percentual', () => {
  it('soma 100 mesmo quando o arredondamento não fecha', () => {
    assert.deepEqual(splitPercent({ a: 1, b: 1, c: 1 }), { a: 34, b: 33, c: 33 })
    assert.deepEqual(splitPercent({ arremesso: 30, drible: 10 }), { arremesso: 75, drible: 25 })
    assert.deepEqual(splitPercent({}), {})
  })
})
