import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { QUIZ_QUESTIONS } from '../src/db/quiz.js'
import { questionsFor } from '../src/routes/quiz.js'
import { localToday } from '../src/routes/stats.js'
import { startApi } from './http.js'

const { api, register } = await startApi()

describe('Banco de perguntas do quiz', () => {
  it('toda pergunta tem 4 alternativas diferentes, resposta válida e id único', () => {
    assert.equal(new Set(QUIZ_QUESTIONS.map((q) => q.id)).size, QUIZ_QUESTIONS.length)
    for (const q of QUIZ_QUESTIONS) {
      assert.equal(new Set(q.options).size, 4, q.id)
      assert.ok(q.options[q.answer], q.id)
      assert.ok(q.explanation.length > 10, q.id)
    }
  })

  it('cada pergunta aponta para um artigo que existe no site', () => {
    const artigos = readFileSync(new URL('../../frontend/src/artigos/dados.ts', import.meta.url), 'utf8')
    const ids = new Set([...artigos.matchAll(/^ {4}id: '([^']+)'/gm)].map((m) => m[1]))
    for (const q of QUIZ_QUESTIONS) assert.ok(ids.has(q.article), `${q.id} → ${q.article}`)
  })

  it('sorteia 5 perguntas diferentes por dia, iguais para todos na mesma data', () => {
    const hoje = questionsFor('2026-11-10')
    assert.equal(hoje.length, 5)
    assert.equal(new Set(hoje.map((q) => q.id)).size, 5)
    assert.deepEqual(questionsFor('2026-11-10').map((q) => q.id), hoje.map((q) => q.id))
    assert.notDeepEqual(questionsFor('2026-11-11').map((q) => q.id), hoje.map((q) => q.id))
  })
})

describe('Quiz diário', () => {
  it('mostra as perguntas sem a resposta certa', async () => {
    const { token } = await register()
    const { status, body } = await api('GET', '/quiz/today?tzOffset=180', undefined, token)
    assert.equal(status, 200)
    assert.equal(body.day, localToday(180))
    assert.equal(body.questions.length, 5)
    assert.equal(body.result, null)
    for (const q of body.questions) {
      assert.equal(q.answer, undefined)
      assert.equal(q.explanation, undefined)
      assert.equal(q.options.length, 4)
    }
  })

  it('corrige no servidor, guarda a revisão e só aceita uma resposta por dia', async () => {
    const { token } = await register()
    const certas = questionsFor(localToday(0)).map((q) => q.answer)
    const respostas = certas.map((c, i) => (i < 3 ? c : (c + 1) % 4))

    const enviado = await api('POST', '/quiz/today', { answers: respostas }, token)
    assert.equal(enviado.status, 201)
    assert.deepEqual(enviado.body.result, { correct: 3, total: 5 })
    assert.deepEqual(enviado.body.questions.map((q: { correct: boolean }) => q.correct), [true, true, true, false, false])
    assert.ok(enviado.body.questions[0].explanation)

    const depois = (await api('GET', '/quiz/today', undefined, token)).body
    assert.deepEqual(depois.result, { correct: 3, total: 5 })
    assert.equal(depois.questions[4].chosen, respostas[4])
    assert.equal(depois.questions[4].answer, certas[4])

    const denovo = await api('POST', '/quiz/today', { answers: certas }, token)
    assert.equal(denovo.status, 409)
    assert.deepEqual((await api('GET', '/quiz/history', undefined, token)).body, [{ day: localToday(0), correct: 3 }])
  })

  it('recusa respostas fora do formato', async () => {
    const { token } = await register()
    for (const answers of [[0, 1, 2], [0, 1, 2, 3, 4], [0, 1, 2, 3, 0, 1], ['0', 1, 2, 3, 0], [0.5, 1, 2, 3, 0]]) {
      assert.equal((await api('POST', '/quiz/today', { answers }, token)).status, 400, JSON.stringify(answers))
    }
    assert.equal((await api('GET', '/quiz/today', undefined, token)).body.result, null)
  })

  it('exige login', async () => {
    assert.equal((await api('GET', '/quiz/today')).status, 401)
    assert.equal((await api('POST', '/quiz/today', { answers: [0, 0, 0, 0, 0] })).status, 401)
  })
})
