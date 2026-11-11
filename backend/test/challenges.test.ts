import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { catalog } from '../src/db/catalog.js'
import { challengeFor, DAILY_CHALLENGES, maxAttempts } from '../src/routes/challenges.js'
import { localToday } from '../src/routes/stats.js'
import { startApi } from './http.js'

const { api, register } = await startApi()

describe('Desafio do dia', () => {
  it('sorteia pela data: o mesmo dia dá sempre o mesmo desafio, e os dias variam', () => {
    assert.equal(challengeFor('2026-11-10').id, challengeFor('2026-11-10').id)
    const semana = new Set(Array.from({ length: 30 }, (_, i) => challengeFor(`2026-11-${String(i + 1).padStart(2, '0')}`).id))
    assert.ok(semana.size >= 5, `só ${semana.size} desafios diferentes em 30 dias`)
  })

  it('usa só exercícios de arremesso que existem no catálogo', () => {
    const nomes = new Map(catalog.map((item) => [item[0], item[2]]))
    for (const desafio of DAILY_CHALLENGES) {
      assert.equal(nomes.get(desafio.exercise), 'acertos', desafio.exercise)
      assert.ok(desafio.goal <= maxAttempts(desafio), desafio.id)
    }
  })

  it('mostra o desafio de hoje no fuso do atleta, ainda sem resultado', async () => {
    const { token } = await register()
    const { status, body } = await api('GET', '/challenges/today?tzOffset=180', undefined, token)
    assert.equal(status, 200)
    assert.equal(body.day, localToday(180))
    assert.equal(body.challenge.id, challengeFor(localToday(180)).id)
    assert.equal(body.result, null)
  })

  it('salva o resultado como sessão, conta na sequência e só aceita um por dia', async () => {
    const { token } = await register()
    const hoje = (await api('GET', '/challenges/today', undefined, token)).body
    const meta = hoje.challenge.goal

    const salvo = await api('POST', '/challenges/today', { makes: meta, attempts: meta, bestStreak: 3, seconds: 90 }, token)
    assert.equal(salvo.status, 201)
    assert.equal(salvo.body.completed, true)
    assert.equal(salvo.body.makes, meta)

    const sessoes = (await api('GET', '/sessions', undefined, token)).body
    assert.equal(sessoes.length, 1)
    assert.equal(sessoes[0].entries[0].exerciseName, hoje.challenge.exercise)
    assert.equal(sessoes[0].entries[0].makes, meta)
    assert.match(sessoes[0].notes, /Desafio do dia/)

    const progresso = (await api('GET', '/stats/progress', undefined, token)).body
    assert.equal(progresso.streak.current, 1)

    const repetido = await api('POST', '/challenges/today', { makes: 1, attempts: 1 }, token)
    assert.equal(repetido.status, 409)
    assert.equal((await api('GET', '/challenges/today', undefined, token)).body.result.makes, meta)

    const historico = (await api('GET', '/challenges/history', undefined, token)).body
    assert.equal(historico.length, 1)
    assert.equal(historico[0].title, hoje.challenge.title)
  })

  it('recusa valores impossíveis', async () => {
    const { token } = await register()
    const { challenge } = (await api('GET', '/challenges/today', undefined, token)).body
    const casos = [
      { makes: 5, attempts: 4 },
      { makes: 0, attempts: 0 },
      { makes: 1, attempts: challenge.maxAttempts + 1 },
      { makes: -1, attempts: 3 },
      { makes: 2, attempts: 3, bestStreak: 3 },
      { makes: '2', attempts: 3 },
    ]
    for (const corpo of casos) {
      const { status } = await api('POST', '/challenges/today', corpo, token)
      assert.equal(status, 400, JSON.stringify(corpo))
    }
    assert.equal((await api('GET', '/sessions', undefined, token)).body.length, 0)
  })

  it('exige login e não mostra o resultado de outro atleta', async () => {
    assert.equal((await api('GET', '/challenges/today')).status, 401)
    const a = await register()
    const b = await register()
    await api('POST', '/challenges/today', { makes: 1, attempts: 2 }, a.token)
    assert.equal((await api('GET', '/challenges/today', undefined, b.token)).body.result, null)
    assert.equal((await api('GET', '/challenges/history', undefined, b.token)).body.length, 0)
  })
})
