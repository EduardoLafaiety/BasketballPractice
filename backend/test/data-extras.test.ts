import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { startApi } from './http.js'

const { api, register } = await startApi()

describe('Backup com os recursos novos', () => {
  it('a exportação traz desafio, quiz, programas, jogos, jogadas e perfil do ranking, e a importação ignora essa parte', async () => {
    const { token } = await register()
    await api('POST', '/challenges/today', { makes: 3, attempts: 5 }, token)
    await api('POST', '/quiz/today', { answers: [0, 1, 2, 3, 0] }, token)
    await api('POST', '/programs/primeiros-30/start', undefined, token)
    await api('POST', '/programs/primeiros-30/days/1/complete', {}, token)
    await api('POST', '/games', { playedOn: '2026-11-08', points: 12 }, token)
    await api('POST', '/plays', { name: 'Saída', court: 'meia', pieces: [{ kind: 'bola', x: 10, y: 10 }], arrows: [] }, token)
    await api('PUT', '/social/profile', { nickname: 'backup_ok' }, token)

    const { status, body } = await api('GET', '/data/export', undefined, token)
    assert.equal(status, 200)
    const x = body.extras
    assert.equal(x.dailyChallenges[0].makes, 3)
    assert.equal(x.quiz.length, 1)
    assert.deepEqual(x.programs[0].daysDone, [1])
    assert.equal(x.games[0].points, 12)
    assert.equal(x.plays[0].name, 'Saída')
    assert.deepEqual(x.rankingProfile, { nickname: 'backup_ok', public: true })

    const outra = await register()
    assert.equal((await api('POST', '/data/import', body, outra.token)).status, 200)
  })
})
