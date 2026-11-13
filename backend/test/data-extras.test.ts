import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { startApi } from './http.js'

const { api, db, register } = await startApi()

describe('Backup com os recursos novos', () => {
  it('a exportação traz o histórico de desafio e quiz que já existia, programas, jogos, jogadas e perfil do ranking, e a importação ignora essa parte', async () => {
    const { token, id } = await register()
    // O desafio do dia e o quiz saíram do app, mas o que já estava guardado continua sendo dado da pessoa: entra na exportação.
    await db.query(`INSERT INTO daily_challenge_results (user_id, day, challenge_id, makes, attempts) VALUES ($1, '2026-11-08', 'x', 3, 5)`, [id])
    await db.query(`INSERT INTO quiz_results (user_id, day, correct, answers) VALUES ($1, '2026-11-08', 3, '{0,1,2,3,0}')`, [id])
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
