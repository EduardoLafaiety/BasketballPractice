import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { catalog } from '../src/db/catalog.js'
import { PROGRAMS } from '../src/db/programs.js'
import { startApi } from './http.js'

const { api, db, register } = await startApi()

/** Volta a data do último dia concluído, como se tivesse sido ontem. */
const ontem = (userId: number) =>
  db.query(`UPDATE program_days_done SET done_on = done_on - 1 WHERE user_id = $1`, [userId])

describe('Programas: definições', () => {
  it('todo exercício existe no catálogo e todo dia tem treino', () => {
    const nomes = new Set(catalog.map((item) => item[0]))
    for (const p of PROGRAMS) {
      assert.ok(p.days.length >= 28, p.id)
      for (const [i, d] of p.days.entries()) {
        assert.ok(d.blocks.length > 0, `${p.id} dia ${i + 1}`)
        for (const [nome, minutos] of d.blocks) {
          assert.ok(nomes.has(nome), `${p.id} dia ${i + 1}: ${nome}`)
          assert.ok(minutos > 0)
        }
      }
    }
  })
})

describe('Programas de 30 dias', () => {
  it('lista os programas sem nenhum começado', async () => {
    const { token } = await register()
    const { body } = await api('GET', '/programs', undefined, token)
    assert.deepEqual(body.map((p: { id: string }) => p.id), PROGRAMS.map((p) => p.id))
    assert.equal(body[0].status.started, false)
    assert.equal(body[0].totalDays, 30)
  })

  it('libera um dia por vez, um por data, e marca o programa como concluído no fim', async () => {
    const { token, id: userId } = await register()
    assert.equal((await api('POST', '/programs/mao-fraca-4/days/1/complete', {}, token)).status, 409)
    assert.equal((await api('POST', '/programs/mao-fraca-4/start', undefined, token)).status, 201)

    let detalhe = (await api('GET', '/programs/mao-fraca-4', undefined, token)).body
    assert.deepEqual(detalhe.days.slice(0, 3).map((d: { state: string }) => d.state), ['available', 'locked', 'locked'])
    assert.ok(detalhe.days[0].blocks[0].exerciseId)
    assert.equal(detalhe.days[0].blocks[0].name, 'Quiques leves parado')

    assert.equal((await api('POST', '/programs/mao-fraca-4/days/2/complete', {}, token)).status, 409)
    const feito = await api('POST', '/programs/mao-fraca-4/days/1/complete', {}, token)
    assert.equal(feito.status, 201)
    assert.equal(feito.body.done, 1)
    assert.equal(feito.body.availableToday, false)

    // Mesmo dia: o dia 2 só amanhã.
    const cedo = await api('POST', '/programs/mao-fraca-4/days/2/complete', {}, token)
    assert.equal(cedo.status, 409)
    assert.match(cedo.body.error, /amanhã/)
    detalhe = (await api('GET', '/programs/mao-fraca-4', undefined, token)).body
    assert.deepEqual(detalhe.days.slice(0, 2).map((d: { state: string }) => d.state), ['done', 'tomorrow'])

    // Os outros dias, um por data, até o fim.
    for (let dia = 2; dia <= 28; dia++) {
      await ontem(userId)
      assert.equal((await api('POST', `/programs/mao-fraca-4/days/${dia}/complete`, {}, token)).status, 201, `dia ${dia}`)
    }
    const lista = (await api('GET', '/programs', undefined, token)).body
    const status = lista.find((p: { id: string }) => p.id === 'mao-fraca-4').status
    assert.equal(status.finished, true)
    assert.equal(status.nextDay, null)
    await ontem(userId)
    assert.equal((await api('POST', '/programs/mao-fraca-4/days/29/complete', {}, token)).status, 409)
  })

  it('liga o dia à sessão do atleta, mas não à de outro', async () => {
    const a = await register()
    const b = await register()
    const sessao = (await api('POST', '/sessions', { performedAt: new Date().toISOString(), durationMinutes: 20, entries: [] }, a.token)).body
    await api('POST', '/programs/arremesso-30/start', undefined, b.token)
    assert.equal((await api('POST', '/programs/arremesso-30/days/1/complete', { sessionId: sessao.id }, b.token)).status, 404)
    await api('POST', '/programs/arremesso-30/start', undefined, a.token)
    assert.equal((await api('POST', '/programs/arremesso-30/days/1/complete', { sessionId: sessao.id }, a.token)).status, 201)
    // Recomeçar zera o progresso.
    await api('POST', '/programs/arremesso-30/start', undefined, a.token)
    assert.equal((await api('GET', '/programs/arremesso-30', undefined, a.token)).body.status.done, 0)
  })

  it('sair do programa apaga o progresso; programa desconhecido dá 404', async () => {
    const { token } = await register()
    await api('POST', '/programs/primeiros-30/start', undefined, token)
    assert.equal((await api('DELETE', '/programs/primeiros-30', undefined, token)).status, 204)
    assert.equal((await api('GET', '/programs/primeiros-30', undefined, token)).body.status.started, false)
    assert.equal((await api('GET', '/programs/nao-existe', undefined, token)).status, 404)
    assert.equal((await api('POST', '/programs/nao-existe/start', undefined, token)).status, 404)
    assert.equal((await api('GET', '/programs')).status, 401)
  })
})
