import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { startApi } from './http.js'

const { api, register } = await startApi()

const hoje = new Date().toISOString().slice(0, 10)
const jogo = (extra: object = {}) => ({
  playedOn: hoje,
  opponent: 'Vila Nova',
  teamScore: 68,
  oppScore: 61,
  minutes: 28,
  points: 17,
  rebounds: 6,
  assists: 4,
  fgMade: 6,
  fgAtt: 14,
  threeMade: 2,
  threeAtt: 6,
  ftMade: 3,
  ftAtt: 4,
  ...extra,
})

const exercicio = async (token: string, nome: string) =>
  ((await api('GET', '/exercises', undefined, token)).body as { id: number; name: string }[]).find((e) => e.name === nome)!.id

describe('Diário de jogos', () => {
  it('registra, lista, edita e apaga jogos', async () => {
    const { token } = await register()
    const criado = await api('POST', '/games', jogo(), token)
    assert.equal(criado.status, 201)
    assert.equal(criado.body.points, 17)
    assert.equal(criado.body.playedOn, hoje)
    assert.equal(criado.body.steals, 0)

    const editado = await api('PUT', `/games/${criado.body.id}`, jogo({ opponent: 'Centro', rebounds: 9 }), token)
    assert.equal(editado.body.rebounds, 9)
    assert.deepEqual((await api('GET', '/games', undefined, token)).body.map((g: { opponent: string }) => g.opponent), ['Centro'])

    assert.equal((await api('DELETE', `/games/${criado.body.id}`, undefined, token)).status, 204)
    assert.deepEqual((await api('GET', '/games', undefined, token)).body, [])
  })

  it('recusa números impossíveis ou que não batem', async () => {
    const { token } = await register()
    const casos = [
      jogo({ points: 18 }), // os arremessos dão 17
      jogo({ fgMade: 15 }),
      jogo({ threeMade: 7 }),
      jogo({ threeAtt: 20 }),
      jogo({ ftMade: 5 }),
      jogo({ points: 200, fgAtt: 0, fgMade: 0, threeAtt: 0, threeMade: 0, ftAtt: 0, ftMade: 0 }),
      jogo({ rebounds: 70 }),
      jogo({ minutes: 90 }),
      jogo({ teamScore: 10 }),
      jogo({ playedOn: '2026-02-30' }),
    ]
    for (const corpo of casos) assert.equal((await api('POST', '/games', corpo, token)).status, 400, JSON.stringify(corpo))
    // Sem os arremessos anotados, vale só o total de pontos.
    assert.equal((await api('POST', '/games', { playedOn: hoje, points: 12 }, token)).status, 201)
  })

  it('compara o aproveitamento do jogo com o do treino', async () => {
    const { token } = await register()
    await api('POST', '/games', jogo(), token)
    await api('POST', '/games', jogo({ points: 8, fgMade: 3, fgAtt: 10, threeMade: 0, threeAtt: 2, ftMade: 2, ftAtt: 2, rebounds: 2, assists: 6 }), token)
    const lance = await exercicio(token, 'Lance livre')
    const tres = await exercicio(token, 'Arremesso de três')
    await api('POST', '/sessions', { performedAt: new Date().toISOString(), entries: [{ exerciseId: lance, makes: 16, attempts: 20 }, { exerciseId: tres, makes: 12, attempts: 30 }] }, token)

    const { body } = await api('GET', '/games/comparison', undefined, token)
    assert.equal(body.games, 2)
    assert.deepEqual(body.averages, { points: 12.5, rebounds: 4, assists: 5 })
    assert.deepEqual(body.shooting.overall, { game: 37.5, practice: 56, gameAttempts: 24, practiceAttempts: 50 })
    assert.deepEqual(body.shooting.three, { game: 25, practice: 40, gameAttempts: 8, practiceAttempts: 30 })
    assert.deepEqual(body.shooting.freeThrow, { game: 83.3, practice: 80, gameAttempts: 6, practiceAttempts: 20 })
  })

  it('cada atleta vê só os próprios jogos', async () => {
    const a = await register()
    const b = await register()
    const { body } = await api('POST', '/games', jogo(), a.token)
    assert.deepEqual((await api('GET', '/games', undefined, b.token)).body, [])
    assert.equal((await api('PUT', `/games/${body.id}`, jogo(), b.token)).status, 404)
    assert.equal((await api('DELETE', `/games/${body.id}`, undefined, b.token)).status, 404)
    assert.equal((await api('GET', '/games/comparison', undefined, b.token)).body.games, 0)
    assert.equal((await api('GET', '/games')).status, 401)
  })
})
