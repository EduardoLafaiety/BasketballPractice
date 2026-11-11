import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CARD_SKILLS, skillRating } from '../src/routes/card.js'
import { TEST_KINDS } from '../src/routes/tests.js'
import { startApi } from './http.js'

const { api, register } = await startApi()

const skill = (id: string) => CARD_SKILLS.find((s) => s.id === id)!

describe('Nota de cada habilidade', () => {
  it('vai de 0 a 99, em linha reta, e nos testes de tempo menos segundos dá nota maior', () => {
    assert.equal(skillRating(skill('lance_livre'), 0), 0)
    assert.equal(skillRating(skill('lance_livre'), 9), 50)
    assert.equal(skillRating(skill('lance_livre'), 18), 99)
    assert.equal(skillRating(skill('lance_livre'), 40), 99)
    assert.equal(skillRating(skill('drible'), 30), 0)
    assert.equal(skillRating(skill('drible'), 9), 99)
    assert.ok(skillRating(skill('drible'), 15) > skillRating(skill('drible'), 20))
    assert.equal(skillRating(skill('salto'), 5), 0)
  })

  it('cada habilidade usa um teste que existe', () => {
    for (const s of CARD_SKILLS) assert.ok(s.test in TEST_KINDS, s.test)
  })
})

describe('Cartão do atleta', () => {
  it('sem testes, o cartão vem vazio', async () => {
    const { token } = await register()
    const { status, body } = await api('GET', '/card', undefined, token)
    assert.equal(status, 200)
    assert.deepEqual(body.months, [])
    assert.equal(body.current, null)
    assert.equal(body.skills.length, 4)
  })

  it('monta a nota do mês com o melhor resultado de cada teste e mostra a evolução', async () => {
    const { token } = await register()
    const testes = [
      { kind: 'lances_1min', value: 9, performedAt: '2026-09-10' },
      { kind: 'impulsao', value: 47.5, performedAt: '2026-09-10' },
      { kind: 'lances_1min', value: 12, performedAt: '2026-10-05' },
      { kind: 'lances_1min', value: 10, performedAt: '2026-10-20' },
      { kind: 'arremesso_5_pontos', value: 11, performedAt: '2026-10-05' },
      { kind: 'drible_cones', value: 22, performedAt: '2026-10-05' },
      { kind: 'drible_cones', value: 18, performedAt: '2026-10-25' },
      { kind: 'impulsao', value: 50, performedAt: '2026-10-05' },
      { kind: 'sprint', value: 5, performedAt: '2026-10-05' },
    ]
    for (const t of testes) assert.equal((await api('POST', '/tests', t, token)).status, 201)

    const { body } = await api('GET', '/card', undefined, token)
    assert.deepEqual(body.months.map((m: { month: string }) => m.month), ['2026-09', '2026-10'])
    const [setembro, outubro] = body.months
    assert.equal(setembro.complete, false)
    assert.equal(setembro.skills.arremesso, null)
    assert.equal(setembro.overall, Math.round((50 + 50) / 2))

    assert.equal(outubro.complete, true)
    assert.deepEqual(outubro.skills.lance_livre, { value: 12, rating: 66 })
    assert.deepEqual(outubro.skills.drible, { value: 18, rating: skillRating(skill('drible'), 18) })
    const notas = Object.values(outubro.skills).map((s) => (s as { rating: number }).rating)
    assert.equal(outubro.overall, Math.round(notas.reduce((a, b) => a + b, 0) / 4))
    assert.deepEqual(body.current, outubro)
  })

  it('recusa resultados fora do possível, que inflariam a nota', async () => {
    const { token } = await register()
    const casos = [
      { kind: 'arremesso_5_pontos', value: 26 },
      { kind: 'lances_1min', value: 41 },
      { kind: 'impulsao', value: 151 },
      { kind: 'drible_cones', value: 121 },
      { kind: 'drible_cones', value: 0 },
    ]
    for (const c of casos) {
      const { status } = await api('POST', '/tests', { ...c, performedAt: '2026-10-05' }, token)
      assert.equal(status, 400, JSON.stringify(c))
    }
    assert.deepEqual((await api('GET', '/card', undefined, token)).body.months, [])
  })

  it('exige login e mostra só os testes do próprio atleta', async () => {
    assert.equal((await api('GET', '/card')).status, 401)
    const a = await register()
    const b = await register()
    await api('POST', '/tests', { kind: 'impulsao', value: 60, performedAt: '2026-10-05' }, a.token)
    assert.deepEqual((await api('GET', '/card', undefined, b.token)).body.months, [])
  })
})
